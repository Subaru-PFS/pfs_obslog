import pytest
from starlette.status import HTTP_403_FORBIDDEN, HTTP_422_UNPROCESSABLE_ENTITY
from pfs_obslog.server.userauth import TEST_USER, TEST_PASSWORD
from pfs_obslog.server import app
from pfs_obslog.server.app.context import test_db, Context
from fastapi.testclient import TestClient


@pytest.fixture
def test_client():
    return TestClient(app)


def test_create_session_with_valid_credentials(test_client):
    with test_db.begin_nested():
        res = test_client.post(
            '/api/session',
            json={'username': TEST_USER, 'password': TEST_PASSWORD})
        assert res.status_code == 200
        res = test_client.get('/api/session')
        assert res.status_code == 200
        res = test_client.delete('/api/session')
        assert res.status_code == 200
        res = test_client.get('/api/session')
        assert res.status_code == HTTP_403_FORBIDDEN


def test_create_session_with_valid_credentials_with_token():
    with test_db.begin_nested():
        res = TestClient(app).post(
            '/api/session',
            headers={'pfs_obslog_token': ''},
            json={'username': TEST_USER, 'password': TEST_PASSWORD},
        )
        assert res.status_code == 200
        res = TestClient(app).get(
            '/api/session',
            headers={'pfs_obslog_token': res.headers['pfs_obslog_token']},
        )
        assert res.status_code == 200


def test_create_session_with_invalid_credentials(test_client):
    res = test_client.post(
        '/api/session',
        json={'username': TEST_USER, 'password': 'ABC' + TEST_PASSWORD})
    assert res.status_code == HTTP_422_UNPROCESSABLE_ENTITY
    res = test_client.get('/api/session')
    assert res.status_code == HTTP_403_FORBIDDEN


def test_double_create_session(test_client):
    with test_db.begin_nested():
        res = test_client.post(
            '/api/session',
            json={'username': TEST_USER, 'password': TEST_PASSWORD})
        assert res.status_code == 200
        res = test_client.post(
            '/api/session',
            json={'username': TEST_USER, 'password': TEST_PASSWORD})
        assert res.status_code == 200
