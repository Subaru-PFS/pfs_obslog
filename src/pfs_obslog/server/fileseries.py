import contextlib
import fcntl
import shutil
from pathlib import Path
from typing import IO, Generator

from pydantic.main import BaseModel


class FileSeries:

    class Meta(BaseModel):
        current_id: int

        def next_id(self):
            self.current_id += 1
            return self.current_id

    class FileMeta(BaseModel):
        name: str

    N = 1000

    def __init__(self, path: Path):
        self._dirpath = path

    def add(self, file: IO, filename: str):
        with self._meta() as meta:
            file_id = meta.next_id()
            path = self.file_path(file_id)
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open('wb') as f:
                shutil.copyfileobj(file, f)
            file_meta = self.FileMeta(name=filename)
            Path(f'{path}.meta.json').write_text(file_meta.json())
        return file_id

    def file_path(self, file_id: int):
        dirname = self._dirpath / f'{file_id // self.N}'
        return dirname / f'{file_id % self.N}'

    def file_meta(self, file_id: int) -> FileMeta:
        return self.FileMeta.parse_file(f'{self.file_path(file_id)}.meta.json')

    @contextlib.contextmanager
    def _meta(self) -> Generator[Meta, None, None]:
        self._dirpath.mkdir(parents=True, exist_ok=True)
        meta_path = self._dirpath / 'meta.json'
        with ex_lock(meta_path):
            if meta_path.exists():
                meta = self.Meta.parse_file(meta_path)
            else:
                meta = self._build_meta()
            yield meta
            meta_path.write_text(meta.json())

    def _build_meta(self):
        return self. Meta(current_id=0)


@contextlib.contextmanager
def ex_lock(path: Path):
    lockfile = Path(f'{path}.lock')
    with lockfile.open('w') as f:
        try:
            fcntl.flock(f, fcntl.LOCK_EX)
            yield
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)
    lockfile.unlink(missing_ok=True)
