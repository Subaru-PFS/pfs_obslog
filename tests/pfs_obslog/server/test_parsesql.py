import datetime
from typing import Type, Union
from pfs_obslog.server.parsesql import parse, ast
import pytest


@pytest.fixture
def ctx():
    return TestContext()


def test_A_Const(ctx):
    s = parse('''SELECT 1.5, 'hello world', -1''')[0]
    assert isinstance(s, ast.SelectStmt)
    assert s.targetList[0].val(ctx) == 1.5
    assert s.targetList[1].val(ctx) == 'hello world'
    assert s.targetList[2].val(ctx) == -1


def test_where(ctx):
    s = parse('''SELECT * WHERE 1''')[0]
    assert isinstance(s, ast.SelectStmt)
    assert s.whereClause(ctx) == 1


def test_no_where():
    s = parse('''SELECT *''')[0]
    assert isinstance(s, ast.SelectStmt)
    assert s.whereClause is None


def test_target_list(ctx):
    s = parse('''SELECT t.f as "a"''')[0]
    assert isinstance(s, ast.SelectStmt)
    assert s.targetList[0].val(ctx) == (ast.String('t'), ast.String('f'))
    assert s.targetList[0].name == 'a'


def test_a_star():
    assert sqleval('x.*') == (ast.String('x'), ast.A_Star())


@pytest.mark.focus
def test_binary_operators():
    assert sqleval('x = x')
    assert sqleval('x = y') is False
    assert sqleval('x != x') is False
    assert sqleval('x != y')
    assert sqleval('x <= y') == ('LESSEQUAL', (ast.String('x'),), ((ast.String('y'),)))


def test_boolean_operators():
    assert sqleval('x and y and z') == ('AND', (ast.String('x'),), (ast.String('y'),), (ast.String('z'), ))
    assert sqleval('x or y') == ('OR', (ast.String('x'),), (ast.String('y'),))
    assert sqleval('a or (not b) and c and d') == ('OR',
                                                   (ast.String('a'),),
                                                   ('AND',
                                                       ('NOT', (ast.String('b'),)),
                                                       (ast.String('c'),),
                                                       (ast.String('d'),),
                                                    )
                                                   )


def test_like():
    assert sqleval('x LIKE y') == ('LIKE', (ast.String('x'), ), (ast.String('y'), ))
    assert sqleval('x NOT LIKE y') == ('NOTLIKE', (ast.String('x'), ), (ast.String('y'), ))
    assert sqleval('NOT x LIKE y') == ('NOT', ('LIKE', (ast.String('x'), ), (ast.String('y'), )))


def test_unary_operators():
    assert sqleval('- "$one"') == -1


@pytest.mark.focus
def test_type_cast():
    assert sqleval('true') is True
    assert sqleval('false') is False
    assert sqleval(""" date '2020-01-01' """) == datetime.date.fromisoformat('2020-01-01')


def test_not():
    assert sqleval('not true') == ('NOT', True)
    assert sqleval('not false') == ('NOT', False)


class TestContext(ast.EvaluationContext):
    def A_Const(self, node: ast.A_Const):
        return node.value

    def ColumnRef(self, node: ast.ColumnRef):
        m: dict[tuple[Union[ast.String, ast.A_Star]], int] = {
            (ast.String('$one'),): 1,
        }
        return m.get(node.fields) or node.fields

    def TypeCast(self, node: ast.TypeCast):
        if node.typeName.names == [ast.String('pg_catalog'), ast.String('bool')]:
            return node.arg == ast.A_Const('t')
        if node.typeName.names == [ast.String('date')]:
            return datetime.date.fromisoformat(node.arg(self))
        raise ast.SqlError(f'Unknown type cast: {node}')

    def Equal(self, node: ast.Equal):
        return node.lexpr(self) == node.rexpr(self)

    def NotEqual(self, node: ast.NotEqual):
        return node.lexpr(self) != node.rexpr(self)

    def Like(self, node: ast.NotEqual):
        return ('LIKE', node.lexpr(self), node.rexpr(self))

    def NotLike(self, node: ast.NotEqual):
        return ('NOTLIKE', node.lexpr(self), node.rexpr(self))

    def LessEqual(self, node: ast.LessEqual):
        return ('LESSEQUAL', node.lexpr(self), node.rexpr(self))

    def UnaryMinus(self, node: ast.UnaryMinus):
        return - node.rexpr(self)

    def And(self, node: ast.And):
        return ('AND', *[a(self) for a in node.args])

    def Or(self, node: ast.Or):
        return ('OR', *[a(self) for a in node.args])

    def Not(self, node: ast.Not):
        return ('NOT', node.value(self))


def sqleval(sql: str, Context: Type[ast.EvaluationContext] = TestContext) -> ast.Evaluatable:
    ctx = Context()
    s = parse(f'''SELECT {sql} ''')[0]
    assert isinstance(s, ast.SelectStmt)
    return s.targetList[0].val(ctx)
