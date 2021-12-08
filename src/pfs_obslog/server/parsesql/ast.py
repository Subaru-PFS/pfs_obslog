from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Tuple, Union

from pfs_obslog.server.env import safe_breakpoint

node_factories = {}


def node_factory(name: str):
    def f(g):
        node_factories[name] = g
    return f


class SqlError(ValueError): pass


class Evaluatable:
    def evaluate(self, ctx: 'EvaluationContext'):
        return getattr(ctx, self.__class__.__name__)(self)

    def __call__(self, ctx: 'EvaluationContext'):
        return self.evaluate(ctx)


@dataclass
class A_Const(Evaluatable):
    value: Union[int, float, str]


@node_factory('A_Const')
def _A_Const(args):
    obj = args['val']
    t, a = _first(obj)
    if t == 'Integer':
        return A_Const(a['ival'])
    elif t == 'Float':
        return A_Const(float(a['str']))
    elif t == 'String':
        return A_Const(a['str'])
    raise SqlError(f'Unknown A_Const type: {t}')  # pragma: no cover


@dataclass(eq=True, frozen=True)
class String(Evaluatable):
    str: str


@node_factory('String')
def _String(args):
    return String(str=args['str'])


@dataclass(eq=True, frozen=True)
class A_Star(Evaluatable):
    pass


@node_factory('A_Star')
def _A_Star(args):
    return A_Star()


@dataclass
class ColumnRef(Evaluatable):
    fields: tuple[Union[String, A_Star]]


@node_factory('ColumnRef')
def _ColumnRef(args):
    return ColumnRef(fields=tuple(build_ast(f) for f in args['fields']))  # type: ignore


@dataclass
class TypeName(Evaluatable):
    names: list[String]
    typemod: int


@node_factory('TypeName')
def _TypeName(args):
    assert args['typemod'] == -1
    return TypeName(
        names=build_ast_list(args['names']),
        typemod=args['typemod'])


@dataclass
class TypeCast(Evaluatable):
    arg: Evaluatable
    typeName: TypeName


@node_factory('TypeCast')
def _TypeCast(args):
    return TypeCast(
        arg=build_ast(args['arg']),
        typeName=build_ast(args['typeName']))


@dataclass
class NullTest(Evaluatable):
    arg: Evaluatable


@node_factory('NullTest')
def _NullTest(args):
    return NullTest(arg=build_ast(args['arg']))


@dataclass
class BinaryOperator(Evaluatable):
    lexpr: Evaluatable
    rexpr: Evaluatable


@dataclass
class Equal(BinaryOperator):
    pass


@dataclass
class NotEqual(BinaryOperator):
    pass


@dataclass
class UnaryMinus(Evaluatable):
    rexpr: Evaluatable


@dataclass
class Like(BinaryOperator):
    pass


@dataclass
class NotLike(BinaryOperator):
    pass


@dataclass
class LessEqual(BinaryOperator):
    pass


@dataclass
class LessThan(BinaryOperator):
    pass


@dataclass
class GreaterEqual(BinaryOperator):
    pass


@dataclass
class GreaterThan(BinaryOperator):
    pass


@node_factory('A_Expr')
def _A_Expr(args):
    kind = args['kind']
    name = build_ast_list(args['name'])
    if name == [String('=')]:
        assert kind == 0
        return Equal(
            build_ast(args['lexpr']),
            build_ast(args['rexpr']))
    elif name == [String('<>')]:
        assert kind == 0
        return NotEqual(
            build_ast(args['lexpr']),
            build_ast(args['rexpr']))
    elif name == [String('-')]:
        assert kind == 0
        return UnaryMinus(rexpr=build_ast(args['rexpr']))
    elif name == [String('<=')]:
        assert kind == 0
        return LessEqual(
            build_ast(args['lexpr']),
            build_ast(args['rexpr']))
    elif name == [String('<')]:
        assert kind == 0
        return LessThan(
            build_ast(args['lexpr']),
            build_ast(args['rexpr']))
    elif name == [String('>=')]:
        assert kind == 0
        return GreaterEqual(
            build_ast(args['lexpr']),
            build_ast(args['rexpr']))
    elif name == [String('>')]:
        assert kind == 0
        return GreaterThan(
            build_ast(args['lexpr']),
            build_ast(args['rexpr']))
    elif name == [String('~~')]:
        assert kind == 7
        return Like(
            lexpr=build_ast(args['lexpr']),
            rexpr=build_ast(args['rexpr']))
    elif name == [String('!~~')]:
        assert kind == 7
        return NotLike(
            lexpr=build_ast(args['lexpr']),
            rexpr=build_ast(args['rexpr']))
    elif name == [String('BETWEEN')]:
        assert kind == 10
        return Between(
            lexpr=build_ast(args['lexpr']),
            rexpr=(build_ast(args['rexpr'][0]), build_ast(args['rexpr'][1])),
        )
    else:  # pragma: no cover
        safe_breakpoint()
        raise SqlError(f'Unknown A_Expr name: {name}')


