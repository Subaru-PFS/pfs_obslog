# SQLライクなフィルタリング機能

## 概要

Visit一覧エンドポイント (`GET /api/visits`) では、`sql` パラメータでSQLライクなWHERE句を指定してVisitをフィルタリングできる。

## 採用したアプローチ: pglast

**pglast** (PostgreSQL Languages AST) を採用した。

### 選定理由

1. **PostgreSQL公式パーサーと完全互換**: libpg_queryベースで構文解析の正確性が保証される
2. **アクティブなメンテナンス**: v7.11（2024年現在も更新中）
3. **簡単なインストール**: `uv add pglast` でインストール可能（wheelが提供されている）
4. **正確なエラーメッセージ**: PostgreSQLと同じエラーメッセージを出力

### 他の選択肢との比較

| ライブラリ | メリット | デメリット |
|-----------|---------|-----------|
| **pglast (採用)** | PostgreSQL完全互換、正確なエラー | PostgreSQL構文のみ |
| psqlparse | 既存で使用実績あり | 2016年最終更新、古い |
| sqlglot | 複数SQL方言対応 | PostgreSQL固有機能に弱い |

## アーキテクチャ

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ SQLパラメータ    │ --> │ pglast           │ --> │ pglast AST        │
│ (WHERE句)       │     │ (libpg_query)    │     │                   │
└─────────────────┘     └──────────────────┘     └─────────┬─────────┘
                                                          │
                                                          v
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ SQLAlchemy      │ <-- │ QueryEvaluator   │ <-- │ カラム/JOIN解決    │
│ WHERE句         │     │                  │     │                   │
└─────────────────┘     └──────────────────┘     └───────────────────┘
```

## 実装構造

```
backend/src/pfs_obslog/visitquery/
├── __init__.py       # パブリックAPI
├── parser.py         # pglastでのパース、構文検証
├── columns.py        # 仮想カラム定義
├── evaluator.py      # ASTをSQLAlchemy式に変換
└── joins.py          # JOIN最適化ロジック
```

## 使用方法

```python
from pfs_obslog.visitquery import parse_where_clause, QueryEvaluator
from pfs_obslog import models

# 1. WHERE句をパース
where_ast = parse_where_clause("where id between 100 and 200")

# 2. SQLAlchemy式に変換
evaluator = QueryEvaluator(models)
condition = evaluator.evaluate(where_ast)

# 3. 必要なJOINを取得
required_joins = evaluator.required_joins

# 4. クエリに適用
from pfs_obslog.visitquery.joins import JoinBuilder
builder = JoinBuilder(models)
query = select(models.PfsVisit)
query = builder.apply_joins(query, required_joins)
query = query.where(condition)
```

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

`JoinBuilder` クラスがWHERE句で使用されるカラムに基づいて必要なJOINのみを追加する：

```python
# 例: "where visit_note like '%test%'" の場合
# obslog_visit_noteテーブルのみJOIN

# 例: "where any_column like '%test%'" の場合
# 複数のテーブルをJOIN（全文検索対象のすべてのテーブル）
```

## セキュリティ考慮事項

### SQLインジェクション対策

1. **ホワイトリスト方式**: 使用可能なカラムを `VIRTUAL_COLUMNS` で制限
2. **パラメータ化**: SQLAlchemyのパラメータバインディングを使用
3. **禁止構文**: サブクエリ、INSERT/UPDATE/DELETE等を `validate_expression()` で検出

```python
from pfs_obslog.visitquery.parser import validate_expression

ast = parse_where_clause(user_input)
validate_expression(ast)  # 危険な構文があれば例外
```

### 許可される関数

セキュリティのため、使用できる関数は以下に制限：

- `date` - 日付変換
- `lower`, `upper` - 大文字小文字変換
- `trim` - 空白除去
- `coalesce` - NULL置換

## テスト

```bash
cd backend
uv run pytest tests/test_visitquery.py -v
```

## 参考リンク

- [pglast GitHub](https://github.com/lelit/pglast)
- [pglast Documentation](https://pglast.readthedocs.io/)
- [libpg_query](https://github.com/pganalyze/libpg_query)
