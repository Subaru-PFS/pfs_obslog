from typing import TYPE_CHECKING
import dataclasses
from pydantic import BaseModel
from pydantic.utils import GetterDict


class orm_getter_dict(GetterDict):
    def __init__(self, obj):
        if isinstance(obj, BaseModel):  # pragma: no cover
            super().__init__(obj)
        else:
            super().__init__(self._row_to_obj(obj))

    def _row_to_obj(self, row):  # pragma: no cover
        raise NotImplementedError()


# __init__ of class decorated with static_check_init_args will be statically type checked by Pylance.
# See https://github.com/microsoft/python-language-server/issues/1898
#
#
# @static_check_init_args
# class X:
#     id: int
#
# # Argument missing for parameter "id"
# X()
if TYPE_CHECKING:  # pragma: no cover
    _static_check_init_args = dataclasses.dataclass
else:
    def _static_check_init_args(cls):
        return cls

static_check_init_args = _static_check_init_args
