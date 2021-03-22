import asyncio
import contextlib
import multiprocessing
from asyncio.futures import Future
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from typing import Awaitable, Callable, Optional, TypeVar, cast

from pfs_obslog.config import settings


class _g:
    thread_executor = cast('TaskExecutor', None)
    process_executor = cast('TaskExecutor', None)


def setup_asynctask():
    _g.thread_executor = ThreadPoolTaskExecutor()
    _g.process_executor = ProcessForkTaskExcutor() if settings.asynctask_fork else ProcessPoolTaskExecutor()


def shutdown_asynctask():
    try:
        _g.process_executor.shutdown()
    except:
        pass
    try:
        _g.thread_executor.shutdown()
    except:
        pass


@contextlib.contextmanager
def setup_asynctask_context():
    with ProcessPoolExecutor(), ThreadPoolExecutor():
        setup_asynctask()
        try:
            yield
        finally:
            shutdown_asynctask()


T = TypeVar('T')
U = TypeVar('U')


def background_process(f: Callable[[], U]) -> Future[U]:
    return _g.process_executor.run(f)


def background_thread(f: Callable[[], U]) -> Future[U]:
    return _g.thread_executor.run(f)


class TaskExecutor:
    def shutdown(self):
        ...

    def run(self, target: Callable[[], T]) -> Future[T]:
        ...

    def __enter__(self):
        ...

    def __exit__(self, *args):
        self.shutdown()


class ProcessForkTaskExcutor(TaskExecutor):
    def run(self, target: Callable[[], T]) -> Awaitable[T]:
        with ProcessPoolExecutor(1, mp_context=settings.mp_context and multiprocessing.get_context() ) as pool:
            return asyncio.wrap_future(pool.submit(target))


class ProcessPoolTaskExecutor(TaskExecutor):
    def __init__(self, n_processes=4) -> None:
        super().__init__()
        self._process_pool = ProcessPoolExecutor(n_processes)

    def shutdown(self):
        super().shutdown()
        self._process_pool.shutdown()

    def run(self, target: Callable[[], T]) -> Future[T]:
        return asyncio.wrap_future(self._process_pool.submit(target))


class ThreadPoolTaskExecutor(TaskExecutor):
    def __init__(self, n_threads: Optional[int] = None) -> None:
        super().__init__()
        self._thread_pool = ThreadPoolExecutor(n_threads)

    def shutdown(self):
        super().shutdown()
        self._thread_pool.shutdown()

    def run(self, target: Callable[[], T]) -> Future[T]:
        return asyncio.wrap_future(self._thread_pool.submit(target))
