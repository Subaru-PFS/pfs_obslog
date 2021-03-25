from typing import Type
from opdb.models import Base
from pydantic.utils import GetterDict


class orm_getter_dict(GetterDict):
    def __init__(self, obj):
        if isinstance(obj, Base):
            super().__init__(self._row_to_obj(obj))
        else:
            super().__init__(obj)

    def _row_to_obj(self, row):
        raise NotImplementedError()
