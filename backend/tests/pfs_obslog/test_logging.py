from pfs_obslog.logging import logger, reset_loggers


def test_c0(caplog):
    reset_loggers()
    logger.warning('hello')
    logger.warning('SELECT current_user')
