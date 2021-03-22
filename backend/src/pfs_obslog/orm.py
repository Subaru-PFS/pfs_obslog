import dataclasses
from typing import Any, Callable, Generic, TYPE_CHECKING, Type, TypeVar

from pydantic import BaseModel
from pydantic.utils import GetterDict

T = TypeVar('T')


class OrmConfig(Generic[T]):
    def __call__(self, mapper: Callable[[T], BaseModel]):
        class Config:
            orm_mode = True

            class getter_dict(GetterDict):
                def __init__(self, obj):
                    if isinstance(obj, BaseModel):  # pragma: no cover
                        super().__init__(obj)
                    else:
                        super().__init__(mapper(obj))  # type: ignore

            row_to_model = staticmethod(mapper)
        return Config


U = TypeVar('U', bound=Type[BaseModel])


def skip_validation(model: U) -> U:
    return model.construct  # type: ignore


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
