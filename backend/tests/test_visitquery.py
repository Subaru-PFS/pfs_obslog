"""visitqueryモジュールのテスト"""

import pytest
from pfs_obslog.visitquery import (
    QueryParseError,
    parse_where_clause,
    QueryEvaluator,
    VIRTUAL_COLUMNS,
)
from pfs_obslog.visitquery.parser import validate_expression
from pfs_obslog.visitquery.joins import JoinBuilder


class TestParseWhereClause:
    """parse_where_clause関数のテスト"""

    def test_simple_equality(self):
        """単純な等価比較"""
        ast = parse_where_clause("where id = 100")
        assert ast is not None

    def test_like_pattern(self):
        """LIKEパターン"""
        ast = parse_where_clause("where sequence_type like '%domeflat%'")
        assert ast is not None

    def test_between(self):
        """BETWEEN式"""
        ast = parse_where_clause("where id between 100 and 200")
        assert ast is not None

    def test_complex_condition(self):
        """複合条件"""
        ast = parse_where_clause("where id > 100 and sequence_type like '%test%'")
        assert ast is not None

    def test_is_null(self):
        """IS NULL"""
        ast = parse_where_clause("where status is null")
        assert ast is not None

    def test_is_not_null(self):
        """IS NOT NULL"""
        ast = parse_where_clause("where status is not null")
        assert ast is not None

    def test_not_expression(self):
        """NOT式"""
        ast = parse_where_clause("where not is_sps_visit")
        assert ast is not None

    def test_or_expression(self):
        """OR式"""
        ast = parse_where_clause("where is_sps_visit or is_mcs_visit")
        assert ast is not None

    def test_select_format(self):
        """SELECT文形式でも動作"""
        ast = parse_where_clause("select * where id = 100")
        assert ast is not None

    def test_no_where_clause(self):
        """WHERE句なしの場合はNoneを返す"""
        ast = parse_where_clause("select *")
        assert ast is None

    def test_invalid_syntax(self):
        """構文エラー"""
        with pytest.raises(QueryParseError):
            parse_where_clause("where invalid syntax here ???")

    def test_array_access(self):
        """配列アクセス（fits_header）"""
        ast = parse_where_clause("where fits_header['OBSERVER'] = 'test'")
        assert ast is not None

    def test_type_cast(self):
        """型キャスト"""
        ast = parse_where_clause("where issued_at::date = '2021-01-01'")
        assert ast is not None


class TestValidateExpression:
    """validate_expression関数のテスト"""

    def test_valid_expression(self):
        """有効な式"""
        ast = parse_where_clause("where id = 100")
        validate_expression(ast)  # エラーなし

    def test_subquery_not_allowed(self):
        """サブクエリは許可されない"""
        ast = parse_where_clause("where id in (select id from other)")
        with pytest.raises(QueryParseError, match="Subqueries are not allowed"):
            validate_expression(ast)

    def test_allowed_function(self):
        """許可された関数"""
        ast = parse_where_clause("where lower(status) = 'ok'")
        validate_expression(ast)  # エラーなし

    def test_disallowed_function(self):
        """許可されない関数"""
        ast = parse_where_clause("where pg_sleep(1) = 1")
        with pytest.raises(QueryParseError, match="not allowed"):
            validate_expression(ast)


class TestVirtualColumns:
    """仮想カラム定義のテスト"""

    def test_all_columns_defined(self):
        """基本的なカラムが定義されている"""
        expected_columns = [
            "visit_id",
            "id",
            "issued_at",
            "sequence_type",
            "comments",
            "visit_set_id",
            "visit_note",
            "visit_set_note",
            "status",
            "is_sps_visit",
            "is_mcs_visit",
            "is_agc_visit",
            "fits_header",
            "any_column",
        ]
        for col in expected_columns:
            assert col in VIRTUAL_COLUMNS, f"Column '{col}' should be defined"

    def test_id_alias(self):
        """idはvisit_idのエイリアス"""
        assert VIRTUAL_COLUMNS["id"].required_joins == VIRTUAL_COLUMNS["visit_id"].required_joins

    def test_computed_columns_marked(self):
        """計算カラムにはis_computedフラグが設定されている"""
        assert VIRTUAL_COLUMNS["is_sps_visit"].is_computed
        assert VIRTUAL_COLUMNS["is_mcs_visit"].is_computed
        assert VIRTUAL_COLUMNS["is_agc_visit"].is_computed
        assert VIRTUAL_COLUMNS["any_column"].is_computed

    def test_join_dependencies(self):
        """JOINの依存関係が正しく設定されている"""
        # sequence_typeはiic_sequenceへのJOINが必要
        assert "iic_sequence" in VIRTUAL_COLUMNS["sequence_type"].required_joins

        # statusはiic_sequence_statusへのJOINが必要
        assert "iic_sequence_status" in VIRTUAL_COLUMNS["status"].required_joins


