# This is the Mineo-san's awesome library.

import io
import itertools
from typing import List, Optional, Union

import astropy.io.fits
import numpy


def load_fits_headers(path: str, max_hdu: Optional[int] = None) -> List[astropy.io.fits.Header]:
    """
    Reads only headers of a FITS

    @return (exposure, headers)
        `headers` is a list of headers of the first 4 HDUs.
        Because the width and height of `exposure` are always 0,
        you should look up `headers` in order to get the original image size.
    """
    hs: list[FitsHeader] = []
    with open(path, "rb") as f:
        for hdu_i in itertools.count(0):
            h = FitsHeader.from_fileobj(f)
            if h is None:
                break
            hs.append(h)
            if max_hdu is not None and hdu_i + 1 >= max_hdu:
                break
            f.seek(h.datasize, io.SEEK_CUR)
    return [astropy.io.fits.Header.fromstring(h.tobytes()) for h in hs]


class FitsHeader:
    def __init__(self, chunks):
        self.chunks = list(chunks)
        self.__firstchunk = None
        self.__naxes = None
        self.__headersize = None
        self.__datasize = None

    @classmethod
    def from_fileobj(cls, fileobj):
        cardtype = numpy.dtype([
            ("key", bytes, 8),
            ("eq", bytes, 1),
            ("value", bytes, 71),
        ])

        chunks = []
        for i_chunk in itertools.count():
            buf = bytearray(2880)
            read_bytes = fileobj.readinto(buf)
            if read_bytes == 0 and i_chunk == 0:
                return
            if read_bytes != 2880:
                raise RuntimeError(f"{getattr(fileobj, 'name', '(fileobj)')}: unexpected end of file.")
            chunk = numpy.frombuffer(buf, dtype=cardtype)
            chunks.append(chunk)
            if (chunk["key"] == b"END     ").any():
                break

        return cls(chunks)

    def tobytes(self):
        return b"".join(memoryview(c) for c in self.chunks)

    @property
    def firstchunk(self) -> dict:
        chunk = self.__firstchunk
        if chunk is None:
            chunk = dict(zip(self.chunks[0]["key"], self.chunks[0]["value"]))
            self.__firstchunk = chunk
        return chunk

    @property
    def naxes(self):
        naxes = self.__naxes
        if naxes is None:
            chunk = self.firstchunk
            naxes = [
                fits_header_pars_int(chunk[b"NAXIS%-3d" % i])
                for i in range(1, fits_header_pars_int(chunk[b"NAXIS   "]) + 1)
            ]
            self.__naxes = naxes
        return naxes

    @property
    def headersize(self):
        headersize = self.__headersize
        if headersize is None:
            headersize = 2880 * len(self.chunks)
            self.__headersize = headersize
        return headersize

    @property
    def datasize(self):
        datasize = self.__datasize
        if datasize is None:
            naxes = self.naxes
            if not naxes:
                npix = 0
            else:
                npix = 1
                for x in naxes:
                    npix *= x

            chunk = self.firstchunk
            bytepix = abs(fits_header_pars_int(chunk[b"BITPIX  "])) // 8
            gcount = fits_header_pars_int(chunk.get(b"GCOUNT  ", 1))
            pcount = fits_header_pars_int(chunk.get(b"PCOUNT  ", 0))

            datasize = bytepix * gcount * (pcount + npix)
            datasize = (datasize + (2880 - 1)) // 2880 * 2880
            self.__datasize = datasize

        return datasize


def fits_header_pars_int(value: Union[bytes, int]):
    if isinstance(value, int):
        return value

    slash = value.find(b"/")
    if slash >= 0:
        value = value[:slash]

    return int(value)
