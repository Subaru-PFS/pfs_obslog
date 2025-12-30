"""SQLライクなWHERE句のパーサー

pglastを使用してPostgreSQL互換のWHERE句をパースする。
"""

from typing import Any

import pglast
from pglast import ast
from pglast.error import Error as PglastError


class QueryParseError(ValueError):
    """クエリのパースエラー"""

    pass


def parse_where_clause(sql: str) -> ast.Node | None:
    """
    WHERE句をパースしてASTを返す

    Args:
        sql: "where <条件>" または "select * where <条件>" 形式の文字列

    Returns:
        WHERE句のAST（WHERE句がない場合はNone）

    Raises:
        QueryParseError: パースに失敗した場合
    """
    sql = sql.strip()

    # "where ..." のみの場合は補完
    if not sql.lower().startswith("select"):
        sql = f"SELECT * {sql}"

    try:
        result = pglast.parse_sql(sql)
    except PglastError as e:
        raise QueryParseError(str(e)) from e

    if not result:
        raise QueryParseError("Empty SQL statement")

    stmt = result[0].stmt

    if not isinstance(stmt, ast.SelectStmt):
        raise QueryParseError(f"Expected SELECT statement, got {type(stmt).__name__}")

    return stmt.whereClause


def validate_expression(node: ast.Node) -> None:
    """
    危険な構文がないかチェック

    Args:
        node: チェック対象のASTノード

    Raises:
        QueryParseError: 禁止された構文が含まれる場合
    """
    forbidden_types = (
        ast.InsertStmt,
        ast.UpdateStmt,
        ast.DeleteStmt,
        ast.CreateStmt,
        ast.DropStmt,
        ast.TruncateStmt,
    )

    # 再帰的にノードを走査
    def check_node(n: Any) -> None:
        if isinstance(n, forbidden_types):
            raise QueryParseError(f"Forbidden statement type: {type(n).__name__}")

        if isinstance(n, ast.SubLink):
            raise QueryParseError("Subqueries are not allowed")

        if isinstance(n, ast.FuncCall):
            # 一部の関数のみ許可（将来的に拡張可能）
            func_name = _get_func_name(n)
            allowed_funcs = {"date", "lower", "upper", "trim", "coalesce"}
            if func_name.lower() not in allowed_funcs:
                raise QueryParseError(f"Function '{func_name}' is not allowed")

        # 子ノードを走査
        if hasattr(n, "__slots__"):
            for slot in n.__slots__:
                child = getattr(n, slot, None)
                if child is not None:
                    if isinstance(child, ast.Node):
                        check_node(child)
                    elif isinstance(child, (list, tuple)):
                        for item in child:
                            if isinstance(item, ast.Node):
                                check_node(item)

    check_node(node)


def _get_func_name(func_call: ast.FuncCall) -> str:
    """FuncCallノードから関数名を取得"""
    if func_call.funcname:
        names = [
            n.sval if isinstance(n, ast.String) else str(n) for n in func_call.funcname
        ]
        return ".".join(names)
    return ""
