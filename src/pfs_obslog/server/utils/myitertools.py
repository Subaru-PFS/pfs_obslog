from typing import Any, Generator, Iterable, TypeVar


T = TypeVar('T')


def batch(iterable0: Iterable[T], batch_size: int) -> Generator[Generator[T, None, None], None, None]:
    assert batch_size > 0
    iterable = iter(iterable0)
    q: list[T] = [next(iterable)]

    def g() -> Generator[T, None, None]:
        start = len(q)
        while len(q) > 0:
            yield q.pop(0)
        for i, item in enumerate(iterable, start):
            if i == batch_size:
                q.append(item)
                return
            yield item

    while len(q) > 0:
        yield g()
