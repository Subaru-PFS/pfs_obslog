# SQLライクなフィルタリング機能

## 概要

Visit一覧エンドポイント (`GET /api/visits`) では、`sql` パラメータでSQLライクなWHERE句を指定してVisitをフィルタリングできる。

この機能は「ユーザー入力SQLをそのままDBに投げる」のではなく、

- `pglast` で **WHERE句をASTにパース**
- **仮想カラムのホワイトリスト**に沿ってASTをSQLAlchemy式に変換
- WHERE句で必要になった **JOINだけを自動で付与**

というパイプラインで、アプリ側が安全に実クエリへ接続する。

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

## リクエストからDBクエリになるまで（実装に即した流れ）

実際のAPI処理は `backend/src/pfs_obslog/routers/visits.py` で行われる。

1. **`sql` 文字列をASTへ**
    - `parse_where_clause(sql)`（`visitquery/parser.py`）
    - 入力が `where ...` だけの場合、内部で `SELECT * where ...` に補完して `pglast.parse_sql()` に渡す
    - 返り値は `SelectStmt.whereClause`（WHERE句が無い場合は `None`）
2. **ASTをSQLAlchemy式へ**
    - `JoinBuilder(M)` を先に作り、`QueryEvaluator(M, join_builder)` を作る
    - `evaluator.evaluate(where_ast)` が SQLAlchemy の `ColumnElement`（WHERE条件）を返す
    - 同時に `evaluator.required_joins`（必要JOIN集合）と `evaluator.aggregate_conditions`（集約条件）を収集する
3. **必要なJOINだけを適用**
    - `join_builder.apply_joins(query, required_joins)`（`visitquery/joins.py`）
    - JOIN依存を解決してから、固定順序で `outerjoin()` を適用する（重複JOINや順序崩れを防ぐ）
4. **WHERE句を適用 + 重複排除**
    - JOINにより VisitID が重複し得るため、フィルタリング時は `DISTINCT` を入れる
5. **集約カラム条件を別フェーズで適用**
    - `sps_count >= 5` のような条件はサブクエリ集約として適用される（後述）

## 実装構造

```
backend/src/pfs_obslog/visitquery/
├── __init__.py       # パブリックAPI
├── parser.py         # pglastでのパース、構文検証
├── columns.py        # 仮想カラム定義
├── evaluator.py      # ASTをSQLAlchemy式に変換
└── joins.py          # JOIN最適化ロジック
```

加えて、実際のエンドポイント側で次の処理が行われる：

- `backend/src/pfs_obslog/routers/visits.py`：`sql` の受け取り、パース、JOIN適用、集約条件の適用

## 独自クエリー言語（仮想テーブル）からDBへ“つながる”ポイント

### 1) 仮想カラムのホワイトリスト（入口）

どの名前のカラムが使えるかは `visitquery/columns.py` の `VIRTUAL_COLUMNS` が唯一の正規入口。

- クエリ中の `ColumnRef`（例: `id`, `sequence_type`）は必ずこの辞書を引く
- 未定義のカラムは即エラー（`Unknown column: ...`）
- 各カラムは `required_joins` を持ち、**そのカラムが実体のどのテーブルに依存するか**を宣言する

例：

- `sequence_type` → `required_joins = {"visit_set", "iic_sequence"}`
- `visit_note_user` → `required_joins = {"obslog_visit_note", "visit_note_user"}`

### 2) AST → SQLAlchemy式（評価器）

`visitquery/evaluator.py` の `QueryEvaluator` が、pglast AST を SQLAlchemy 条件式へ変換する。

重要な仕様（実装由来）：

- **カラム参照（`ColumnRef`）**
    - `VIRTUAL_COLUMNS` を参照し、カラムが許可されているかを判定
    - `vcol.required_joins` を `self.required_joins` に加算（JOIN収集）
    - 通常カラムは `_column_map` で **実テーブルのカラム（またはエイリアス）に解決**される
- **計算カラム（例: `is_sps_visit`）**
    - `is_computed=True` のカラムは `_get_computed_column()` でSQLAlchemy式に展開される
    - 例：`is_sps_visit` は `sps_visit.pfs_visit_id IS NOT NULL` 相当の式
- **論理演算（AND/OR/NOT）**
    - AND は `and_(...)`、OR は `or_(...)`、NOT は `not_(...)` 相当
    - ただし NOT は、`NULL` を実用上 false 扱いに寄せるため `not_(inner) OR (inner IS NULL)` の形にしている
- **TIMESTAMP比較の型合わせ**
    - `issued_at >= '2024-06-01'` のように、timestampカラムと文字列比較になる場合
        SQLAlchemyが文字列をVARCHARとしてバインドして型エラーになりやすいので、
        文字列側を `DateTime` に `cast()` して比較する
- **型キャスト（`::date`, `::float`, `::int` など）**
    - `TypeCast` ノードとして解釈し、SQLAlchemyの `cast()` に変換

### 3) JOINの組み立て（必要最小限 + 依存解決）

`visitquery/joins.py` の `JoinBuilder` が JOIN を担う。

- `required_joins`（set）を受け取り、`JOIN_DEPENDENCIES` で依存（前提JOIN）を補完
    - 例：`iic_sequence_status` をJOINするには、`visit_set` と `iic_sequence` が前提
