import pytest
from pfs_obslog.server.userauth import TEST_USER, TEST_PASSWORD
from pfs_obslog.server import app
from pfs_obslog.server.app.context import test_db
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


def test_create_session_with_invalid_credentials(test_client):
    res = test_client.post(
        '/api/session',
        json={'username': TEST_USER, 'password': 'ABC' + TEST_PASSWORD})
    assert res.status_code == 422
    res = test_client.get('/api/session')
    assert res.status_code == 401
