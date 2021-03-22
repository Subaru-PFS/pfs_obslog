import logging
import re
import sys
from logging import LogRecord
from uvicorn.logging import ColourizedFormatter, copy
import click


def reset_loggers(*, level=logging.INFO, out=sys.stderr):
    for logger in (logging.getLogger(name) for name in logging.root.manager.loggerDict):  # type: ignore
        for h in reversed(logger.handlers):
            logger.removeHandler(h)
    logger = logging.getLogger()
    logger.setLevel(level)
    handler = logging.StreamHandler(out)
    handler.setFormatter(_Formatter('%(levelprefix)s %(message)s %(name)s'))
    logger.addHandler(handler)


_color_map = {
    'SELECT': 'cyan',
    'INSERT': 'yellow',
    'UPDATE': 'yellow',
    'BEGIN': 'magenta',
    'ROLLBACK': 'magenta',
    'COMMIT': 'magenta',
}
_sql_re = re.compile(f'({"|".join(_color_map.keys())})')


class _Formatter(ColourizedFormatter):
    def format(self, record: LogRecord):
        record = copy(record)
        m = _sql_re.match(record.msg)
        if m:
            record.msg = click.style(record.msg, fg=_color_map[m.group(1)])
        else:
            record.msg = click.style(record.msg, dim=True)
        record.name = click.style(f'@{record.name}', dim=True, bold=True)
        return super().format(record)


logger = logging.getLogger('pfs_obslog')
