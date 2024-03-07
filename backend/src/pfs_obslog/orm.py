import dataclasses
from typing import Any, Callable, Generic, TYPE_CHECKING, Type, TypeVar, ClassVar

from pydantic import BaseModel, ConfigDict
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

            row_to_model: ClassVar[Callable[[Any], BaseModel]] = staticmethod(mapper)
            
        return Config




U = TypeVar('U', bound=Type[BaseModel])


def skip_validation(model: U) -> U:
    return model.construct  # type: ignore
