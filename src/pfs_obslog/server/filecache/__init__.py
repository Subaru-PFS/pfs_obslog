import contextlib
import hashlib
import logging
import sqlite3
import time
import traceback
from pathlib import Path
from typing import Callable, Optional

logger = logging.getLogger(__name__)


class FileCache:
    def __init__(
        self,
        root: Path,
        total_size_limit=500_000_000,
        auto_vauum=True,
    ) -> None:
        self._root = root
        self._total_size_limit = total_size_limit
        self._auto_vacuum = auto_vauum
        self._create_table()

    def get(self, id: str):
        try:
            with self.db() as db:
                id_digest = self._digest(id)
                cur = db.cursor()
                cur.execute(
                    'update entry set last_accessed = ? where id = ?',
                    (time.time(), id,)
                )
                if cur.rowcount > 0:
                    path = self._path_from_id_digest(id_digest)
                    return path.read_bytes()
        except:  # pragma: no cover
            logger.warning('cache failed: {id}')
            logger.warning(traceback.format_exc())
            return None

    def peek(self, id: str):
        try:
            id_digest = self._digest(id)
            path = self._path_from_id_digest(id_digest)
            if path.exists():
                return path.read_bytes()
        except:  # pragma: no cover
            logger.warning('cache failed: {id}')
            logger.warning(traceback.format_exc())
            return None

    def set(self, id: str, value: bytes):
        id_digest = self._digest(id)
        tmp = Path(f'{self._path_from_id_digest(id_digest)}.inprogress')
        tmp.parent.mkdir(exist_ok=True, parents=True)
        tmp.write_bytes(value)
        with self.db() as db:
            cur = db.cursor()
            try:
                cur.execute(
                    'insert into entry (id, size, last_accessed, id_digest) values (?, ?, ?, ?)',
                    (id, len(value), time.time(), id_digest),
                )
            except sqlite3.IntegrityError:
                tmp.unlink()
            else:
                db.commit()
                tmp = tmp.rename(self._path_from_id_digest(id_digest))
        if self._auto_vacuum:
            self.vacuum()

    def get2(self, id: str) -> tuple[Optional[bytes], Callable[[bytes], bytes]]:
        def setter(value: bytes):
            self.set(id, value)
            return value
        cached = self.get(id)
        return cached, setter

    def _path_from_id_digest(self, id_digest: str):
        return self._root / id_digest[:2] / id_digest

    def _create_table(self):
        with self.db() as db:
            db.executescript(schema)
            db.commit()

    def vacuum(self):
        with self.db() as db:
            cur = db.cursor()
            cur.execute(
                '''
                with t1 as(
                  select *,
                    sum(size) over(
                      order by last_accessed desc
                    ) as accsum,
                    last_accessed
                  from entry
                  order by last_accessed desc
                )
                select id, id_digest
                from t1
                where accsum > ?
                ''',
                (self._total_size_limit,)
            )
            for id, id_digest in cur:
                try:
                    db.cursor().execute('delete from entry where id = ?', (id,))
                    db.commit()
                    self._path_from_id_digest(id_digest).unlink()
                except:  # pragma: no cover
                    logging.warning(f'vacuum failed on {id}, {id_digest}')
                    logging.warning(traceback.format_exc())

    @contextlib.contextmanager
    def db(self):
        self._root.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(self._root / 'registry.sqlite3')
        db.row_factory = sqlite3.Row
        try:
            yield db
        finally:
            db.close()

    @staticmethod
    def _digest(src: str):
        return hashlib.md5(src.encode()).hexdigest()


schema = '''
create table if not exists entry (
    id text primary key,
    size integer not null,
    last_accessed real not null,
    id_digest text not null unique
);
create index if not exists entry_id on entry(id);
create index if not exists entry_last_accessed on entry(last_accessed);
'''
