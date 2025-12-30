"""Tests for pfs_obslog.module."""

from pfs_obslog.module import hello


def test_hello() -> None:
    """Test the hello function."""
    assert hello() == "Hello from pfs_obslog!"
