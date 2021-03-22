import pytest
from pfs_obslog.userauth_secret import authorize

# pytestmark = pytest.mark.focus


@pytest.mark.slow
@pytest.mark.run_if_credentails_are_provided
def test_authorize(credentials):
    for c in credentials:
        assert not authorize(
            c['username'],
            '',
        )
        assert not authorize(
            c['username'],
            'ABC' + c['password'],
        )
        assert authorize(
            c['username'],
            c['password'],
        )
