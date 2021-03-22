from pfs_obslog.server.userauth import authorize
import json
import pytest
from pathlib import Path


HERE = Path(__file__).parent
CREDFILE = HERE / 'secrets' / 'account.json'


@ pytest.mark.slow
@ pytest.mark.skipif(not CREDFILE.exists(), reason='credentails are not provbided')
def test_authorize(credentials):
    assert not authorize(
        credentials['username'],
        '',
    )
    assert not authorize(
        credentials['username'],
        'ABC' + credentials['password'],
    )
    assert authorize(
        credentials['username'],
        credentials['password'],
    )


@ pytest.fixture
def credentials():
    with open(CREDFILE) as f:
        return json.load(f)
