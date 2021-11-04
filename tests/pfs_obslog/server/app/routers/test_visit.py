from starlette.testclient import TestClient
import pytest

from spt_operational_database.build.lib.opdb.models import pfs_object


def test_visit(client: TestClient):
    res = client.get('/api/visits/0')
    assert res.status_code == 200


def test_visit_list_with_valid_query(client: TestClient):
    res = client.get('/api/visits', params={
        'sql': r""" where sequence_type like '%domeflat%' """
    })
    assert res.status_code == 200

    res = client.get('/api/visits', params={
        'sql': r""" where any_column like '%domeflat%' """
    })
    assert res.status_code == 200

    res = client.get('/api/visits', params={
        'sql': r""" where any_column like '%domeflat%' and any_column not like '%dome%' """
    })
    assert res.status_code == 200


def test_visit_list_with_invalid_query(client: TestClient):
    res = client.get('/api/visits', params={
        'sql': r""" where syntax...error """
    })
    assert res.status_code == 400
    assert res.json()['detail'] == 'syntax error at or near ".."'

    res = client.get('/api/visits', params={
        'sql': r""" where unknown_column """
    })
    assert res.status_code == 400
    assert res.json()['detail'].startswith('Unknown column:')



def test_csv(client: TestClient):
    res = client.get('/api/visits.csv', params={'sql': "where issued_at::date = '2021-07-02'"})
    assert res.status_code == 200
