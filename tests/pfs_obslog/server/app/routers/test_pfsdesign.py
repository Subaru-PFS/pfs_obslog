from pathlib import Path

import pytest
from pfs.datamodel import PfsDesign
from pfs.utils.pfsDesignUtils import showPfsDesign

pytestmark = pytest.mark.focus


HERE = Path(__file__).parent


def test_pfs():
    sample_dir = HERE / 'fixture/pfsDesign'
    pfsDesign = PfsDesign.read(0x7d010f61bc9bd163, sample_dir)
    showPfsDesign([pfsDesign])
