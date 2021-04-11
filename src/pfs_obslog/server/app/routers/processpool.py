import asyncio
import multiprocessing.pool
from typing import Callable, Optional, TypeVar, cast


class _g:
    pool = cast(multiprocessing.pool.Pool, None,)


def setup_processpool():
    _g.pool = multiprocessing.pool.Pool()


def background_process(f: Callable, args: tuple):
    fut = asyncio.Future()

    def resolve(result):
        fut.set_result(result)

    def reject(error):
        fut.set_exception(error)

    _g.pool.apply_async(f, args=args, callback=resolve, error_callback=reject)
    return fut
