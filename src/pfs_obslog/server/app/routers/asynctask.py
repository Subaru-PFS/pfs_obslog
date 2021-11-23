import asyncio
import contextlib
from asyncio.futures import Future
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from typing import Callable, TypeVar, cast


class _g:
    thread_pool = cast(ThreadPoolExecutor, None)
    process_pool = cast(ProcessPoolExecutor, None)


def setup_asynctask():
    _g.thread_pool = ThreadPoolExecutor()
    _g.process_pool = ProcessPoolExecutor(4)


def shutdown_asynctask():
    try:
        _g.process_pool.shutdown()
    except:
        pass
    try:
        _g.thread_pool.shutdown()
    except:
        pass


@contextlib.contextmanager
def setup_asynctask_context():
    with ProcessPoolExecutor() as _g.process_pool, ThreadPoolExecutor() as _g.thread_pool:
        yield


T = TypeVar('T')
U = TypeVar('U')


def background_process(f: Callable[[T], U], args: T, kwargs={}, *, new_process=False) -> Future[U]:
    return _background_process_typeunsafe(f, (args,), kwargs, new_process)


def backgrofund_process_typeunsafe_args(f: Callable[..., U], args: tuple, kwargs={}, *, new_process=False) -> Future[U]:
    return _background_process_typeunsafe(f, args, kwargs, new_process)


def background_thread(f: Callable[[T], U], args: T) -> Future[U]:
    return _background_thread_typeunsafe(f, (args,))


def _background_thread_typeunsafe(f: Callable, args: tuple):
    return asyncio.wrap_future(_g.thread_pool.submit(f, *args))


def _background_process_typeunsafe(f: Callable, args: tuple, kwargs: dict, new_process: bool):
    if new_process:
        with ProcessPoolExecutor(1) as pool:
            return asyncio.wrap_future(pool.submit(f, *args, **kwargs))
    else:
        return asyncio.wrap_future(_g.process_pool.submit(f, *args, **kwargs))
