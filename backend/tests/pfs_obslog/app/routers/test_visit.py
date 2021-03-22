from starlette.testclient import TestClient
import pytest

# pytestmark = pytest.mark.focus


def test_visit(client: TestClient):
    res = client.get('/api/visits/77749')
    assert res.status_code == 200


def test_visi_rank(client: TestClient):
    res = client.get('/api/visits/78097/rank')
    assert res.status_code == 200
    assert isinstance(res.json()['rank'], int)


@pytest.mark.focus
def test_visi_rank_with_sql(client: TestClient):
    res = client.get('/api/visits/78097/rank', params={
        'sql': r"""select * where sequence_type like 'scienceObject_windowed' """
    })
    assert res.status_code == 200
    assert isinstance(res.json()['rank'], int)


def test_visit_list_with_valid_query(client: TestClient):
    res = client.get('/api/visits', params={
        'sql': r"""select * where sequence_type like '%domeflat%' """
    })
    assert res.status_code == 200

    res = client.get('/api/visits', params={
        'sql': r"""select *  where any_column like '%domeflat%' """
    })
    assert res.status_code == 200

    res = client.get('/api/visits', params={
        'sql': r"""select *  where any_column like '%domeflat%' and any_column not like '%dome%' """
    })
    assert res.status_code == 200


def test_visit_list_with_invalid_query(client: TestClient):
    res = client.get('/api/visits', params={
        'sql': r"""select *  where syntax...error """
    })
    assert res.status_code == 422
    assert res.json()['detail'] == 'syntax error at or near ".."'

    res = client.get('/api/visits', params={
        'sql': r"""select *  where unknown_column """
    })
    assert res.status_code == 422
    assert res.json()['detail'].startswith('Unknown column:')


def test_csv(client: TestClient):
    res = client.get('/api/visits.csv', params={'sql': "select * where issued_at::date = '2021-07-02'"})
    assert res.status_code == 200