# モックモデルを使用したEvaluatorのテスト
class MockModels:
    """テスト用のモックモデル"""

    class PfsVisit:
        pfs_visit_id = "pfs_visit.pfs_visit_id"
        pfs_visit_description = "pfs_visit.pfs_visit_description"
        issued_at = "pfs_visit.issued_at"
        pfs_design_id = "pfs_visit.pfs_design_id"

    class IicSequence:
        iic_sequence_id = "iic_sequence.iic_sequence_id"
        sequence_type = "iic_sequence.sequence_type"
        comments = "iic_sequence.comments"
        name = "iic_sequence.name"
        iic_sequence_status = "iic_sequence.iic_sequence_status"

    class IicSequenceStatus:
        cmd_output = "iic_sequence_status.cmd_output"

    class ObslogVisitNote:
        body = "obslog_visit_note.body"
        user = "obslog_visit_note.user"

    class ObslogVisitSetNote:
        body = "obslog_visit_set_note.body"
        user = "obslog_visit_set_note.user"

    class SpsVisit:
        pfs_visit_id = "sps_visit.pfs_visit_id"

    class SpsExposure:
        pass

    class SpsAnnotation:
        notes = "sps_annotation.notes"

    class McsExposure:
        pfs_visit_id = "mcs_exposure.pfs_visit_id"

    class AgcExposure:
        pfs_visit_id = "agc_exposure.pfs_visit_id"

    class SequenceGroup:
        group_id = "sequence_group.group_id"
        group_name = "sequence_group.group_name"

    class ObslogFitsHeader:
        cards_dict = {"KEY": "value"}

    class PfsDesignFiber:
        pfs_design_id = "pfs_design_fiber.pfs_design_id"
        proposal_id = "pfs_design_fiber.proposal_id"

    class ObslogMcsExposureNote:
        body = "obslog_mcs_exposure_note.body"
        user = "obslog_mcs_exposure_note.user"

    class ObslogUser:
        account_name = "obslog_user.account_name"

    class VisitSet:
        pass


class TestQueryEvaluatorRequiredJoins:
    """QueryEvaluatorのJOIN依存解析のテスト"""

    def test_no_join_for_basic_column(self):
        """基本カラムはJOIN不要"""
        ast = parse_where_clause("where id = 100")
        evaluator = QueryEvaluator(MockModels)
        evaluator.evaluate(ast)
        assert len(evaluator.required_joins) == 0

    def test_join_for_sequence_type(self):
        """sequence_typeはiic_sequenceのJOINが必要"""
        ast = parse_where_clause("where sequence_type = 'test'")
        evaluator = QueryEvaluator(MockModels)
        evaluator.evaluate(ast)
        assert "iic_sequence" in evaluator.required_joins
        assert "visit_set" in evaluator.required_joins

    def test_join_for_is_sps_visit(self):
        """is_sps_visitはsps_visitのJOINが必要"""
        ast = parse_where_clause("where is_sps_visit")
        evaluator = QueryEvaluator(MockModels)
        evaluator.evaluate(ast)
        assert "sps_visit" in evaluator.required_joins

    def test_join_for_any_column(self):
        """any_columnは複数のJOINが必要"""
        # any_columnはVIRTUAL_COLUMNSの定義から必要なJOINが設定される
        from pfs_obslog.visitquery.columns import VIRTUAL_COLUMNS
        any_col = VIRTUAL_COLUMNS["any_column"]
        # any_columnは多くのテーブルをJOINする必要がある
        assert len(any_col.required_joins) > 5


class TestQueryEvaluatorErrors:
    """QueryEvaluatorのエラー処理のテスト"""

    def test_unknown_column(self):
        """不明なカラムはエラー"""
        ast = parse_where_clause("where unknown_column = 1")
        evaluator = QueryEvaluator(MockModels)
        with pytest.raises(QueryParseError, match="Unknown column"):
            evaluator.evaluate(ast)


class TestJoinDependencyResolution:
    """JOINの依存関係解決のテスト"""

    def test_resolve_single_dependency(self):
        """単一の依存関係を解決"""
        from pfs_obslog.visitquery.joins import JOIN_DEPENDENCIES

        # iic_sequence は visit_set に依存
        assert "visit_set" in JOIN_DEPENDENCIES.get("iic_sequence", set())

    def test_resolve_chain_dependency(self):
        """連鎖した依存関係を解決"""
        from pfs_obslog.visitquery.joins import JOIN_DEPENDENCIES

        # iic_sequence_status -> iic_sequence, visit_set
        deps = JOIN_DEPENDENCIES.get("iic_sequence_status", set())
        assert "iic_sequence" in deps
        assert "visit_set" in deps
