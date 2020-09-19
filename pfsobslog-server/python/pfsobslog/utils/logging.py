import logging
import re
import sys
from logging import LogRecord
from uvicorn.logging import ColourizedFormatter, copy
import click


def setup():
    logger = logging.getLogger('sqlalchemy.engine.base.Engine')
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(Formatter('%(levelprefix)s %(message)s'))
    logger.addHandler(handler)


color_map = {
    'SELECT': 'cyan',
    'INSERT': 'yellow',
    'UPDATE': 'yellow',
    'BEGIN': 'magenta',
    'ROLLBACK': 'magenta',
}

sql_re = re.compile(f'({"|".join(color_map.keys())})')


class Formatter(ColourizedFormatter):
    def format(self, record: LogRecord):
        record = copy(record)
        m = sql_re.match(record.msg)
        if m:
            record.msg = click.style(record.msg, fg=color_map[m.group(1)])
        else:
            record.msg = click.style(record.msg, dim=True)
        return super().format(record)
