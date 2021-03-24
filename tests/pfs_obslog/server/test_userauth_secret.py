import pytest
from pfs_obslog.server.userauth_secret import authorize


@ pytest.mark.slow
@ pytest.mark.run_if_credentails_are_provided
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
