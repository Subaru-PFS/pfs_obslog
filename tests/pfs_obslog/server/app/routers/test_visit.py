from sqlalchemy.orm import Session
from fastapi import params
from starlette.testclient import TestClient
import pytest


@pytest.mark.focus
def test_visit_list(client: TestClient):
    res = client.get('/api/visits', params={
        'filter': r""" where sequence_type like '%domeflat%' """
    })
    assert res.status_code == 200

    res = client.get('/api/visits', params={
        'filter': r""" where any_column like '%domeflat%' """
    })
    assert res.status_code == 200

    res = client.get('/api/visits', params={
        'filter': r""" where any_column like '%domeflat%' and any_column not like '%dome%' """
    })
    assert res.status_code == 200
