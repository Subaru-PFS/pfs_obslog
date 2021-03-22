import binascii
import contextlib
import json
from typing import Optional

from fastapi import Request, Response

from . import crypto


class CookieSession(dict):
    _max_age = 3600
    _path = '/'
    _cookie_name = 'FASTAPI_SESSION'
    _header_name = 'FASTAPI_SESSION_TOKEN'

    def __init__(
        self,
        request: Request,
        response: Response,
    ):
        super().__init__()
        self._request = request
        self._response = response
        self._me = crypto.MessageEncryptor(__name__)
        self._activate_count = 0

    @contextlib.contextmanager
    def activate(self):
        if self._activate_count > 0:
            raise RuntimeError('CookieSession was activated more than once.')
        self._activate_count += 1
        raw = self._request.cookies.get(self._cookie_name) or self._request.headers.get(self._header_name)
        store = self._decode(raw) if raw is not None else {}
        self.clear()
        self.update(store)
        yield
        raw = self._encode()
        self._response.set_cookie(key=self._cookie_name, value=raw, path=self._path)

    def _decode(self, raw: str):
        try:
            store = json.loads(self._me.decrypt_and_verify(raw))
            if isinstance(store, dict):
                return store
        except (crypto.ExpiredError, binascii.Error):  # pragma: no cover
            pass
        return {}  # pragma: no covermodel

    def _encode(self):
        raw = self._me.encrypt_and_sign(json.dumps(self), expires_in=self._max_age)
        return raw

    def peek(self) -> dict:
        cookie_value = self._request.cookies.get(self._cookie_name)
        return self._decode(cookie_value) if cookie_value else {}

    @property
    def session_token(self):
        return self._encode()

    @staticmethod
    def with_options(
        *,
        max_age: Optional[int] = None,
        path: Optional[str] = None,
        cookie_name: Optional[str] = None,
        header_name: Optional[str] = None,
    ):
        class WithOptions(CookieSession):
            _max_age = max_age or CookieSession._max_age
            _path = path or CookieSession._path
            _cookie_name = cookie_name or CookieSession._cookie_name
            _header_name = header_name or CookieSession._header_name
        return WithOptions
