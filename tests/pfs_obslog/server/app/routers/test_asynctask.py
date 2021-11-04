import pytest
from pfs_obslog.server.app.routers.asynctask import (background_process,
                                                     setup_asynctask_context)
from pfs_obslog.server.logging import reset_loggers
from pfs_obslog.server.utils import timeit

# pytestmark = pytest.mark.focus


@pytest.fixture(scope='module', autouse=True)
def setup():
    reset_loggers()
    with setup_asynctask_context():
        yield


def square(x: int):
    return x * x


@pytest.mark.asyncio
async def test_background_process():
    with timeit.timeit('background'):
        assert await background_process(square, 3) == 9
