from pathlib import Path
from typing import Any

import astropy.io.fits as afits
from pydantic import BaseModel

from pfs_obslog.utils.metafits import load_fits_headers


class Card(BaseModel):
    key: str
    value: Any
    comment: str


class FitsHeader(BaseModel):
    cards: list[Card]

    def value(self, key, not_found=None):
        for card in self.cards:
            if card.key == key:
                return card.value
        return not_found


class FitsHdu(BaseModel):
    index: int
    header: FitsHeader


class FitsMeta(BaseModel):
    filename: str  # id of the file
    hdul: list[FitsHdu]


def fits_meta(path: Path) -> FitsMeta:
    headers = load_fits_headers(str(path))
    return FitsMeta(
        filename=path.name,
        hdul=[
            FitsHdu(
                index=i,
                header=FitsHeader(
                    cards=[Card(key=keyword, value=stringify(value), comment=comment) for keyword, value, comment in header.cards]),
            )
            for i, header in enumerate(headers)
        ]
    )


def stringify(value):
    if value is True:
        return 'T'
    if value is False:
        return 'F'
    return str(value)


def fits_meta_from_hdul(frameid: str | Path, hdul: afits.HDUList):
    return FitsMeta(
        filename=str(frameid),
        hdul=[
            FitsHdu(
                index=i,
                header=FitsHeader(
                    cards=[Card(key=keyword, value=value, comment=comment) for keyword, value, comment in header.cards]),
            )
            for i, header in enumerate(hdu.header for hdu in hdul)  # type: ignore
        ]
    )
