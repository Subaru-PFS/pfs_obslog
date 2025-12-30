# SQLライクなフィルタリング機能の実装検討

## 概要

Visit一覧エンドポイント (`GET /api/visits`) では、`sql` パラメータでSQLライクなWHERE句を指定してVisitをフィルタリングできる。この機能の実装方法を検討する。

## 既存実装の分析

### アーキテクチャ

既存プロジェクトでは以下の構成でフィルタリングを実装している：

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ SQLパラメータ    │ --> │ psqlparse        │ --> │ 独自AST           │
│ (WHERE句)       │     │ (PostgreSQL      │     │ (parsesql/ast.py) │
│                 │     │  パーサー)        │     │                   │
└─────────────────┘     └──────────────────┘     └─────────┬─────────┘
                                                          │
                                                          v
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ SQLAlchemy      │ <-- │ EvaluationContext│ <-- │ evaluate_where_   │
│ WHERE句         │     │ (visitquery.py)  │     │ clause()          │
└─────────────────┘     └──────────────────┘     └───────────────────┘
```

### 処理の流れ

1. **入力**: `select * where <条件>`形式の文字列
2. **パース**: `psqlparse` でPostgreSQL互換の構文解析
3. **AST変換**: 独自の `ast.py` で内部AST表現に変換
4. **依存分析**: WHERE句で使用されるカラムを分析し、必要なJOINを特定
5. **評価**: `VisitQueryContext` でASTをSQLAlchemy式に変換
6. **実行**: 生成されたSQLAlchemy式をDBクエリに適用

### サポートされる構文

| 構文 | 例 |
|------|---|
| 比較演算子 | `id = 3`, `id >= 100`, `id <> 5` |
| LIKE | `sequence_type LIKE '%domeflat%'` |
| NOT LIKE | `visit_note NOT LIKE '%test%'` |
| BETWEEN | `id BETWEEN 0 AND 100` |
| 論理演算子 | `is_sps_visit AND id > 100`, `a OR b` |
| NOT | `NOT is_mcs_visit` |
| IS NULL | `status IS NULL` |
| 型キャスト | `issued_at::date = '2021-01-03'` |
| 配列アクセス | `fits_header['OBSERVER'] LIKE '%Tamura%'` |

### 仮想カラム一覧

| カラム名 | マッピング先 | 説明 |
|----------|-------------|------|
| `visit_id`, `id` | `pfs_visit.pfs_visit_id` | Visit ID |
| `issued_at` | `pfs_visit.issued_at` | 発行日時 |
| `sequence_type` | `iic_sequence.sequence_type` | シーケンスタイプ |
| `comments` | `iic_sequence.comments` | コメント |
| `visit_note` | `obslog_visit_note.body` | Visitメモ |
| `visit_note_user` | `obslog_user.account_name` | Visitメモ作成者 |
| `visit_set_note` | `obslog_visit_set_note.body` | シーケンスメモ |
| `visit_set_note_user` | `obslog_user.account_name` | シーケンスメモ作成者 |
| `status` | `iic_sequence_status.cmd_output` | ステータス |
| `is_sps_visit` | 計算カラム | SpS露出があるか |
| `is_mcs_visit` | 計算カラム | MCS露出があるか |
| `is_agc_visit` | 計算カラム | AGC露出があるか |
| `visit_set_id` | `iic_sequence.iic_sequence_id` | シーケンスID |
| `sequence_group_id` | `sequence_group.group_id` | グループID |
| `sequence_group_name` | `sequence_group.group_name` | グループ名 |
| `fits_header` | `obslog_fits_header.cards_dict` | FITSヘッダー（JSONB） |
| `proposal_id` | `pfs_design_fiber.proposal_id` | プロポーザルID |
| `any_column` | 複数カラムのOR | テキスト検索用 |

### JOIN最適化

`RequiredJoins` クラスがWHERE句を分析し、使用されるカラムに基づいて必要なJOINのみを追加する：

```python
# 例: "where visit_note like '%test%'" の場合
# obslog_visit_noteテーブルのみJOIN

