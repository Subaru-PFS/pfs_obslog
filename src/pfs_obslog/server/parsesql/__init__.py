import psqlparse
from .ast import build_ast0

def parse(sql: str):
    ss = psqlparse.parse(sql)
    return [build_ast0(s.type, s._obj) for s in ss]
