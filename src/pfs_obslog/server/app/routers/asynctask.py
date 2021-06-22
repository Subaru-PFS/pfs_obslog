import asyncio
import io
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from typing import Callable, cast

import astropy.io.fits
from astropy.visualization import ZScaleInterval
from matplotlib import pyplot


class _g:
    process_pool = cast(ProcessPoolExecutor, None)
    thread_pool = cast(ThreadPoolExecutor, None)


def setup_asynctask():
    _g.process_pool = ProcessPoolExecutor(2)
    _g.thread_pool = ThreadPoolExecutor()


def background_process(f: Callable, args: tuple):
    return asyncio.wrap_future(_g.process_pool.submit(f, *args))


def background_thread(f: Callable, args: tuple):
    return asyncio.wrap_future(_g.thread_pool.submit(f, *args))
