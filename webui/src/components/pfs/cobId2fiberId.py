# https://github.com/Subaru-PFS/pfs_utils/blob/master/data/fiberids/cobras.pdf
import json
from pathlib import Path
from typing import Callable


def main():
    src = Path(__file__).parent / 'grandfibermap.20210314.txt'
    lines = src.read_text().split('\n')
    columns = lines[0].split()
    dic: dict[str, list[str]] = {}
    for line in lines[1:]:
        if not line:
            continue
        row = line.split()
        assert len(row) == len(columns)
        for k, v in zip(columns, row):
            if k not in dic:
                dic[k] = []
            dic[k].append(converters.get(k, lambda x: x)(v))
    cobId2fiberId = {cobId: dic['fiberId'][index] for index, cobId in enumerate(dic[r'\cob'])}
    print(json.dumps(cobId2fiberId, indent=2))


def parse_int(s: str) -> int:
    try:
        return int(s)
    except ValueError:
        return -1


converters: dict[str, Callable] = {
    r'\cob': parse_int,
    'fiberId': parse_int,
}


if __name__ == '__main__':
    main()
