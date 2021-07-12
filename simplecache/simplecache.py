import argparse
import itertools
import socketserver
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', help='max size of cache pool (in MB)', type=int, default=500)
    parser.add_argument('--socket-file', help='socket file path', required=True, type=Path)
    args = parser.parse_args()
    start_server(args.socket_file, 1_000_000 * args.limit)


def start_server(socket_path: Path, limit: int):
    cache = Cache(limit)

    class Handler(socketserver.StreamRequestHandler):
        def handle(self):
            try:
                line = self.rfile.readline(100).rstrip().decode()
                get_or_set, key = line.split(':')
                if get_or_set == 'set':
                    cache.set(key, self.rfile.read(100_000_000))
                elif get_or_set == 'get':
                    self.wfile.write(cache.get(key) or b'')
            except Exception:
                pass

    with socketserver.UnixStreamServer(str(socket_path), Handler) as server:
        server.serve_forever()


@ dataclass
class CacheItem:
    uid: int
    key: str
    value: bytes

    @ property
    def size(self):
        return len(self.value)


class Cache:
    def __init__(self, limit: int) -> None:
        self._limit = limit
        self._uid_series = itertools.count(0)
        self._by_uid: dict[int, CacheItem] = {}
        self._by_key: dict[str, CacheItem] = {}
        self._size = 0
        self._min_uid = 0

    def set(self, key: str, value: bytes):
        if len(value) == 0:
            return
        original_item = self._by_key.get(key)
        if original_item is not None:
            self._delete_by_item(original_item)
        item = CacheItem(self._uid(), key, value)
        self._by_key[item.key] = item
        self._by_uid[item.uid] = item
        self._size += item.size
        self._cleanup()

    def get(self, key: str) -> Optional[bytes]:
        item = self._by_key.get(key)
        if item is not None:
            del self._by_uid[item.uid]
            item.uid = self._uid()
            self._by_uid[item.uid] = item
            return item.value

    def peek(self, key: str) -> Optional[bytes]:
        item = self._by_key.get(key)
        if item is not None:
            return item.value

    def _uid(self):
        return next(self._uid_series)

    def _delete_by_item(self, item: CacheItem):
        del self._by_key[item.key]
        del self._by_uid[item.uid]
        self._size -= item.size
        self._on_delete(item.key, item.value)

    def _cleanup(self):
        while self._size >= self._limit:
            item = self._by_uid.get(self._min_uid)
            if item is not None:
                self._delete_by_item(item)
            self._min_uid += 1

    def _on_delete(self, key: str, value: bytes):
        pass


if __name__ == '__main__':
    main()
