import logging
import re
import sys
from logging import LogRecord
from uvicorn.logging import ColourizedFormatter, copy
import click


def setup():
    for logger in (logging.getLogger(name) for name in logging.root.manager.loggerDict):  # type: ignore
        for h in reversed(logger.handlers):
            logger.removeHandler(h)

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(Formatter('%(levelprefix)s %(message)s %(name)s'))
    logger.addHandler(handler)


color_map = {
    'SELECT': 'cyan',
    'INSERT': 'yellow',
    'UPDATE': 'yellow',
    'BEGIN': 'magenta',
    'ROLLBACK': 'magenta',
}

sql_re = re.compile(f'({"|".join(color_map.keys())})')


logger = logging.getLogger('pfsobslog')


class Formatter(ColourizedFormatter):
    def format(self, record: LogRecord):
        record = copy(record)
        m = sql_re.match(record.msg)
        if m:
            record.msg = click.style(record.msg, fg=color_map[m.group(1)])
        else:
            record.msg = click.style(record.msg, dim=True)
        record.name = click.style(f'@{record.name}', dim=True, bold=True)
        return super().format(record)
