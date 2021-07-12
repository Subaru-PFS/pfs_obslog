import contextlib
import socket
from pathlib import Path
from typing import Optional

from pfs_obslog.server.env import PFS_OBSLOG_ROOT


class SimpleCache:
    def __init__(self, socket_file: Path) -> None:
        self._socket_file = socket_file

    def set(self, key: str, value: bytes):
        with self._connect() as (wfile, rfile):
            wfile.write(f'set:{key}\n'.encode())
            wfile.write(value)

    def get(self, key: str) -> Optional[bytes]:
        with self._connect() as (wfile, rfile):
            wfile.write(f'get:{key}\n'.encode())
            wfile.close()
            result = rfile.read()
            return result if len(result) > 0 else None

    @ contextlib.contextmanager
    def _connect(self):
        with socket.socket(socket.AF_UNIX) as sock:
            sock.connect(str(self._socket_file))
            rfile = sock.makefile('rb')
            wfile = sock.makefile('wb', buffering=0)
            try:
                yield wfile, rfile
            finally:
                wfile.close()
                rfile.close()
