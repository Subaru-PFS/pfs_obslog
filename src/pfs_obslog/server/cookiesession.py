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
        cookie_value = self._request.cookies.get(self._cookie_name)
        store = self._decode_cookie(cookie_value) if cookie_value is not None else {}
        self.clear()
        self.update(store)
        yield
        cookie_value = self._me.encrypt_and_sign(json.dumps(self))
        self._response.set_cookie(key=self._cookie_name, value=cookie_value, expires=self._max_age, path=self._path)

    def _decode_cookie(self, cookie_value: str):
        try:
            store = json.loads(self._me.decrypt_and_verify(cookie_value))
            if isinstance(store, dict):
                return store
        except (crypto.ExpiredError, binascii.Error):  # pragma: no cover
            pass
        return {}  # pragma: no cover

    def peek(self) -> dict:
        cookie_value = self._request.cookies.get(self._cookie_name)
        return self._decode_cookie(cookie_value) if cookie_value else {}

    @staticmethod
    def with_options(
        *,
        max_age: Optional[int] = None,
        path: Optional[str] = None,
        cookie_name: Optional[str] = None,
    ):
        class WithOptions(CookieSession):
            _max_age = max_age or CookieSession._max_age
            _path = path or CookieSession._path
            _cookie_name = cookie_name or CookieSession._cookie_name
        return WithOptions
