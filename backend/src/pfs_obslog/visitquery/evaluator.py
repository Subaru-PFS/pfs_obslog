"""ASTをSQLAlchemy式に変換する評価器

pglastのASTノードをSQLAlchemyのWHERE句に変換する。

このモジュールのテストはtest_evaluator_integration.pyで実際のDBを
使用して行います。
"""

from typing import Any

from pglast import ast, enums
from sqlalchemy import String, and_, cast, not_, or_
from sqlalchemy.sql.elements import ColumnElement

from .columns import VIRTUAL_COLUMNS
from .parser import QueryParseError


class QueryEvaluator:
    """pglast ASTをSQLAlchemy式に変換する評価器"""

    def __init__(self, models: Any):
        """
        Args:
            models: SQLAlchemyモデルを含むモジュール
        """
        self.models = models
        self.required_joins: set[str] = set()

        # モデルからカラムマッピングを構築
        self._column_map = self._build_column_map()

    def _build_column_map(self) -> dict[str, ColumnElement[Any]]:
        """モデルからカラムマッピングを構築"""
        M = self.models
        return {
            "visit_id": M.PfsVisit.pfs_visit_id,
            "id": M.PfsVisit.pfs_visit_id,
            "issued_at": M.PfsVisit.issued_at,
            "sequence_type": M.IicSequence.sequence_type,
            "comments": M.IicSequence.comments,
            "visit_set_id": M.IicSequence.iic_sequence_id,
            "visit_note": M.ObslogVisitNote.body,
            "visit_set_note": M.ObslogVisitSetNote.body,
            "status": M.IicSequenceStatus.cmd_output,
            "sequence_group_id": M.SequenceGroup.group_id,
            "sequence_group_name": M.SequenceGroup.group_name,
            "fits_header": M.ObslogFitsHeader.cards_dict,
            "proposal_id": M.t_pfs_design_fiber.c.proposal_id,
        }

    def _get_computed_column(self, name: str) -> ColumnElement[Any]:
        """計算カラムの式を返す"""
        M = self.models
        computed = {
            "is_sps_visit": M.SpsVisit.pfs_visit_id != None,  # noqa: E711
            "is_mcs_visit": M.McsExposure.pfs_visit_id != None,  # noqa: E711
            "is_agc_visit": M.AgcExposure.pfs_visit_id != None,  # noqa: E711
        }
        if name not in computed:
            raise QueryParseError(f"Unknown computed column: {name}")
        return computed[name]

    def _get_any_column_columns(self) -> list[ColumnElement[Any]]:
        """any_columnで検索対象となるカラムのリストを返す"""
        M = self.models
        return [
            cast(M.PfsVisit.pfs_visit_id, String),
            M.PfsVisit.pfs_visit_description,
            M.ObslogVisitNote.body,
            M.ObslogVisitSetNote.body,
            M.IicSequence.name,
            M.IicSequence.sequence_type,
            M.IicSequenceStatus.cmd_output,
            M.SpsAnnotation.notes,
            M.ObslogMcsExposureNote.body,
            M.t_pfs_design_fiber.c.proposal_id,
        ]

    def evaluate(self, node: ast.Node | None) -> ColumnElement[Any] | None:
        """ASTノードをSQLAlchemy式に変換"""
        if node is None:
            return None

        method_name = f"eval_{type(node).__name__}"
        method = getattr(self, method_name, None)

        if method is None:
            raise QueryParseError(f"Unsupported node type: {type(node).__name__}")

        return method(node)

    def eval_A_Const(self, node: ast.A_Const) -> Any:
        """定数値"""
        if node.isnull:
            return None

        val = node.val
        if isinstance(val, ast.Integer):
            return val.ival
        elif isinstance(val, ast.Float):
            return float(val.fval)  # type: ignore[arg-type]
        elif isinstance(val, ast.String):
            return val.sval
        else:
            raise QueryParseError(f"Unknown constant type: {type(val).__name__}")

    def eval_ColumnRef(self, node: ast.ColumnRef) -> ColumnElement[Any] | str:
        """カラム参照"""
        if len(node.fields) != 1:  # type: ignore[arg-type]
            raise QueryParseError(f"Invalid column reference: {node.fields}")

        field = node.fields[0]  # type: ignore[index]
        if not isinstance(field, ast.String):
            raise QueryParseError(f"Invalid column name: {field}")

        col_name = field.sval.lower()  # type: ignore[union-attr]

        # カラム定義を確認
        if col_name not in VIRTUAL_COLUMNS:
            raise QueryParseError(f"Unknown column: {col_name}")

        vcol = VIRTUAL_COLUMNS[col_name]
        self.required_joins.update(vcol.required_joins)

        # any_columnの場合は特殊なマーカーを返す
        if col_name == "any_column":
            return "__any_column__"

        # 計算カラムの場合
        if vcol.is_computed:
            return self._get_computed_column(col_name)

        # 通常カラムの場合
        if col_name in self._column_map:
            return self._column_map[col_name]

        raise QueryParseError(f"Column '{col_name}' not mapped to SQLAlchemy")

    def eval_A_Expr(self, node: ast.A_Expr) -> ColumnElement[Any]:
        """式（演算子）"""
        kind = node.kind

        if kind == enums.A_Expr_Kind.AEXPR_OP:
            return self._eval_op_expr(node)
        elif kind == enums.A_Expr_Kind.AEXPR_LIKE:
            return self._eval_like_expr(node, negate=False)
        elif kind == enums.A_Expr_Kind.AEXPR_ILIKE:
            return self._eval_ilike_expr(node, negate=False)
        elif kind == enums.A_Expr_Kind.AEXPR_BETWEEN:
            return self._eval_between_expr(node, negate=False)
        elif kind == enums.A_Expr_Kind.AEXPR_NOT_BETWEEN:
            return self._eval_between_expr(node, negate=True)
        else:
            raise QueryParseError(f"Unsupported expression kind: {kind}")

    def _eval_op_expr(self, node: ast.A_Expr) -> ColumnElement[Any]:
        """演算子式（=, <>, <, >, <=, >=）"""
        if not node.name or len(node.name) != 1:
            raise QueryParseError(f"Invalid operator: {node.name}")

        op_node = node.name[0]
        if not isinstance(op_node, ast.String):
            raise QueryParseError(f"Invalid operator: {op_node}")

        op = op_node.sval  # type: ignore[union-attr]
        left = self.evaluate(node.lexpr)  # type: ignore[arg-type]
        right = self.evaluate(node.rexpr)  # type: ignore[arg-type]

        # any_column の特殊処理
        if self._is_any_column_value(left) or self._is_any_column_value(right):
            return self._eval_any_column_op(op, left, right, node)  # type: ignore[arg-type]

        ops = {
            "=": lambda l, r: l == r,
            "<>": lambda l, r: l != r,
            "!=": lambda l, r: l != r,
            "<": lambda l, r: l < r,
            ">": lambda l, r: l > r,
            "<=": lambda l, r: l <= r,
            ">=": lambda l, r: l >= r,
        }

        if op not in ops:
            raise QueryParseError(f"Unsupported operator: {op}")

        return ops[op](left, right)

    def _eval_like_expr(
        self, node: ast.A_Expr, negate: bool = False
    ) -> ColumnElement[Any]:
        """LIKE式"""
        left = self.evaluate(node.lexpr)  # type: ignore[arg-type]
        right = self.evaluate(node.rexpr)  # type: ignore[arg-type]

        # any_column の特殊処理
        if self._is_any_column_value(left):
            return self._eval_any_column_like(right, negate)

        if not isinstance(right, str):
            raise QueryParseError("LIKE pattern must be a string")

        result = left.like(right)  # type: ignore[union-attr]
        return not_(result) if negate else result

    def _eval_ilike_expr(
        self, node: ast.A_Expr, negate: bool = False
    ) -> ColumnElement[Any]:
        """ILIKE式（大文字小文字を区別しない）"""
        left = self.evaluate(node.lexpr)  # type: ignore[arg-type]
        right = self.evaluate(node.rexpr)  # type: ignore[arg-type]

        # any_column の特殊処理
        if self._is_any_column_value(left):
            return self._eval_any_column_like(right, negate)

        if not isinstance(right, str):
            raise QueryParseError("ILIKE pattern must be a string")

        result = left.ilike(right)  # type: ignore[union-attr]
        return not_(result) if negate else result

    def _eval_between_expr(
        self, node: ast.A_Expr, negate: bool = False
    ) -> ColumnElement[Any]:
        """BETWEEN式"""
        left = self.evaluate(node.lexpr)  # type: ignore[arg-type]

        if not isinstance(node.rexpr, (list, tuple)) or len(node.rexpr) != 2:  # type: ignore[arg-type]
            raise QueryParseError("BETWEEN requires two boundary values")

        low = self.evaluate(node.rexpr[0])  # type: ignore[index]
        high = self.evaluate(node.rexpr[1])  # type: ignore[index]

        result = left.between(low, high)  # type: ignore[union-attr]
        return not_(result) if negate else result

    def _is_any_column(self, node: ast.Node | None) -> bool:
        """any_columnカラムかどうかを判定"""
        if not isinstance(node, ast.ColumnRef):
            return False
        if len(node.fields) != 1:  # type: ignore[arg-type]
            return False
        field = node.fields[0]  # type: ignore[index]
        return isinstance(field, ast.String) and field.sval.lower() == "any_column"  # type: ignore[union-attr]

    def _is_any_column_value(self, value: Any) -> bool:
        """評価結果がany_columnマーカーかどうかを判定"""
        return value == "__any_column__"

    def _eval_any_column_op(
        self, op: str, left: Any, right: Any, node: ast.A_Expr
    ) -> ColumnElement[Any]:
        """any_column に対する演算子の評価"""
        columns = self._get_any_column_columns()
        value = right if self._is_any_column_value(left) else left

        if op == "=":
            return or_(*[col == value for col in columns])
        else:
            raise QueryParseError(f"Operator '{op}' is not supported for any_column")

    def _eval_any_column_like(
        self, pattern: Any, negate: bool = False
    ) -> ColumnElement[Any]:
        """any_column に対するLIKE/ILIKEの評価"""
        columns = self._get_any_column_columns()

        if not isinstance(pattern, str):
            raise QueryParseError("LIKE pattern must be a string")

        # 大文字小文字を区別しないilike
        result = or_(*[col.ilike(pattern) for col in columns])
        return not_(result) if negate else result

    def eval_BoolExpr(self, node: ast.BoolExpr) -> ColumnElement[Any]:
        """論理式（AND, OR, NOT）"""
        boolop = node.boolop

        if boolop == enums.BoolExprType.AND_EXPR:
            return and_(*[self.evaluate(arg) for arg in node.args])  # type: ignore[union-attr, misc]
        elif boolop == enums.BoolExprType.OR_EXPR:
            return or_(*[self.evaluate(arg) for arg in node.args])  # type: ignore[union-attr, misc]
        elif boolop == enums.BoolExprType.NOT_EXPR:
            if len(node.args) != 1:  # type: ignore[arg-type]
                raise QueryParseError("NOT expression requires exactly one argument")
            inner = self.evaluate(node.args[0])  # type: ignore[index]
            # NOT NULL の場合の特殊処理
            # not_(x) は x が NULL の場合 NULL を返すが、
            # 実用上は NULL も false として扱いたい
            return not_(inner) | (inner == None)  # type: ignore[arg-type]  # noqa: E711
        else:
            raise QueryParseError(f"Unsupported boolean operator: {boolop}")

    def eval_NullTest(self, node: ast.NullTest) -> ColumnElement[Any]:
        """IS NULL / IS NOT NULL"""
        arg = self.evaluate(node.arg)  # type: ignore[arg-type]

        if node.nulltesttype == enums.NullTestType.IS_NULL:
            return arg == None  # noqa: E711
        elif node.nulltesttype == enums.NullTestType.IS_NOT_NULL:
            return arg != None  # noqa: E711
        else:
            raise QueryParseError(f"Unsupported null test type: {node.nulltesttype}")

    def eval_A_Indirection(self, node: ast.A_Indirection) -> ColumnElement[Any]:
        """配列/JSONアクセス（fits_header['KEY']）"""
        # arg が fits_header であることを確認
        if not isinstance(node.arg, ast.ColumnRef):
            raise QueryParseError(f"Indirection arg must be ColumnRef: {node.arg}")

        arg = node.arg
        if (
            len(arg.fields) != 1  # type: ignore[arg-type]
            or not isinstance(arg.fields[0], ast.String)  # type: ignore[index]
            or arg.fields[0].sval.lower() != "fits_header"  # type: ignore[index, union-attr]
        ):
            raise QueryParseError("Indirection is only supported for fits_header")

        # 必要なJOINを追加
        self.required_joins.update(VIRTUAL_COLUMNS["fits_header"].required_joins)

        # インデックスを取得
        if len(node.indirection) != 1:  # type: ignore[arg-type]
            raise QueryParseError("fits_header requires exactly one key access")

        idx = node.indirection[0]  # type: ignore[index]
        if not isinstance(idx, ast.A_Indices):
            raise QueryParseError(f"Invalid indirection type: {type(idx).__name__}")

        key_const = idx.uidx
        if (
            not isinstance(key_const, ast.A_Const)
            or not isinstance(key_const.val, ast.String)
        ):
            raise QueryParseError("fits_header key must be a string")

        key = key_const.val.sval

        # JSONB アクセスを返す
        fits_header_col = self._column_map["fits_header"]
        return fits_header_col[key].astext

    def eval_TypeCast(self, node: ast.TypeCast) -> ColumnElement[Any]:
        """型キャスト"""
        arg = self.evaluate(node.arg)  # type: ignore[arg-type]

        type_names = [
            n.sval if isinstance(n, ast.String) else str(n) for n in node.typeName.names  # type: ignore[union-attr]
        ]
        type_str = ".".join(type_names).lower()  # type: ignore[arg-type]

        if type_str == "date":
            from sqlalchemy import Date

            return cast(arg, Date)
        elif type_str in ("pg_catalog.float8", "float8", "float", "double precision"):
            from sqlalchemy import Float

            return cast(arg, Float)
        elif type_str in ("pg_catalog.int4", "int4", "int", "integer"):
            from sqlalchemy import Integer

            return cast(arg, Integer)
        else:
            raise QueryParseError(f"Unsupported type cast: {type_str}")
