import pytest
import time_machine
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from pfs_obslog.server.cookiesession import CookieSession as CookieSessionBase


MAX_AGE = 10


CookieSession = CookieSessionBase.with_options(
    max_age=MAX_AGE,
)


app = FastAPI()


@pytest.fixture
def client():
    return TestClient(app)


@app.get('/setitem')
def write_to_session(q: int, *, session: CookieSession = Depends()):
    with session.activate():
        session['q'] = 42


@app.get('/show')
def show_session(*, session: CookieSession = Depends()):
    with session.activate():
        return session


def test_session(client):
    client.get('/setitem?q=42')
    assert client.get('/show').json() == {'q': 42}


@app.get('/double_activation')
def double_activation(*, session: CookieSession = Depends()):
    with session.activate():
        pass
    with session.activate():
        pass


def test_double_activation(client):
    with pytest.raises(RuntimeError):
        client.get('/double_activation')


@ app.get('/clear')
def clear_session(*, session: CookieSession = Depends()):
    with session.activate():
        session.clear()


def test_clear(client):
    client.get('/setitem?q=42')
    client.get('/clear')
    assert client.get('/show').json() == {}


def test_malformed_session(client):
    res = client.get('/setitem?q=42')
    s = res.cookies[CookieSession._cookie_name]
    s = f'{s[:-4]}0000'
    res.cookies.set(CookieSession._cookie_name, s)
    assert client.get('/show', cookies=res.cookies).json() == {}


def test_sssion_expiration_1(client):
    with time_machine.travel(0):
        client.get('/setitem?q=42')
        assert client.get('/show').json() == {'q': 42}
    with time_machine.travel(MAX_AGE + 1):
        assert client.get('/show').json() == {}


def test_sssion_expiration_2(client):
    with time_machine.travel(0):
        client.get('/setitem?q=42')
    with time_machine.travel(MAX_AGE - 1):
        assert client.get('/show').json() == {'q': 42}
    with time_machine.travel(MAX_AGE + 1):
        assert client.get('/show').json() == {'q': 42}  # ↑のアクセスで寿命が延びる


@app.get('/peek')
def show_session(*, session: CookieSession = Depends()):
    return session.peek()


def test_sssion_expiration_3(client):
    with time_machine.travel(0):
        client.get('/setitem?q=42')
    with time_machine.travel(MAX_AGE - 1):
        assert client.get('/peek').json() == {'q': 42}
    with time_machine.travel(MAX_AGE + 1):
        assert client.get('/peek').json() == {}
