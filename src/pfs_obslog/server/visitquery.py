from dataclasses import dataclass
from typing import Any, Final, Optional, Union, cast as type_cast, final

from opdb import models as M
from pfs_obslog.server.parsesql import ast, parse
from sqlalchemy import distinct, not_, or_, and_, select, cast, Date, String
from sqlalchemy.sql.operators import ColumnOperators
from sqlalchemy.orm import aliased

from pfs_obslog.server.utils.symbol import Symbol

@dataclass
class VisitQuery:
    pfs_visit_ids: Optional[Any]
    order: Optional[ColumnOperators]


def visit_query(sql: str):
    stmt = parse(f'SELECT * {sql}')[0]
    if not isinstance(stmt, ast.SelectStmt):
        raise AssertionError()
    pfs_visit_ids = None
    if stmt.whereClause:
        pfs_visit_ids = query_pfs_visit_ids(stmt.whereClause)
    return VisitQuery(
        pfs_visit_ids=pfs_visit_ids,
        order=None,
    )


visit_note_user: M.obslog_user = aliased(M.obslog_user)  # type: ignore
visit_set_note_user: M.obslog_user = aliased(M.obslog_user)  # type: ignore
mcs_exposure_note_user: M.obslog_user = aliased(M.obslog_user)  # type: ignore
# M.sps_exposure: M.sps_exposure = aliased(M.sps_exposure)  # type: ignore


def query_pfs_visit_ids(where: ast.Evaluatable):
    ctx = VisitQueryContext()
    q = select(type_cast(Any, distinct(M.pfs_visit.pfs_visit_id))).\
        outerjoin(M.obslog_visit_note).\
        outerjoin(visit_note_user, M.obslog_visit_note.user).\
        outerjoin(M.sps_visit).\
        outerjoin(M.sps_exposure).\
        outerjoin(M.sps_annotation).\
        outerjoin(M.visit_set).\
        outerjoin(M.sps_sequence).\
        outerjoin(M.obslog_visit_set_note).\
        outerjoin(visit_set_note_user, M.obslog_visit_set_note.user).\
        outerjoin(M.mcs_exposure).\
        outerjoin(M.obslog_mcs_exposure_note).\
        outerjoin(mcs_exposure_note_user, M.obslog_mcs_exposure_note.user).\
        filter(where(ctx))  # type: ignore
    return q


AnyColumn: Final = Symbol('AnyColumn')


columns_for_search: Final = [
    cast(M.pfs_visit.pfs_visit_id, String),
    M.pfs_visit.pfs_visit_description,
    M.obslog_visit_note.body,
    visit_note_user.account_name,
    M.obslog_visit_set_note.body,
    visit_set_note_user.account_name,
    M.sps_sequence.name,
    M.sps_sequence.sequence_type,
    M.sps_sequence.status,
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
            (ast.String('sequence_type'),): M.sps_sequence.sequence_type,
            (ast.String('issued_at'),): M.pfs_visit.issued_at,
            (ast.String('is_sps_visit'),): M.sps_visit.pfs_visit_id != None,
            (ast.String('is_mcs_visit'),): M.mcs_exposure.mcs_frame_id != None,
        }
        if node.fields not in columns:
            raise ast.SqlError(f'Unknown column: {node.fields}')
        return columns[node.fields]

    def TypeCast(self, node: ast.TypeCast):
        if node.typeName.names == [ast.String('pg_catalog'), ast.String('bool')]:
            return node.arg == ast.A_Const('t')
        if node.typeName.names == [ast.String('date')]:
            return cast(node.arg(self), Date)
        raise ast.SqlError(f'Unknown type cast: {node}')

    def Equal(self, node: ast.Equal):
        l = node.lexpr(self)
        r = node.rexpr(self)
        if r == AnyColumn:
            l, r = r, l
        if l == AnyColumn:
            return or_(c == r for c in columns_for_search)  # type: ignore
        else:
            return l == r

    def NotEqual(self, node: ast.NotEqual):
        return ast.Not(ast.Equal(node.lexpr, node.rexpr))(self)

    def LessEqual(self, node: ast.LessEqual):
        return node.lexpr(self) <= node.rexpr(self)

    def Like(self, node: ast.Like):
        l = node.lexpr(self)
        r = node.rexpr(self)
        if not isinstance(r, str):
            raise ast.SqlError(f'Right operand for LIKE must be a string: {node.lexpr} LIKE {node.rexpr}')
        if l == AnyColumn:
            return or_(c.ilike(r) for c in columns_for_search)  # type: ignore
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
