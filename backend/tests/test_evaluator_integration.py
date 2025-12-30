"""evaluator.pyの統合テスト

開発用DBを使用して、SQLAlchemy式の生成と実行をテストします。
"""

import pytest
from sqlalchemy import select, func

from pfs_obslog import models as M
from pfs_obslog.visitquery import parse_where_clause, QueryEvaluator, QueryParseError
from pfs_obslog.visitquery.joins import JoinBuilder


class TestQueryEvaluatorIntegration:
    """QueryEvaluatorの統合テスト（実際のDBを使用）"""

    def test_simple_equality(self, db_session_readonly):
        """単純な等価比較"""
        ast = parse_where_clause("where id = 1")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        # SQLAlchemy式が生成されることを確認
        assert where_clause is not None

        # クエリを実行してエラーがないことを確認
        query = select(M.PfsVisit.pfs_visit_id).where(where_clause)
        result = db_session_readonly.execute(query).fetchall()
        # 結果はデータ依存なので件数はチェックしない

    def test_greater_than(self, db_session_readonly):
        """大小比較（>）"""
        ast = parse_where_clause("where id > 100")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause)
        result = db_session_readonly.execute(query).fetchall()

    def test_less_than_or_equal(self, db_session_readonly):
        """大小比較（<=）"""
        ast = parse_where_clause("where id <= 1000")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause)
        result = db_session_readonly.execute(query).fetchall()

    def test_not_equal(self, db_session_readonly):
        """不等価比較（<>）"""
        ast = parse_where_clause("where id <> 1")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause)
        result = db_session_readonly.execute(query).fetchall()

    def test_not_equal_alternative(self, db_session_readonly):
        """不等価比較（!=）"""
        ast = parse_where_clause("where id != 1")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause)
        result = db_session_readonly.execute(query).fetchall()

    def test_between(self, db_session_readonly):
        """BETWEEN式"""
        ast = parse_where_clause("where id between 100 and 200")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause)
        result = db_session_readonly.execute(query).fetchall()

    def test_not_between(self, db_session_readonly):
        """NOT BETWEEN式"""
        ast = parse_where_clause("where id not between 100 and 200")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_like_pattern(self, db_session_readonly):
        """LIKE式"""
        ast = parse_where_clause("where sequence_type like '%flat%'")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        # JOINが必要
        assert "iic_sequence" in evaluator.required_joins

        # JOINを適用してクエリ実行
        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_ilike_pattern(self, db_session_readonly):
        """ILIKE式（大文字小文字を区別しない）"""
        ast = parse_where_clause("where sequence_type ilike '%FLAT%'")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_is_null(self, db_session_readonly):
        """IS NULL"""
        ast = parse_where_clause("where status is null")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_is_not_null(self, db_session_readonly):
        """IS NOT NULL"""
        ast = parse_where_clause("where status is not null")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_and_expression(self, db_session_readonly):
        """AND式"""
        ast = parse_where_clause("where id > 100 and id < 200")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause)
        result = db_session_readonly.execute(query).fetchall()

    def test_or_expression(self, db_session_readonly):
        """OR式"""
        ast = parse_where_clause("where id = 1 or id = 2")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause)
        result = db_session_readonly.execute(query).fetchall()

    def test_not_expression(self, db_session_readonly):
        """NOT式"""
        ast = parse_where_clause("where not id = 1")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_complex_condition(self, db_session_readonly):
        """複合条件"""
        ast = parse_where_clause("where (id > 100 and id < 200) or id = 1")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause)
        result = db_session_readonly.execute(query).fetchall()


class TestComputedColumns:
    """計算カラムのテスト"""

    def test_is_sps_visit(self, db_session_readonly):
        """is_sps_visit計算カラム"""
        ast = parse_where_clause("where is_sps_visit")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        assert "sps_visit" in evaluator.required_joins

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_is_mcs_visit(self, db_session_readonly):
        """is_mcs_visit計算カラム"""
        ast = parse_where_clause("where is_mcs_visit")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        assert "mcs_exposure" in evaluator.required_joins

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_is_agc_visit(self, db_session_readonly):
        """is_agc_visit計算カラム"""
        ast = parse_where_clause("where is_agc_visit")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        assert "agc_exposure" in evaluator.required_joins

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_not_is_sps_visit(self, db_session_readonly):
        """NOT is_sps_visit"""
        ast = parse_where_clause("where not is_sps_visit")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()


class TestTypeCast:
    """型キャストのテスト"""

    def test_date_cast(self, db_session_readonly):
        """DATE型キャスト"""
        ast = parse_where_clause("where issued_at::date = '2024-01-01'")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause)
        result = db_session_readonly.execute(query).fetchall()

    def test_integer_cast(self, db_session_readonly):
        """INTEGER型キャスト"""
        ast = parse_where_clause("where id::integer > 100")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_float_cast(self, db_session_readonly):
        """FLOAT型キャスト"""
        ast = parse_where_clause("where id::float8 > 100.5")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_unsupported_type_cast(self):
        """サポートされていない型キャスト"""
        ast = parse_where_clause("where id::text = '100'")
        evaluator = QueryEvaluator(M)
        with pytest.raises(QueryParseError, match="Unsupported type cast"):
            evaluator.evaluate(ast)


