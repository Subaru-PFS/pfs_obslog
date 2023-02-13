from textwrap import dedent
from typing import Final, Optional, Union

import psqlparse.exceptions
import sqlalchemy
from opdb import models as M
from sqlalchemy import Date, String, and_, cast, distinct, not_, or_, select
from sqlalchemy.orm import aliased
from sqlalchemy.sql.operators import ColumnOperators

from pfs_obslog.parsesql import ast, parse
from pfs_obslog.utils.symbol import Symbol


def extract_where_clause(sql: str) -> Optional[ast.Evaluatable]:
    try:
        stmt = parse(sql)[0]
    except psqlparse.exceptions.PSqlParseError as e:
        raise ast.SqlError(e)
    if not isinstance(stmt, ast.SelectStmt):
        raise ast.SqlError(f'{sql} is not a select statement')
    if stmt.whereClause:
        return stmt.whereClause


visit_note_user: M.obslog_user = aliased(M.obslog_user)  # type: ignore
visit_set_note_user: M.obslog_user = aliased(M.obslog_user)  # type: ignore
mcs_exposure_note_user: M.obslog_user = aliased(M.obslog_user)  # type: ignore


def evaluate_where_clause(where: ast.Evaluatable):
    ctx = VisitQueryContext()
    ids = (select(distinct(M.pfs_visit.pfs_visit_id)).
           select_from(M.pfs_visit).
           # visit not
           outerjoin(M.obslog_visit_note).
           outerjoin(visit_note_user, M.obslog_visit_note.user).
           # SpS exposure
           outerjoin(M.sps_visit).
           outerjoin(M.sps_exposure).
           outerjoin(M.sps_annotation).
           # iic_sequence
           outerjoin(M.visit_set).
           outerjoin(M.iic_sequence).
           outerjoin(M.obslog_visit_set_note).
           outerjoin(visit_set_note_user, M.obslog_visit_set_note.user).
           outerjoin(M.iic_sequence_status, M.iic_sequence.iic_sequence_status).
           outerjoin(M.sequence_group).
           # MCS exposure
           outerjoin(M.mcs_exposure).
           outerjoin(M.obslog_mcs_exposure_note).
           outerjoin(mcs_exposure_note_user, M.obslog_mcs_exposure_note.user).
           # AGC exposure
           outerjoin(M.agc_exposure).
           # fits header
           outerjoin(M.obslog_fits_header).
           filter(where(ctx))  # type: ignore
           )
    return ids


AnyColumn: Final = Symbol('AnyColumn')


columns_for_simple_search: Final = [
    cast(M.pfs_visit.pfs_visit_id, String),
    M.pfs_visit.pfs_visit_description,
    M.obslog_visit_note.body,
    visit_note_user.account_name,
    M.obslog_visit_set_note.body,
    visit_set_note_user.account_name,
    M.iic_sequence.name,
    M.iic_sequence.sequence_type,
    M.iic_sequence_status.cmd_output,
    M.sps_annotation.notes,
    M.obslog_mcs_exposure_note.body,
    mcs_exposure_note_user.account_name,
]


