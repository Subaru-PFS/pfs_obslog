"""ASTをSQLAlchemy式に変換する評価器

pglastのASTノードをSQLAlchemyのWHERE句に変換する。

このモジュールのテストはtest_evaluator_integration.pyで実際のDBを
使用して行います。
"""

from dataclasses import dataclass, field
from typing import Any

from pglast import ast, enums
from sqlalchemy import DateTime, String, and_, cast, not_, or_
from sqlalchemy.sql.elements import ColumnElement

from .columns import VIRTUAL_COLUMNS
from .joins import JoinBuilder
from .parser import QueryParseError


@dataclass
class AggregateCondition:
    """集約条件を表すデータクラス"""

    column_name: str
    """カラム名（例: 'sps_count'）"""

    table: str
    """集約対象のテーブル名（例: 'sps_exposure'）"""

    func: str
    """集約関数（'count' または 'avg'）"""

    source_column: str | None
    """集約対象のカラム名（AVGの場合）"""

    operator: str
    """比較演算子（'=', '<', '>', '<=', '>='）"""

    value: Any
    """比較値"""


# 集約カラムを表すマーカークラス
@dataclass
class AggregateColumnMarker:
    """集約カラム参照を表すマーカー"""

    column_name: str


class QueryEvaluator:
    """pglast ASTをSQLAlchemy式に変換する評価器"""

    def __init__(self, models: Any, join_builder: JoinBuilder | None = None):
        """
        Args:
            models: SQLAlchemyモデルを含むモジュール
            join_builder: JoinBuilderインスタンス（エイリアス取得用）
        """
        self.models = models
        self.required_joins: set[str] = set()
        self._join_builder = join_builder or JoinBuilder(models)

        # 集約条件を格納するリスト
        self.aggregate_conditions: list[AggregateCondition] = []

        # モデルからカラムマッピングを構築
        self._column_map = self._build_column_map()

    def _build_column_map(self) -> dict[str, ColumnElement[Any]]:
        """モデルからカラムマッピングを構築"""
        M = self.models
        # エイリアスを使用してテーブル重複警告を回避
        iic_sequence_status = self._join_builder.get_iic_sequence_status_alias()
        visit_note_user = self._join_builder.get_visit_note_user_alias()
        visit_set_note_user = self._join_builder.get_visit_set_note_user_alias()
        return {
            "visit_id": M.PfsVisit.pfs_visit_id,
            "id": M.PfsVisit.pfs_visit_id,
            "issued_at": M.PfsVisit.issued_at,
            "sequence_type": M.IicSequence.sequence_type,
            "comments": M.IicSequence.comments,
            "visit_set_id": M.IicSequence.iic_sequence_id,
            "cmd_str": M.IicSequence.cmd_str,
            "sequence_name": M.IicSequence.name,
            "visit_note": M.ObslogVisitNote.body,
            "visit_note_user": visit_note_user.account_name,
            "visit_set_note": M.ObslogVisitSetNote.body,
            "visit_set_note_user": visit_set_note_user.account_name,
            "status": iic_sequence_status.cmd_output,
            "sequence_group_id": M.SequenceGroup.group_id,
            "sequence_group_name": M.SequenceGroup.group_name,
            "fits_header": M.ObslogFitsHeader.cards_dict,
            "proposal_id": M.t_pfs_design_fiber.c.proposal_id,
            "pfs_design_id": M.PfsVisit.pfs_design_id,
        }

    def _get_computed_column(self, name: str) -> ColumnElement[Any]:
        """計算カラムの式を返す"""
        M = self.models
        # エイリアスを使用してテーブル重複警告を回避
        sps_visit = self._join_builder.get_sps_visit_alias()
        computed = {
            "is_sps_visit": sps_visit.pfs_visit_id != None,  # noqa: E711
            "is_mcs_visit": M.McsExposure.pfs_visit_id != None,  # noqa: E711
            "is_agc_visit": M.AgcExposure.pfs_visit_id != None,  # noqa: E711
        }
        if name not in computed:
            raise QueryParseError(f"Unknown computed column: {name}")
        return computed[name]

    def _get_any_column_columns(self) -> list[ColumnElement[Any]]:
        """any_columnで検索対象となるカラムのリストを返す"""
        M = self.models
        # エイリアスを使用してテーブル重複警告を回避
        iic_sequence_status = self._join_builder.get_iic_sequence_status_alias()
        return [
            cast(M.PfsVisit.pfs_visit_id, String),
            M.PfsVisit.pfs_visit_description,
            M.ObslogVisitNote.body,
            M.ObslogVisitSetNote.body,
            M.IicSequence.name,
            M.IicSequence.sequence_type,
            iic_sequence_status.cmd_output,
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
            # pglast parses hex values like 0x... as Float with fval as string
            fval_str = str(val.fval)
            if fval_str.lower().startswith("0x"):
                # Convert hex string to integer
                return int(fval_str, 16)
            return float(fval_str)
        elif isinstance(val, ast.String):
            return val.sval
        else:
            raise QueryParseError(f"Unknown constant type: {type(val).__name__}")

    def eval_ColumnRef(self, node: ast.ColumnRef) -> ColumnElement[Any] | str | AggregateColumnMarker:
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

        # any_columnは遅いため無効化
        if col_name == "any_column":
            raise QueryParseError(
                "any_column is disabled due to performance issues. "
                "Please use specific columns like visit_note instead."
            )

        self.required_joins.update(vcol.required_joins)

        # 集約カラムの場合は特殊なマーカーを返す
        if vcol.is_aggregate:
            return AggregateColumnMarker(column_name=col_name)

        # 計算カラムの場合
        if vcol.is_computed:
            return self._get_computed_column(col_name)

        # 通常カラムの場合
        if col_name in self._column_map:
            return self._column_map[col_name]

        raise QueryParseError(f"Column '{col_name}' not mapped to SQLAlchemy")

    def eval_A_Expr(self, node: ast.A_Expr) -> ColumnElement[Any] | None:
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

    def _eval_op_expr(self, node: ast.A_Expr) -> ColumnElement[Any] | None:
        """演算子式（=, <>, <, >, <=, >=）"""
        if not node.name or len(node.name) != 1:
            raise QueryParseError(f"Invalid operator: {node.name}")

        op_node = node.name[0]
        if not isinstance(op_node, ast.String):
            raise QueryParseError(f"Invalid operator: {op_node}")

        op: str = op_node.sval  # type: ignore[assignment]
        left = self.evaluate(node.lexpr)  # type: ignore[arg-type]
        right = self.evaluate(node.rexpr)  # type: ignore[arg-type]

        # any_column の特殊処理
        if self._is_any_column_value(left) or self._is_any_column_value(right):
            return self._eval_any_column_op(op, left, right, node)  # type: ignore[arg-type]

        # 集約カラムの特殊処理
        if isinstance(left, AggregateColumnMarker) or isinstance(
            right, AggregateColumnMarker
        ):
            return self._handle_aggregate_op(op, left, right)

        # timestamp型カラムと文字列の比較時に型変換を適用
        left, right = self._coerce_timestamp_comparison(left, right)

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

    def _handle_aggregate_op(
        self, op: str, left: Any, right: Any
    ) -> None:
        """集約カラムに対する演算子を処理

        集約条件をaggregate_conditionsに追加し、Noneを返す（通常のWHERE句には追加しない）
        """
        if isinstance(left, AggregateColumnMarker):
            marker = left
            value = right
        else:
            marker = right
            value = left
            # 演算子の向きを反転
            op_reverse = {
                "=": "=",
                "<>": "<>",
                "!=": "!=",
                "<": ">",
                ">": "<",
                "<=": ">=",
                ">=": "<=",
            }
            op = op_reverse.get(op, op)

        vcol = VIRTUAL_COLUMNS[marker.column_name]

        if not vcol.aggregate_table or not vcol.aggregate_func:
            raise QueryParseError(
                f"Invalid aggregate column configuration: {marker.column_name}"
            )

        self.aggregate_conditions.append(
            AggregateCondition(
                column_name=marker.column_name,
                table=vcol.aggregate_table,
                func=vcol.aggregate_func,
                source_column=vcol.aggregate_column,
                operator=op,
                value=value,
            )
        )

        # 集約条件はNoneを返し、後でHAVING句として処理する
        return None

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

        # timestamp型カラムと文字列の比較時に型変換を適用
        left, low = self._coerce_timestamp_comparison(left, low)
        left, high = self._coerce_timestamp_comparison(left, high)

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

    def _is_timestamp_column(self, value: Any) -> bool:
        """timestamp型のカラムかどうかを判定"""
        if not hasattr(value, "type"):
            return False
        try:
            return isinstance(value.type, DateTime)
        except Exception:
            return False

    def _coerce_timestamp_comparison(
        self, column: Any, value: Any
    ) -> tuple[Any, Any]:
        """timestamp型カラムと文字列の比較時に文字列をtimestampにキャストする

        SQLAlchemyは文字列リテラルをVARCHARとしてバインドするため、
        timestamp型カラムとの比較時に型エラーが発生する。
        これを回避するため、文字列をDateTime型にキャストする。
        """
        if self._is_timestamp_column(column) and isinstance(value, str):
            return column, cast(value, DateTime)
        return column, value

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

    def eval_BoolExpr(self, node: ast.BoolExpr) -> ColumnElement[Any] | None:
        """論理式（AND, OR, NOT）"""
        boolop = node.boolop

        if boolop == enums.BoolExprType.AND_EXPR:
            # Noneをフィルタリング（集約条件の場合Noneが返される）
            conditions = [self.evaluate(arg) for arg in node.args]  # type: ignore[union-attr]
            non_null_conditions = [c for c in conditions if c is not None]
            if not non_null_conditions:
                return None
            if len(non_null_conditions) == 1:
                return non_null_conditions[0]
            return and_(*non_null_conditions)  # type: ignore[arg-type]
        elif boolop == enums.BoolExprType.OR_EXPR:
            # OR内に集約条件がある場合はエラー
            conditions = [self.evaluate(arg) for arg in node.args]  # type: ignore[union-attr]
            if any(c is None for c in conditions):
                raise QueryParseError(
                    "Aggregate columns cannot be used in OR expressions"
                )
            return or_(*conditions)  # type: ignore[arg-type]
        elif boolop == enums.BoolExprType.NOT_EXPR:
            if len(node.args) != 1:  # type: ignore[arg-type]
                raise QueryParseError("NOT expression requires exactly one argument")
            inner = self.evaluate(node.args[0])  # type: ignore[index]
            if inner is None:
                raise QueryParseError(
                    "Aggregate columns cannot be used in NOT expressions"
                )
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

        # fits_headerは遅いため無効化
        raise QueryParseError(
            "fits_header is disabled due to performance issues. "
            "This feature may be re-enabled in the future."
        )

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
