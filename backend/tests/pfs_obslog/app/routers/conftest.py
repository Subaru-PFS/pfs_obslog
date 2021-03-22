import pytest
from pfs_obslog.userauth import TEST_USER, TEST_PASSWORD
from fastapi.testclient import TestClient
from pfs_obslog.app.fastapi_app import app


@pytest.fixture
def client():
    client = TestClient(app)
    res = client.post(
        '/api/session',
        json={'username': TEST_USER, 'password': TEST_PASSWORD})
    assert res.status_code == 200
    return client
