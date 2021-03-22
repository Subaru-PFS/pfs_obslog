from pathlib import Path

import pytest
from pfs.datamodel import PfsDesign
from pfs.utils.pfsDesignUtils import showPfsDesign



HERE = Path(__file__).parent


# def test_pfs():
#     sample_dir = HERE / 'fixture/pfsDesign'
#     pfsDesign = PfsDesign.read(0x7d010f61bc9bd163, str(sample_dir))
#     showPfsDesign([pfsDesign])
