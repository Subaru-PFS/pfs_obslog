import time
import contextlib
from logging import getLogger

logger = getLogger(__name__)

stack = []


@contextlib.contextmanager
def timeit(name: str):
    logger.info("  " * len(stack) + f'{name} start')
    stack.append(name)
    start = time.time()
    try:
        yield
    finally:
        stack.pop()
        logger.info("  " * len(stack) + f'{name}: {"{:.2f}".format(time.time() - start)}s')
