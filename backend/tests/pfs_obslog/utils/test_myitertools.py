from pfs_obslog.utils.myitertools import batch


def test_batch():
    assert [[*g] for g in batch(range(5), 3)] == [[0, 1, 2], [3, 4]]
    assert [[*g] for g in batch(range(6), 3)] == [[0, 1, 2], [3, 4, 5]]