- `JOIN_ORDER` の固定順序で `outerjoin()` を適用
    - これにより「JOIN順序の揺れ」や「依存の欠落」を防ぐ
- 一部テーブルは `aliased()` を使う
    - ユーザー（`ObslogUser`）など同一テーブルを複数回JOINするケース
    - SQLAlchemyのテーブル重複警告回避（`IicSequenceStatus`, `SpsVisit` など）

## 集約カラム（COUNT/AVG）は “二段階” で効く

`sps_count >= 5` のような集約条件は、通常のWHERE句としては扱えない（JOINで増殖した行やGROUP BYが必要になるため）。
そこで実装では次の設計になっている：

1. `QueryEvaluator` は集約カラム参照を見つけると `AggregateColumnMarker` を返す
2. `sps_count >= 5` のような比較は `AggregateCondition` として `evaluator.aggregate_conditions` に蓄積し、
     **WHERE条件としては `None` を返す**
3. AND の場合は `None` をフィルタして残りの条件だけ通常WHEREに入れる
4. API側（`routers/visits.py`）で `_apply_aggregate_conditions()` が、
     `SELECT pfs_visit_id, COUNT(*) ... GROUP BY pfs_visit_id` のようなサブクエリを作って base_query にJOINし、条件を適用する

制約（実装が強制）：

- 集約カラムは `OR` の中では使用不可（評価時にエラー）
- 集約カラムは `NOT` の中では使用不可（評価時にエラー）

### COUNT と AVG の扱いの違い

- COUNT：0件も意味があるので、`LEFT JOIN + COALESCE(agg_value, 0)` で 0 を表現して比較
- AVG：0件は平均が定義できないので、`INNER JOIN` して `NULL` を除外

## 使用方法

```python
from pfs_obslog.visitquery import parse_where_clause, QueryEvaluator
from pfs_obslog import models

# 1. WHERE句をパース
where_ast = parse_where_clause("where id between 100 and 200")

# 2. SQLAlchemy式に変換（JoinBuilderを共有してエイリアスを一貫させる）
from pfs_obslog.visitquery.joins import JoinBuilder
join_builder = JoinBuilder(models)
evaluator = QueryEvaluator(models, join_builder)
condition = evaluator.evaluate(where_ast)

# 3. 必要なJOINを取得
required_joins = evaluator.required_joins

query = select(models.PfsVisit)
query = join_builder.apply_joins(query, required_joins)
query = query.where(condition)
```

※ API内の実装では、エイリアスの整合性のため `JoinBuilder` は `QueryEvaluator` と同じインスタンスを共有する。

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

注意：次の機能は「パースはできる」が、現状APIでは性能上の理由で無効化されている。

- `any_column`：評価時にエラー（特定カラムを指定して検索してほしい）
- `fits_header['KEY']` のJSONB/配列アクセス：評価時にエラー（将来再有効化の可能性あり）

また、`validate_expression()` は関数ホワイトリスト等を提供しているが、現状の `/api/visits` では呼ばれていない。
関数呼び出し（`lower(status)` 等）も、評価器が `FuncCall` を実装していないため現状は利用できない。

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
| `fits_header` | `obslog_fits_header.cards_dict` | FITSヘッダー（JSONB、現状APIでは無効化） |
| `proposal_id` | `pfs_design_fiber.proposal_id` | プロポーザルID |
| `any_column` | 複数カラムのOR | テキスト検索用（現状APIでは無効化） |

### JOIN最適化

`JoinBuilder` クラスがWHERE句で使用されるカラムに基づいて必要なJOINのみを追加する：

```python
# 例: "where visit_note like '%test%'" の場合
# obslog_visit_noteテーブルのみJOIN

# 例: "where sequence_type like '%domeflat%'" の場合
# visit_set, iic_sequence をJOIN（依存を自動解決）
```

## セキュリティ考慮事項

### SQLインジェクション対策

1. **ホワイトリスト方式**: 使用可能なカラムを `VIRTUAL_COLUMNS` で制限
2. **パラメータ化**: SQLAlchemyのパラメータバインディングを使用
3. **禁止構文**: （必要なら）サブクエリ等を `validate_expression()` で検出可能

```python
from pfs_obslog.visitquery.parser import validate_expression

ast = parse_where_clause(user_input)
validate_expression(ast)  # 危険な構文があれば例外
```

注：現在の `/api/visits` は `validate_expression()` を呼んでいないため、
「禁止構文の検出」は主に `QueryEvaluator` の未対応ノード検出（Unsupported node type）と
`VIRTUAL_COLUMNS` によるホワイトリストで担保されている。

### 許可される関数

セキュリティのため、使用できる関数は以下に制限：

- `date` - 日付変換
- `lower`, `upper` - 大文字小文字変換
- `trim` - 空白除去
- `coalesce` - NULL置換

（ただし現状は評価器側が関数呼び出しを実装していないため、APIでは利用できない）

## テスト

```bash
cd backend
uv run pytest tests/test_visitquery.py -v
```

## 参考リンク

- [pglast GitHub](https://github.com/lelit/pglast)
- [pglast Documentation](https://pglast.readthedocs.io/)
- [libpg_query](https://github.com/pganalyze/libpg_query)
