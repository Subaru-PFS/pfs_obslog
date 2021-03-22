from typing import Final
from fastapi.param_functions import Header
import pytest
import time_machine
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from pfs_obslog.httpsession import TokenOrCookieSession


app = FastAPI()


EXPIRES_IN: Final = 10
HEADER_NAME: Final = 'token'


class Session(TokenOrCookieSession):
    _expires_in = EXPIRES_IN
    _header_name = HEADER_NAME


@pytest.fixture
def client():
    return TestClient(app)


@app.get('/setitem')
def write_to_session(q: int, *, session: Session = Depends()):
    with session.activate():
        session['q'] = 42


@app.get('/show')
def show_session(*, session: Session = Depends()):
    with session.activate():
        return session


def test_session(client: TestClient):
    client.get('/setitem?q=42')
    assert client.get('/show').json() == {'q': 42}


@app.get('/double_activate')
def double_activate(*, session: Session = Depends()):
    with session.activate():
        session['a'] = 'A'
    with session.activate():
        session['b'] = 'B'
    return session


def test_double_activate(client: TestClient):
    res = client.get('/double_activate')
    assert res.status_code == 200
    assert res.json() == {'a': 'A', 'b': 'B'}


def test_token_session(client: TestClient):
    res = client.get('/setitem?q=42', headers={HEADER_NAME: ''})
    assert client.get('/show', headers={HEADER_NAME: res.headers[HEADER_NAME]}).json() == {'q': 42}


@ app.get('/clear')
def clear_session(*, session: Session = Depends()):
    with session.activate():
        session.clear()


def test_clear(client):
    client.get('/setitem?q=42')
    client.get('/clear')
    assert client.get('/show').json() == {}


def test_malformed_session(client):
    res = client.get('/setitem?q=42')
    s = res.cookies[Session._cookie_name]
    s = f'{s[:-4]}0000'
    res.cookies.set(Session._cookie_name, s)
    assert client.get('/show', cookies=res.cookies).json() == {}


def test_sssion_expiration_1(client):
    with time_machine.travel(0):
        client.get('/setitem?q=42')
        assert client.get('/show').json() == {'q': 42}
    with time_machine.travel(EXPIRES_IN + 1):
        assert client.get('/show').json() == {}


def test_sssion_expiration_2(client):
    with time_machine.travel(0):
        client.get('/setitem?q=42')
    with time_machine.travel(EXPIRES_IN - 1):
        assert client.get('/show').json() == {'q': 42}
    with time_machine.travel(EXPIRES_IN + 1):
        assert client.get('/show').json() == {'q': 42}  # ↑のアクセスで寿命が延びる


@app.get('/peek')
def peek_session(*, session: Session = Depends()):
    return session.peek()


def test_sssion_expiration_3(client):
    with time_machine.travel(0):
        client.get('/setitem?q=42')
    with time_machine.travel(EXPIRES_IN - 1):
        assert client.get('/peek').json() == {'q': 42}
    with time_machine.travel(EXPIRES_IN + 1):
        assert client.get('/peek').json() == {}
