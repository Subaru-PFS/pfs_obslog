import json
from pathlib import Path

import pytest

HERE = Path(__file__).parent
CREDFILE = HERE / 'secrets' / 'account.json'


@pytest.fixture
def credentials():
    with open(CREDFILE) as f:
        return json.load(f)


@pytest.fixture(autouse=True)
def run_if_credentails_are_provided(request):
    if request.node.get_closest_marker('run_if_credentails_are_provided') and not CREDFILE.exists():
        pytest.skip(f'{CREDFILE} is not present.')