# 例: "where any_column like '%test%'" の場合
# 複数のテーブルをJOIN（全文検索対象のすべてのテーブル）
```

## 実装選択肢

### 選択肢1: psqlparse + 独自AST（既存方式を踏襲）

**方式**: PostgreSQLパーサーを使用し、独自ASTで評価

**利点**:
- 既存コードがほぼそのまま使える
- PostgreSQL完全互換の構文
- 実績のある実装

**欠点**:
- `psqlparse` は2016年が最終更新で古い
- 独自ASTの保守コスト
- 必要な演算子のみ個別実装が必要

**依存パッケージ**: `psqlparse==0.2.5`

### 選択肢2: sqlglot（モダンなSQLパーサー）

**方式**: `sqlglot` でAST生成、SQLAlchemyに変換

**利点**:
- アクティブにメンテナンスされている（v28.5.0）
- 複数のSQL方言をサポート
- 豊富なAST操作API
- SQL → SQL変換機能でデバッグしやすい

**欠点**:
- 既存実装からの移行コストが発生
- 新しいAST構造への適応が必要
- 完全互換でない可能性

**依存パッケージ**: `sqlglot>=28.0.0`

**実装イメージ**:
```python
import sqlglot
from sqlglot import exp

def parse_where(sql: str) -> exp.Expression:
    ast = sqlglot.parse_one(f"SELECT * FROM visits WHERE {sql}")
    return ast.find(exp.Where).this

def to_sqlalchemy(expr: exp.Expression, ctx: EvalContext):
    if isinstance(expr, exp.EQ):
        return to_sqlalchemy(expr.left, ctx) == to_sqlalchemy(expr.right, ctx)
    elif isinstance(expr, exp.Column):
        return ctx.column_map[expr.name]
    # ...
```

### 選択肢3: pglast（PostgreSQL公式パーサーのPythonバインディング）

**方式**: libpg_queryを使用した正確なPostgreSQLパース

**利点**:
- PostgreSQL公式パーサーと完全互換
- アクティブにメンテナンス（v7.11）
- 正確な構文エラーメッセージ

**欠点**:
- libpg_queryのコンパイルが必要（インストールが複雑な場合あり）
- PostgreSQL特有の構文のみ
- 既存実装からの移行が必要

**依存パッケージ**: `pglast>=7.0`

### 選択肢4: シンプルなカスタムパーサー

**方式**: 限定的な構文のみを独自実装

**利点**:
- 完全にコントロール可能
- 外部依存なし
- 必要な機能のみ実装

**欠点**:
- 開発コストが高い
- SQLの複雑な構文（括弧のネスト等）の対応が困難
- バグのリスク

## 推奨アプローチ

### 第一推奨: sqlglot を採用

**理由**:
1. **メンテナンス性**: アクティブに開発されており、長期的なサポートが期待できる
2. **柔軟性**: 将来的に構文拡張が必要な場合も対応しやすい
3. **モダンなAPI**: Python 3.13との相性が良い
4. **移行コスト**: 既存のASTパターンと概念的に近いため移行しやすい

### 実装計画

```
pfs_obslog/
├── visitquery/
│   ├── __init__.py
│   ├── parser.py         # sqlglotでのパース処理
│   ├── evaluator.py      # SQLAlchemyへの変換
│   ├── columns.py        # 仮想カラム定義
│   └── joins.py          # JOIN最適化ロジック
```

#### 1. parser.py

```python
"""SQLライクなWHERE句のパーサー"""
import sqlglot
from sqlglot import exp
from sqlglot.errors import ParseError

class QueryParseError(ValueError):
    """クエリのパースエラー"""
    pass