@dataclass
class Not(Evaluatable):
    value: Evaluatable


@dataclass
class And(Evaluatable):
    args: list[Evaluatable]


@dataclass
class Or(Evaluatable):
    args: list[Evaluatable]


@dataclass
class Between(Evaluatable):
    lexpr: Evaluatable
    rexpr: tuple[Evaluatable, Evaluatable]


@node_factory('BoolExpr')
def _BoolExpr(args):
    boolop = args['boolop']
    if boolop == 0:  # AND
        assert len(args['args']) >= 2
        return And(build_ast_list(args['args']))
    if boolop == 1:  # OR
        assert len(args['args']) >= 2
        return Or(build_ast_list(args['args']))
    elif boolop == 2:  # NOT
        return Not(build_ast(args['args'][0]))
    else:  # pragma: no cover
        safe_breakpoint()
        raise SqlError(f'Unknown boolop {boolop}')


@dataclass
class A_Indirection(Evaluatable):
    arg: ColumnRef
    indirection: list[Union['A_Indices', String]]


@node_factory('A_Indirection')
def _A_Indirection(args):
    return A_Indirection(
        arg=build_ast(args['arg']),
        indirection=build_ast_list(args['indirection']),
    )


@dataclass
class A_Indices(Evaluatable):
    uidx: A_Const


@node_factory('A_Indices')
def _A_Indices(args):
    return A_Indices(
        uidx=build_ast(args['uidx']),
    )


def _first(obj):
    assert isinstance(obj, dict)
    assert len(obj) == 1
    return next(iter(obj.items()))


@dataclass
class ResTarget:
    name: Optional[str]
    val: Evaluatable


@node_factory('ResTarget')
def _ResTarget(args):
    return ResTarget(val=build_ast(args['val']), name=args.get('name'))


@dataclass
class SelectStmt:
    whereClause: Optional[Evaluatable]
    targetList: list[ResTarget]


@node_factory('SelectStmt')
def _SelectStmt(args):
    return SelectStmt(
        whereClause=try_build_ast(args.get('whereClause')),
        targetList=build_ast_list(args['targetList']),
    )


def try_build_ast(obj: Optional[dict[str, dict]]):
    if obj is not None:
        return build_ast(obj)


def build_ast_list(objl: list):
    return [build_ast(obj) for obj in objl]


def build_ast(obj: dict[str, dict]):
    assert isinstance(obj, dict)
    assert len(obj) == 1
    factory_name = next(iter(obj.keys()))
    return build_ast0(factory_name, obj[factory_name])


def build_ast0(factory_name: str, args: dict[str, dict]):
    if factory_name not in node_factories:  # pragma: no cover
        safe_breakpoint()
        raise SqlError(f'Unknown node type: {factory_name}')
    return node_factories[factory_name](args)


class EvaluationContext(ABC):  # pragma: no cover
    @abstractmethod
    def A_Const(self, node: A_Const):
        ...

    @abstractmethod
    def ColumnRef(self, node: ColumnRef):
        ...

    @abstractmethod
    def TypeCast(self, node: TypeCast):
        ...

    @abstractmethod
    def Equal(self, node: Equal):
        ...

    @abstractmethod
    def NotEqual(self, node: NotEqual):
        ...

    @abstractmethod
    def LessEqual(self, node: LessEqual):
        ...

    @abstractmethod
    def LessThan(self, node: LessThan):
        ...

    @abstractmethod
    def GreaterEqual(self, node: GreaterEqual):
        ...

    @abstractmethod
    def GreaterThan(self, node: GreaterThan):
        ...

    @abstractmethod
    def Like(self, node: Like):
        ...

    @abstractmethod
    def NotLike(self, node: NotLike):
        ...

    @abstractmethod
    def UnaryMinus(self, node: UnaryMinus):
        ...

    @abstractmethod
    def And(self, node: And):
        ...

    @abstractmethod
    def Or(self, node: Or):
        ...

    @abstractmethod
    def Not(self, node: Not):
        ...

    @abstractmethod
    def Between(self, node: Between):
        ...
