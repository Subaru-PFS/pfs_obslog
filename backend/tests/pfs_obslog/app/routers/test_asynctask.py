import dataclasses
import pytest
from pfs_obslog.app.routers.asynctask import (background_process, setup_asynctask_context)
from pfs_obslog.logging import reset_loggers
from pfs_obslog.utils import timeit

# pytestmark = pytest.mark.focus


@pytest.fixture(scope='module', autouse=True)
def setup():
    reset_loggers()
    with setup_asynctask_context():
        yield


@dataclasses.dataclass
class SquareTask:
    x: int

    def __call__(self):
        x = self.x
        return x * x


@pytest.mark.asyncio
async def test_background_process():
    with timeit.timeit('background'):
        assert await background_process(SquareTask(x=3)) == 9
