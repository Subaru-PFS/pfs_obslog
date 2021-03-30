import pytest
from pfs_obslog.server.userauth import TEST_USER, TEST_PASSWORD
from fastapi.testclient import TestClient
from pfs_obslog.server.app import app


@pytest.fixture
def client():
    client = TestClient(app)
    res = client.post(
        '/api/session',
        json={'username': TEST_USER, 'password': TEST_PASSWORD})
    assert res.status_code == 200
    return client
