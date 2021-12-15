from pathlib import Path

from pfs_obslog.server.orm import static_check_init_args
from pfs_obslog.server.utils.metafits import load_fits_headers
from pydantic import BaseModel


@static_check_init_args
class FitsHeader(BaseModel):
    cards: list


@static_check_init_args
class FitsHdu(BaseModel):
    index: int
    header: FitsHeader


@static_check_init_args
class FitsMeta(BaseModel):
    frameid: str  # id of the file
    hdul: list[FitsHdu]


def fits_meta(path: Path) -> FitsMeta:
    headers = load_fits_headers(str(path))
    return FitsMeta(
        frameid=path.name,
        hdul=[
            FitsHdu(
                index=i,
                header=FitsHeader(cards=[[keyword, header_value_stringify(value), comment]
                                  for keyword, value, comment in header.cards]),
            )
            for i, header in enumerate(headers)
        ]
    )


def header_value_stringify(value):
    if isinstance(value, float):
        return str(value)
    if isinstance(value, bool):
        return 'T' if value else 'F'
    return value
