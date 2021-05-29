import asyncio
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from typing import Callable, cast

from matplotlib import pyplot
import io
from astropy.visualization import ZScaleInterval
from matplotlib import pyplot
import astropy.io.fits


class _g:
    process_pool = cast(ProcessPoolExecutor, None)
    thread_pool = cast(ThreadPoolExecutor, None)


def setup_asynctask():
    _g.process_pool = ProcessPoolExecutor()
    _g.thread_pool = ThreadPoolExecutor()


def background_process(f: Callable, args: tuple):
    return asyncio.wrap_future(_g.process_pool.submit(f, *args))


def background_thread(f: Callable, args: tuple):
    return asyncio.wrap_future(_g.thread_pool.submit(f, *args))
