import contextlib
import json
from typing import Optional

from fastapi import Request, Response

from .crypto import ExpiredError, MessageEncryptor

_me = MessageEncryptor(__name__)


def _encode(raw, *, expires_in: Optional[float] = None):
    return _me.encrypt_and_sign(json.dumps(raw), expires_in=expires_in)


def _decode(encoded: str):
    raw = json.loads(_me.decrypt_and_verify(encoded))
    return raw


class HttpSessionBase(dict):
    _expires_in: Optional[float] = None

    def __init__(self):
        super().__init__()
        self._initialized = False

    @contextlib.contextmanager
    def activate(self):
        self._safe_load()
        yield
        self._store_encoded(_encode(self, expires_in=self._expires_in))

    def _safe_load(self):
        if not self._initialized:
            self._initialized = True
            encoded = self._load_encoded()
            if encoded is not None:
                try:
                    self.clear()
                    self.update(_decode(encoded))
                except (ExpiredError, ValueError):
                    pass

    def peek(self):
        self._safe_load()
        return self

    def _load_encoded(self) -> Optional[str]:  # pragma: no cover
        raise NotImplementedError()

    def _store_encoded(self, encoded: str):  # pragma: no cover
        raise NotImplementedError()


class TokenOrCookieSession(HttpSessionBase):
    _cookie_name = 'PFS_OBSLOG_SESSION'
    _cookie_path = '/'

    _header_name = 'pfs_obslog_token'

    def __init__(
        self,
        request: Request,
        response: Response,
    ):
        super().__init__()
        self._request = request
        self._response = response

    def _load_encoded(self) -> Optional[str]:
        if self._header_name in self._request.headers:
            return self._request.headers[self._header_name] or None
        return self._request.cookies.get(self._cookie_name)

    def _store_encoded(self, encoded: str):
        if self._header_name in self._request.headers:
            self._response.headers[self._header_name] = encoded
        else:
            self._response.set_cookie(key=self._cookie_name, value=encoded, path=self._cookie_path)
