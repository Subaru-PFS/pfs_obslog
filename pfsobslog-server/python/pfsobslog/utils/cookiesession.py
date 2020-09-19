import base64
import contextlib
import hmac
import json
from functools import lru_cache
from typing import Any, Callable, ContextManager, Iterable, Optional

from fastapi import Cookie, Response

SECRET_ENVNAME = 'OBSLOG_SESSION_SECRET'


class CookieSession(dict):
    def __init__(
        self,
        response: Response,
        FASTAPI_SESSION: Optional[str] = Cookie(None),
    ):
        super().__init__()
        self._response = response
        self._cookie_value = FASTAPI_SESSION

    @contextlib.contextmanager
    def activate(self):
        store = {}
        if self._cookie_value is not None:
            store = _decode(_secret_key(), self._cookie_value) or {}
            assert isinstance(store, dict)
        self.update(store)
        yield
        self._response.set_cookie(key='FASTAPI_SESSION', value=_encode(_secret_key(), self))


@lru_cache()
def _secret_key():
    import logging
    import os
    import secrets
    key = os.environ.get(SECRET_ENVNAME, None)
    if key is None:  # pragma: no cover
        logging.warning(f'{SECRET_ENVNAME} is not set. using temporary random data.')
        key = secrets.token_bytes(32)
    else:
        key = key.encode()
    return key


def _digest(key: bytes, msg: bytes):
    return hmac.digest(key, msg, 'sha256')


def _encode(key: bytes, data: Any):
    msg = json.dumps(data).encode()
    return f'{base64.b64encode(msg).decode()}.{base64.b64encode(_digest(key, msg)).decode()}'


def _decode(key: bytes, encoded: str):
    try:
        msg, digest = map(base64.b64decode, encoded.split('.'))
        if hmac.compare_digest(digest, _digest(key, msg)):
            return json.loads(msg.decode())
    except:  # pragma no cover
        return None


def peek_session(response):
    fastapi_session = response.cookies.get('FASTAPI_SESSION')
    if fastapi_session:
        return _decode(_secret_key(), fastapi_session)
    return None
