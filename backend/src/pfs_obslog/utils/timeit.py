import contextlib
import time
from asyncio.log import logger

from pfs_obslog.logging import logger, reset_loggers

stack = []


reset_loggers()


@contextlib.contextmanager
def timeit(name: str):
    logger.info("| " * len(stack) + f'{name}')
    stack.append(name)
    start = time.time()
    try:
        yield
    finally:
        stack.pop()
        logger.info("| " * len(stack) + f'{name}: {"{:.2f}".format(time.time() - start)}s')
