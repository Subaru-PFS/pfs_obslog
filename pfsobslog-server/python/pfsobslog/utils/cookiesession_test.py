from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from pytest import fixture

from . import cookiesession
from .cookiesession import CookieSession


@fixture
def key():
    return b'secret-string'


def test_encode_and_decode(key: bytes):
    sample_data = {
        'number': 42,
        'string': '42',
    }
    encoded = cookiesession._encode(key, sample_data)
    decoded = cookiesession._decode(key, encoded)
    assert decoded, sample_data


app = FastAPI()


@app.get('/setitem')
def write_to_session(q: int, *, session: CookieSession = Depends()):
    with session.activate():
        session['q'] = 42


@app.get('/show')
def show_session(*, session: CookieSession = Depends()):
    with session.activate():
        return session


def test_session():
    res = client.get('/setitem?q=42')
    res = client.get('/show', cookies=res.cookies)
    assert res.json() == {'q': 42}


@ app.get('/clear')
def clear_session(*, session: CookieSession = Depends()):
    with session.activate():
        session.clear()


def test_clear():
    res = client.get('/setitem?q=42')
    res = client.get('/clear', cookies=res.cookies)
    res = client.get('/show', cookies=res.cookies)
    assert res.json() == {}


def test_malformed_session():
    res = client.get('/setitem?q=42')
    cookies = dict(res.cookies)
    s = cookies['FASTAPI_SESSION']
    cookies['FASTAPI_SESSION'] = s[:-4] + '0000'
    res = client.get('/show', cookies=res.cookies)
    assert res, {}


client = TestClient(app)
