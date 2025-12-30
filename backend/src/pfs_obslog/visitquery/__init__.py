"""SQLライクなフィルタリング機能

Visit一覧のフィルタリングにSQLライクなWHERE句を使用できる機能を提供する。

使用例:
    from pfs_obslog.visitquery import parse_where_clause, QueryEvaluator

    # WHERE句をパース
    where_ast = parse_where_clause("where id = 100")

    # SQLAlchemy式に変換
    evaluator = QueryEvaluator()
    condition = evaluator.evaluate(where_ast)

    # クエリに適用
    query = select(PfsVisit).where(condition)
"""

from .parser import QueryParseError, parse_where_clause
from .evaluator import QueryEvaluator
from .columns import VIRTUAL_COLUMNS, VirtualColumn

__all__ = [
    "QueryParseError",
    "parse_where_clause",
    "QueryEvaluator",
    "VIRTUAL_COLUMNS",
    "VirtualColumn",
]