def parse_where_clause(sql: str) -> exp.Expression | None:
    """
    WHERE句をパースしてASTを返す
    
    Args:
        sql: "where <条件>" または "select * where <条件>" 形式の文字列
        
    Returns:
        WHERE句のAST（WHERE句がない場合はNone）
        
    Raises:
        QueryParseError: パースに失敗した場合
    """
    # "where ..." のみの場合は補完
    if not sql.strip().lower().startswith("select"):
        sql = f"SELECT * {sql}"
    
    try:
        ast = sqlglot.parse_one(sql, dialect="postgres")
    except ParseError as e:
        raise QueryParseError(str(e)) from e
    
    where = ast.find(exp.Where)
    return where.this if where else None
```

#### 2. columns.py

```python
"""仮想カラムの定義"""
from dataclasses import dataclass
from typing import Callable
from sqlalchemy import Column
from pfs_obslog import models as M

@dataclass
class VirtualColumn:
    """仮想カラムの定義"""
    name: str
    sqlalchemy_column: Column | Callable[[], Column]
    required_joins: set[str]
    description: str

# カラム定義
VIRTUAL_COLUMNS: dict[str, VirtualColumn] = {
    "visit_id": VirtualColumn(
        name="visit_id",
        sqlalchemy_column=M.PfsVisit.pfs_visit_id,
        required_joins=set(),
        description="Visit ID",
    ),
    "id": VirtualColumn(
        name="id", 
        sqlalchemy_column=M.PfsVisit.pfs_visit_id,
        required_joins=set(),
        description="Visit ID (alias)",
    ),
    "sequence_type": VirtualColumn(
        name="sequence_type",
        sqlalchemy_column=M.IicSequence.sequence_type,
        required_joins={"iic_sequence"},
        description="シーケンスタイプ",
    ),
    # ... 他のカラム定義
}
```

#### 3. evaluator.py

```python
"""ASTをSQLAlchemy式に変換"""
from sqlglot import exp
from sqlalchemy import and_, or_, not_
from sqlalchemy.orm import Query

from .columns import VIRTUAL_COLUMNS

class QueryEvaluator:
    """sqlglot ASTをSQLAlchemyクエリに変換"""
    
    def __init__(self):
        self.required_joins: set[str] = set()
    
    def evaluate(self, expr: exp.Expression):
        """ASTノードをSQLAlchemy式に変換"""
        method = getattr(self, f"eval_{type(expr).__name__}", None)
        if method is None:
            raise QueryParseError(f"Unsupported expression: {type(expr).__name__}")
        return method(expr)
    
    def eval_Column(self, expr: exp.Column):
        col_name = expr.name.lower()
        if col_name not in VIRTUAL_COLUMNS:
            raise QueryParseError(f"Unknown column: {col_name}")
        
        vcol = VIRTUAL_COLUMNS[col_name]
        self.required_joins.update(vcol.required_joins)
        return vcol.sqlalchemy_column
    
    def eval_EQ(self, expr: exp.EQ):
        return self.evaluate(expr.left) == self.evaluate(expr.right)
    
    def eval_Like(self, expr: exp.Like):
        return self.evaluate(expr.this).ilike(self.evaluate(expr.expression))
    
    def eval_And(self, expr: exp.And):
        return and_(self.evaluate(expr.left), self.evaluate(expr.right))
    
    def eval_Or(self, expr: exp.Or):
        return or_(self.evaluate(expr.left), self.evaluate(expr.right))
    
    def eval_Literal(self, expr: exp.Literal):
        if expr.is_string:
            return expr.this
        elif expr.is_int:
            return int(expr.this)
        elif expr.is_number:
            return float(expr.this)
        return expr.this
    
    # ... 他の演算子の実装
```

#### 4. joins.py

```python
"""JOIN最適化ロジック"""
from sqlalchemy.orm import Query
from pfs_obslog import models as M

