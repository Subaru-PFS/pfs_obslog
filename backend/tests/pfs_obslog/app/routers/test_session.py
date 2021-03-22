import pytest
from starlette.status import HTTP_403_FORBIDDEN, HTTP_422_UNPROCESSABLE_ENTITY
from pfs_obslog.userauth import TEST_USER, TEST_PASSWORD
from pfs_obslog.app.fastapi_app import app
from fastapi.testclient import TestClient


# pytestmark = pytest.mark.focus


@pytest.fixture
def client():
    return TestClient(app)


def test_create_session_with_valid_credentials(client):
    res = client.post(
        '/api/session',
        json={'username': TEST_USER, 'password': TEST_PASSWORD})
    assert res.status_code == 200
    res = client.get('/api/session')
    assert res.status_code == 200
    res = client.delete('/api/session')
    assert res.status_code == 200
    res = client.get('/api/session')
    assert res.json()['current_user'] is None



def test_create_session_with_valid_credentials_with_token():
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


def test_create_session_with_invalid_credentials(client):
    res = client.post(
        '/api/session',
        json={'username': TEST_USER, 'password': 'ABC' + TEST_PASSWORD})
    assert res.status_code == HTTP_422_UNPROCESSABLE_ENTITY
    res = client.get('/api/session')
    assert res.json()['current_user'] is None


def test_double_create_session(client):
    res = client.post(
        '/api/session',
        json={'username': TEST_USER, 'password': TEST_PASSWORD})
    assert res.status_code == 200
    res = client.post(
        '/api/session',
        json={'username': TEST_USER, 'password': TEST_PASSWORD})
    assert res.status_code == 200