class TestFitsHeader:
    """fits_headerアクセスのテスト"""

    def test_fits_header_access(self, db_session_readonly):
        """fits_header['KEY']アクセス"""
        ast = parse_where_clause("where fits_header['OBSERVER'] = 'test'")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        assert "obslog_fits_header" in evaluator.required_joins

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_fits_header_like(self, db_session_readonly):
        """fits_header LIKEパターン"""
        ast = parse_where_clause("where fits_header['OBSERVER'] like '%test%'")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()


class TestAnyColumn:
    """any_columnのテスト"""

    def test_any_column_equal(self, db_session_readonly):
        """any_column = value"""
        ast = parse_where_clause("where any_column = 'test'")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        # any_columnは多くのテーブルをJOINする
        assert len(evaluator.required_joins) > 0

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_any_column_like(self, db_session_readonly):
        """any_column LIKE pattern"""
        ast = parse_where_clause("where any_column like '%test%'")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_any_column_ilike(self, db_session_readonly):
        """any_column ILIKE pattern"""
        ast = parse_where_clause("where any_column ilike '%TEST%'")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_any_column_unsupported_operator(self):
        """any_columnに対するサポートされていない演算子"""
        ast = parse_where_clause("where any_column > 100")
        evaluator = QueryEvaluator(M)
        with pytest.raises(QueryParseError, match="not supported for any_column"):
            evaluator.evaluate(ast)


class TestConstantValues:
    """定数値のテスト"""

    def test_integer_constant(self, db_session_readonly):
        """整数定数"""
        ast = parse_where_clause("where id = 12345")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause)
        result = db_session_readonly.execute(query).fetchall()

    def test_float_constant(self, db_session_readonly):
        """浮動小数点定数"""
        ast = parse_where_clause("where id > 100.5")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        query = select(M.PfsVisit.pfs_visit_id).where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_string_constant(self, db_session_readonly):
        """文字列定数"""
        ast = parse_where_clause("where sequence_type = 'domeflat'")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()


class TestErrorCases:
    """エラーケースのテスト"""

    def test_unknown_column(self):
        """不明なカラム"""
        ast = parse_where_clause("where unknown_column = 1")
        evaluator = QueryEvaluator(M)
        with pytest.raises(QueryParseError, match="Unknown column"):
            evaluator.evaluate(ast)

    def test_unsupported_operator(self):
        """サポートされていない演算子"""
        # ^演算子はサポートされていない
        ast = parse_where_clause("where id ^ 2 = 0")
        evaluator = QueryEvaluator(M)
        with pytest.raises(QueryParseError, match="Unsupported operator"):
            evaluator.evaluate(ast)

    def test_like_with_non_string_pattern(self):
        """LIKE式で文字列でないパターン"""
        # パターンが定数でない場合のテスト
        ast = parse_where_clause("where sequence_type like id")
        evaluator = QueryEvaluator(M)
        with pytest.raises(QueryParseError, match="LIKE pattern must be a string"):
            evaluator.evaluate(ast)

    def test_ilike_with_non_string_pattern(self):
        """ILIKE式で文字列でないパターン"""
        ast = parse_where_clause("where sequence_type ilike id")
        evaluator = QueryEvaluator(M)
        with pytest.raises(QueryParseError, match="ILIKE pattern must be a string"):
            evaluator.evaluate(ast)

    def test_fits_header_invalid_key(self):
        """fits_headerに数値キーを指定"""
        ast = parse_where_clause("where fits_header[123] = 'test'")
        evaluator = QueryEvaluator(M)
        with pytest.raises(QueryParseError, match="fits_header key must be a string"):
            evaluator.evaluate(ast)

    def test_any_column_like_non_string(self):
        """any_column LIKEで文字列でないパターン"""
        ast = parse_where_clause("where any_column like id")
        evaluator = QueryEvaluator(M)
        with pytest.raises(QueryParseError, match="LIKE pattern must be a string"):
            evaluator.evaluate(ast)


class TestJoinBuilder:
    """JoinBuilderのテスト"""

    def test_apply_multiple_joins(self, db_session_readonly):
        """複数のJOINを適用"""
        # sequence_typeとstatusを両方使う
        ast = parse_where_clause("where sequence_type = 'test' and status is not null")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        assert "iic_sequence" in evaluator.required_joins
        assert "iic_sequence_status" in evaluator.required_joins

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_join_dependency_resolution(self, db_session_readonly):
        """JOIN依存関係の解決"""
        # iic_sequence_statusはiic_sequenceに依存
        ast = parse_where_clause("where status = 'ok'")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_sps_annotation_join(self, db_session_readonly):
        """sps_annotation関連のJOIN"""
        ast = parse_where_clause("where is_sps_visit")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(10)
        result = db_session_readonly.execute(query).fetchall()

    def test_all_join_types(self, db_session_readonly):
        """全てのJOINタイプをテスト"""
        # any_columnは多くのJOINを必要とする
        ast = parse_where_clause("where any_column like '%test%'")
        evaluator = QueryEvaluator(M)
        where_clause = evaluator.evaluate(ast)

        join_builder = JoinBuilder(M)
        query = select(M.PfsVisit.pfs_visit_id)
        query = join_builder.apply_joins(query, evaluator.required_joins)
        query = query.where(where_clause).limit(5)
        result = db_session_readonly.execute(query).fetchall()