JOIN_DEFINITIONS = {
    "iic_sequence": lambda q: q.outerjoin(M.IicSequence),
    "visit_set": lambda q: q.outerjoin(M.VisitSet),
    "obslog_visit_note": lambda q: q.outerjoin(M.ObslogVisitNote),
    # ... 他のJOIN定義
}

def apply_joins(query: Query, required_joins: set[str]) -> Query:
    """必要なJOINのみをクエリに適用"""
    # JOINの依存関係順に適用
    join_order = [
        "obslog_visit_note",
        "visit_set", 
        "iic_sequence",
        "iic_sequence_status",
        # ...
    ]
    
    for join_name in join_order:
        if join_name in required_joins:
            query = JOIN_DEFINITIONS[join_name](query)
    
    return query
```

## セキュリティ考慮事項

### SQLインジェクション対策

1. **ホワイトリスト方式**: 使用可能なカラムをホワイトリストで制限
2. **パラメータ化**: SQLAlchemyのパラメータバインディングを使用
3. **禁止構文**: サブクエリ、UNION、関数呼び出し等を禁止

```python
def validate_expression(expr: exp.Expression) -> None:
    """危険な構文がないかチェック"""
    forbidden_types = (exp.Subquery, exp.Union, exp.Insert, exp.Update, exp.Delete)
    for node in expr.walk():
        if isinstance(node, forbidden_types):
            raise QueryParseError(f"Forbidden expression: {type(node).__name__}")
```

### 実行時間制限

複雑なクエリによるDoS攻撃を防ぐため：

```python
from sqlalchemy import text

# クエリタイムアウトを設定
async def execute_with_timeout(session, query, timeout_ms=30000):
    await session.execute(text(f"SET statement_timeout = {timeout_ms}"))
    try:
        return await session.execute(query)
    finally:
        await session.execute(text("SET statement_timeout = 0"))
```

## テスト戦略

```python
# tests/test_visitquery.py

import pytest
from pfs_obslog.visitquery import parse_where_clause, QueryEvaluator

class TestParseWhereClause:
    def test_simple_equality(self):
        ast = parse_where_clause("where id = 100")
        assert ast is not None
    
    def test_like_pattern(self):
        ast = parse_where_clause("where sequence_type like '%domeflat%'")
        assert ast is not None
    
    def test_complex_condition(self):
        ast = parse_where_clause(
            "where is_sps_visit and id between 100 and 200"
        )
        assert ast is not None
    
    def test_invalid_syntax(self):
        with pytest.raises(QueryParseError):
            parse_where_clause("where invalid syntax here")

class TestQueryEvaluator:
    def test_unknown_column_raises_error(self):
        evaluator = QueryEvaluator()
        ast = parse_where_clause("where unknown_column = 1")
        with pytest.raises(QueryParseError, match="Unknown column"):
            evaluator.evaluate(ast)
    
    def test_required_joins_collected(self):
        evaluator = QueryEvaluator()
        ast = parse_where_clause("where sequence_type = 'test'")
        evaluator.evaluate(ast)
        assert "iic_sequence" in evaluator.required_joins
```

## マイグレーション計画

### Phase 1: 基本機能の実装

1. `sqlglot` を `pyproject.toml` に追加
2. 基本的なパーサーと評価器を実装
3. 既存クエリ例でテスト

### Phase 2: 既存機能の完全移植

1. すべての仮想カラムを実装
2. `any_column` の全文検索機能を実装
3. `fits_header` アクセスを実装
4. JOIN最適化を実装

### Phase 3: テストとドキュメント

1. 既存テストケースの移植
2. 新しいエッジケースのテスト追加
3. API ドキュメントの更新
4. フロントエンドのヘルプページ更新

## 参考リンク

- [sqlglot GitHub](https://github.com/tobymao/sqlglot)
- [sqlglot Documentation](https://sqlglot.com/)
- [psqlparse (既存で使用)](https://github.com/alculquicondor/psqlparse)
- [pglast](https://github.com/lelit/pglast)