class VisitQueryContext(ast.EvaluationContext):
    def A_Const(self, node: ast.A_Const):
        return node.value

    def ColumnRef(self, node: ast.ColumnRef):
        columns: dict[tuple[Union[ast.String, ast.A_Star]], object] = {
            (ast.String('any_column'),): AnyColumn,
            (ast.String('visit_id'),): M.pfs_visit.pfs_visit_id,
            (ast.String('id'),): M.pfs_visit.pfs_visit_id,
            (ast.String('sequence_type'),): M.iic_sequence.sequence_type,
            (ast.String('comments'),): M.iic_sequence.comments,
            (ast.String('issued_at'),): M.pfs_visit.issued_at,
            (ast.String('visit_note'),): M.obslog_visit_note.body,
            (ast.String('visit_note_user'),): visit_note_user.account_name,
            (ast.String('visit_set_note'),): M.obslog_visit_set_note.body,
            (ast.String('visit_set_note_user'),): visit_set_note_user.account_name,
            (ast.String('status'),): M.iic_sequence_status.cmd_output,
            (ast.String('is_sps_visit'),): M.sps_visit.pfs_visit_id != None,
            (ast.String('is_mcs_visit'),): M.mcs_exposure.pfs_visit_id != None,
            (ast.String('is_agc_visit'),): M.agc_exposure.pfs_visit_id != None,
            # (ast.String('n_sps_exposures'),): func.count(distinct(M.sps_exposure.sps_camera_id)).label('n_sps_exposures'),
            # (ast.String('n_mcs_exposures'),): func.count(distinct(M.mcs_exposure.mcs_frame_id)).label('n_mcs_exposures'),
            # (ast.String('n_agc_exposures'),): func.count(distinct(M.agc_exposure.agc_exposure_id)).label('n_agc_exposures'),
            (ast.String('fits_header'),): M.obslog_fits_header.cards_dict,
            (ast.String('visit_set_id'),): M.iic_sequence.iic_sequence_id,
            (ast.String('sequence_group_id'),): M.sequence_group.group_id,
            (ast.String('sequence_group_name'),): M.sequence_group.group_name,
        }
        if node.fields not in columns:
            raise ast.SqlError(f'Unknown column: {node.fields}')
        return columns[node.fields]

    def TypeCast(self, node: ast.TypeCast):
        if node.typeName.names == [ast.String('date')]:
            return cast(node.arg(self), Date)
        if node.typeName.names == [ast.String(str='pg_catalog'), ast.String(str='float8')]:
            return cast(node.arg(self), sqlalchemy.Float)
        if node.typeName.names == [ast.String(str='pg_catalog'), ast.String(str='int4')]:
            return cast(node.arg(self), sqlalchemy.Integer)
        if node.typeName.names == [ast.String(str='safe_float')]:
            return sqlalchemy.func.try_cast_float(node.arg(self))
        if node.typeName.names == [ast.String(str='safe_int')]:
            return sqlalchemy.func.try_cast_int(node.arg(self))
        raise ast.SqlError(f'Unknown type cast: {node}')

    def Equal(self, node: ast.Equal):
        l = node.lexpr(self)
        r = node.rexpr(self)
        if r == AnyColumn:
            l, r = r, l
            return or_(c == r for c in columns_for_simple_search)  # type: ignore
        return l == r

    def NotEqual(self, node: ast.NotEqual):
        return ast.Not(ast.Equal(node.lexpr, node.rexpr))(self)

    def LessEqual(self, node: ast.LessEqual):
        return node.lexpr(self) <= node.rexpr(self)

    def LessThan(self, node: ast.LessThan):
        return node.lexpr(self) < node.rexpr(self)

    def GreaterEqual(self, node: ast.LessEqual):
        return node.lexpr(self) >= node.rexpr(self)

    def GreaterThan(self, node: ast.LessThan):
        return node.lexpr(self) > node.rexpr(self)

    def Like(self, node: ast.Like):
        l = node.lexpr(self)
        r = node.rexpr(self)
        if not isinstance(r, str):
            raise ast.SqlError(f'Right operand for LIKE must be a string: {node.lexpr} LIKE {node.rexpr}')
        if l == AnyColumn:
            return or_(c.ilike(r) for c in columns_for_simple_search)  # type: ignore
            # null or true == true or null == true であるためこれで良い
        else:
            assert isinstance(l, ColumnOperators)
            return l.ilike(r)

    def NotLike(self, node: ast.NotLike):
        return ast.Not(ast.Like(node.lexpr, node.rexpr))(self)
        # any_column not like '${long-random-string}'
        # のようなクエリーはほとんどの行で true になって欲しい。
        #
        # しかしany_column not like 'a' を
        # not ( c1 like 'a' or c2 like 'a' ... )
        # と展開すると思い通りにいかない
        #
        # c1... のどれかが null だとすると
        # c1... のどれも '${long-random-string}' にマッチしない場合
        # ( c1 like 'a' or c2 like 'a' ... ) → null
        # である。
        #
        # 全体としては not null == null のためほとんどの行で null を返してしまう。
        # not null -> true と解釈するために
        # def Not で細工をしている

    def UnaryMinus(self, node: ast.UnaryMinus):
        return - node.rexpr(self)

    def And(self, node: ast.And):
        return and_(*[a(self) for a in node.args])

    def Or(self, node: ast.Or):
        return or_(*[a(self) for a in node.args])

    def Not(self, node: ast.Not):
        c = node.value(self)
        return not_(c) | (c == None)

    def Between(self, node: ast.Between):
        return node.lexpr(self).between(node.rexpr[0](self), node.rexpr[1](self))

    def A_Indirection(self, node: ast.A_Indirection):
        '''
        This evaluator is only for fits header
        '''
        if node.arg.fields != (ast.String('fits_header'),):
            raise ast.SqlError(f'Unknown Column: {node.arg.fields}')
        if len(node.indirection) == 1:
            keyword, = node.indirection
            if (isinstance(keyword, ast.A_Indices) and isinstance(keyword.uidx.value, str)):
                value = M.obslog_fits_header.cards_dict[keyword.uidx.value]  # type: ignore
                # return case(
                #     (sqlalchemy.func.jsonb_typeof(value) == 'boolean',
                #         case(
                #             (value.astext == 'true', 'T'),  # type: ignore
                #             else_='F'),
                #      ),
                #     else_=value.astext
                # )
                return value.astext  # type: ignore
        raise ast.SqlError(dedent("""\
            accessing FITS header should be something like this:
              `WHERE fits_header['OBSERVER'] LIKE '%Arthur%'`,
              `WHERE fits_header['NAXIS']::integer = 2`, or
              `WHERE fits_header['SIMPLE'] == 'true\
        """))

    def NullTest(self, node: ast.NullTest):
        return node.arg(self) == None
