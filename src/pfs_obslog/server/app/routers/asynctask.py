import asyncio
from asyncio.futures import Future
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from typing import Callable, TypeVar, cast


class _g:
    process_pool = cast(ProcessPoolExecutor, None)
    thread_pool = cast(ThreadPoolExecutor, None)


def setup_asynctask():
    _g.process_pool = ProcessPoolExecutor(2)
    _g.thread_pool = ThreadPoolExecutor()


def background_process_typeunsafe(f: Callable, args: tuple):
    return asyncio.wrap_future(_g.process_pool.submit(f, *args))


T = TypeVar('T')
U = TypeVar('U')


def background_process(f: Callable[[T], U], args: T) -> Future[U]:
    return asyncio.wrap_future(_g.process_pool.submit(f, args))


def background_thread_typeunsafe(f: Callable, args: tuple):
    return asyncio.wrap_future(_g.thread_pool.submit(f, *args))
