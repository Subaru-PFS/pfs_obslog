# フィルター言語仕様

このドキュメントでは、Visit一覧のフィルタリングで使用可能な仮想テーブル・仮想カラムの仕様を定義します。

> **重要**: このドキュメントは `backend/src/pfs_obslog/visitquery/` 配下のコードと同期して更新する必要があります。

## 概要

Visit一覧エンドポイント (`GET /api/visits`) では、`sql` パラメータでSQLライクなWHERE句を指定してフィルタリングできます。
このフィルタリング機能は仮想テーブル `visits` に対してクエリを実行するイメージで設計されています。

```sql
-- 例: Visit ID が 100〜200 の範囲で、SpS露出があるもの
WHERE id BETWEEN 100 AND 200 AND is_sps_visit
```

## 現状の実装との差分（重要）

このドキュメントは「仕様」として書かれているが、2026-01-08 時点の `/api/visits` 実装には次の差分がある。

- `any_column`：コード側では仮想カラムとして定義されているが、性能上の理由で評価時にエラーになり使用できない
- `fits_header['KEY']`：構文としてはパースされ得るが、性能上の理由で評価時にエラーになり使用できない
- 関数呼び出し（`lower(...)` 等）：仕様では「許可される関数」を列挙しているが、評価器が `FuncCall` を実装しておらず現状は使用できない
- `validate_expression()`：仕様上のセキュリティ制約（関数ホワイトリスト、サブクエリ禁止など）の検出器は存在するが、現状の `/api/visits` は呼び出していない
- `NOT LIKE` / `NOT ILIKE`：現状の評価器は LIKE の否定を明示的に処理していないため、期待通りに動作しない可能性があり「未サポート扱い」とする

詳細な実装フローは [docs/sql-filtering.ja.md](sql-filtering.ja.md) を参照。

## 仮想カラム一覧

### 基本情報

| カラム名 | 型 | 説明 | マッピング先 | 必要なJOIN |
|----------|------|------|-------------|-----------|
| `visit_id` | INTEGER | Visit ID | `pfs_visit.pfs_visit_id` | なし |
| `id` | INTEGER | Visit ID（エイリアス） | `pfs_visit.pfs_visit_id` | なし |
| `issued_at` | TIMESTAMP | 発行日時 | `pfs_visit.issued_at` | なし |

### シーケンス情報

| カラム名 | 型 | 説明 | マッピング先 | 必要なJOIN |
|----------|------|------|-------------|-----------|
| `sequence_type` | TEXT | シーケンスタイプ | `iic_sequence.sequence_type` | visit_set, iic_sequence |
| `comments` | TEXT | シーケンスのコメント | `iic_sequence.comments` | visit_set, iic_sequence |
| `cmd_str` | TEXT | ICSコマンド文字列 | `iic_sequence.cmd_str` | visit_set, iic_sequence |
| `visit_set_id` | INTEGER | シーケンスID | `iic_sequence.iic_sequence_id` | visit_set, iic_sequence |
| `status` | TEXT | シーケンスステータス | `iic_sequence_status.cmd_output` | visit_set, iic_sequence, iic_sequence_status |

### グループ情報

| カラム名 | 型 | 説明 | マッピング先 | 必要なJOIN |
|----------|------|------|-------------|-----------|
| `sequence_group_id` | INTEGER | シーケンスグループID | `sequence_group.group_id` | visit_set, iic_sequence, sequence_group |
| `sequence_group_name` | TEXT | シーケンスグループ名 | `sequence_group.group_name` | visit_set, iic_sequence, sequence_group |

### メモ関連

| カラム名 | 型 | 説明 | マッピング先 | 必要なJOIN |
|----------|------|------|-------------|-----------|
| `visit_note` | TEXT | Visitメモ本文 | `obslog_visit_note.body` | obslog_visit_note |
| `visit_note_user` | TEXT | Visitメモ作成者 | `obslog_user.account_name` | obslog_visit_note, visit_note_user |
| `visit_set_note` | TEXT | シーケンスメモ本文 | `obslog_visit_set_note.body` | visit_set, obslog_visit_set_note |
| `visit_set_note_user` | TEXT | シーケンスメモ作成者 | `obslog_user.account_name` | visit_set, obslog_visit_set_note, visit_set_note_user |

### 露出判定カラム（計算カラム）

これらのカラムは実際のテーブルカラムではなく、関連テーブルの存在をチェックする計算式として実装されています。

| カラム名 | 型 | 説明 | 計算式 | 必要なJOIN |
|----------|------|------|--------|-----------|
| `is_sps_visit` | BOOLEAN | SpS露出があるか | `sps_visit.pfs_visit_id IS NOT NULL` | sps_visit |
| `is_mcs_visit` | BOOLEAN | MCS露出があるか | `mcs_exposure.pfs_visit_id IS NOT NULL` | mcs_exposure |
| `is_agc_visit` | BOOLEAN | AGC露出があるか | `agc_exposure.pfs_visit_id IS NOT NULL` | agc_exposure |

### プロポーザル

| カラム名 | 型 | 説明 | マッピング先 | 必要なJOIN |
|----------|------|------|-------------|-----------|
| `proposal_id` | TEXT | プロポーザルID | `pfs_design_fiber.proposal_id` | pfs_design_fiber |

### 集約カラム

これらのカラムは各Visitに関連するレコード数や平均値を計算します。
集約カラムはサブクエリとして実装されており、メインクエリにJOINされません。

| カラム名 | 型 | 説明 | 集約対象 | 集約関数 |
|----------|------|------|---------|---------|
| `sps_count` | INTEGER | SPS露出の数 | `sps_exposure` | COUNT |
| `sps_avg_exptime` | FLOAT | SPS露出の平均露出時間 | `sps_exposure.exptime` | AVG |
| `mcs_count` | INTEGER | MCS露出の数 | `mcs_exposure` | COUNT |
| `mcs_avg_exptime` | FLOAT | MCS露出の平均露出時間 | `mcs_exposure.mcs_exptime` | AVG |
| `agc_count` | INTEGER | AGC露出の数 | `agc_exposure` | COUNT |
| `agc_avg_exptime` | FLOAT | AGC露出の平均露出時間 | `agc_exposure.agc_exptime` | AVG |

**使用例:**
```sql
-- SPS露出が5件以上のVisit
WHERE sps_count >= 5

-- 平均露出時間が30秒以上のVisit
WHERE sps_avg_exptime >= 30

-- 複数の集約条件を組み合わせ
WHERE sps_count > 0 AND mcs_count > 0

-- 通常の条件と組み合わせ
WHERE id > 10000 AND sps_count >= 5
```

**制限事項:**
- 集約カラムは `OR` 式の中では使用できません
- 集約カラムは `NOT` 式の中では使用できません
- 集約カラムは `AND` 式で他の条件と組み合わせることができます

---

## サポートされる構文

### 比較演算子

| 演算子 | 説明 | 例 |
|--------|------|-----|
| `=` | 等しい | `id = 100` |
| `<>`, `!=` | 等しくない | `status <> 'SUCCESS'` |
| `<` | より小さい | `id < 1000` |
| `>` | より大きい | `id > 500` |
| `<=` | 以下 | `sps_count <= 10` |
| `>=` | 以上 | `sps_avg_exptime >= 30.0` |

### LIKE / ILIKE

| 構文 | 説明 | 例 |
|------|------|-----|
| `LIKE` | パターンマッチ（大文字小文字区別） | `sequence_type LIKE '%domeflat%'` |
| `NOT LIKE` | パターンマッチの否定 | `visit_note NOT LIKE '%test%'` |
| `ILIKE` | パターンマッチ（大文字小文字区別なし） | `status ILIKE '%success%'` |

注：`NOT LIKE` / `NOT ILIKE` は現状の `/api/visits` 実装では期待通りに動作しない可能性があるため、実用上は未サポートとみなす。

**ワイルドカード:**
- `%` - 任意の0文字以上
- `_` - 任意の1文字

### BETWEEN

```sql
-- 範囲検索
WHERE id BETWEEN 100 AND 200
WHERE issued_at BETWEEN '2024-01-01' AND '2024-12-31'
```

### 論理演算子

| 演算子 | 説明 | 例 |
|--------|------|-----|
| `AND` | 論理積 | `is_sps_visit AND id > 100` |
| `OR` | 論理和 | `is_mcs_visit OR is_agc_visit` |
| `NOT` | 論理否定 | `NOT is_mcs_visit` |

### NULL判定

```sql
-- NULLかどうか
WHERE status IS NULL
WHERE visit_note IS NOT NULL
```

### 型キャスト

| キャスト | 説明 | 例 |
|---------|------|-----|
| `::date` | DATE型にキャスト | `issued_at::date = '2024-01-01'` |
| `::float`, `::float8` | FLOAT型にキャスト | `sps_avg_exptime::float > 30` |
| `::int`, `::integer` | INTEGER型にキャスト | `sps_count::int > 5` |

### 許可される関数

セキュリティのため、使用できる関数は以下に制限されています：

| 関数 | 説明 | 例 |
|------|------|-----|
| `date()` | 日付変換 | `date(issued_at) = '2024-01-01'` |
| `lower()` | 小文字変換 | `lower(sequence_type) = 'sciencetrace'` |
| `upper()` | 大文字変換 | `upper(status) = 'SUCCESS'` |
| `trim()` | 空白除去 | `trim(comments) <> ''` |
| `coalesce()` | NULL置換 | `coalesce(status, 'UNKNOWN') = 'SUCCESS'` |

注：現状の `/api/visits` 実装では、評価器が関数呼び出し（`FuncCall`）をサポートしていないため、上記の関数は利用できない。

---

## JOIN依存関係

仮想カラムを使用すると、バックグラウンドで必要なテーブルが自動的にJOINされます。
以下はJOINの依存関係を示しています。

```
pfs_visit (ベーステーブル)
├── obslog_visit_note
│   └── visit_note_user (ObslogUser のエイリアス)
├── sps_visit
│   ├── sps_exposure
│   │   └── sps_annotation
├── visit_set
│   ├── iic_sequence
│   │   ├── iic_sequence_status
│   │   └── sequence_group
│   ├── obslog_visit_set_note
│   │   └── visit_set_note_user (ObslogUser のエイリアス)
├── mcs_exposure
│   ├── obslog_mcs_exposure_note
│   │   └── mcs_exposure_note_user (ObslogUser のエイリアス)
├── agc_exposure
└── pfs_design_fiber
```

---

## クエリ例

### 基本的なフィルタリング

```sql
-- 特定のVisit IDを取得
WHERE id = 12345

-- Visit ID の範囲
WHERE id BETWEEN 10000 AND 20000

-- 日付でフィルタリング
WHERE issued_at::date = '2024-06-15'
WHERE issued_at >= '2024-06-01' AND issued_at < '2024-07-01'
```

### シーケンス関連

```sql
-- 特定のシーケンスタイプ
WHERE sequence_type = 'scienceTrace'

-- シーケンスタイプを部分一致で検索
WHERE sequence_type LIKE '%domeflat%'

-- ICSコマンド文字列で検索
WHERE cmd_str LIKE '%halogen%'

-- 特定のステータス
WHERE status = 'SUCCESS'
WHERE status IS NULL  -- ステータスが未設定
```

### 露出の有無で絞り込み

```sql
-- SpS露出があるVisit
WHERE is_sps_visit

-- MCS露出のみのVisit
WHERE is_mcs_visit AND NOT is_sps_visit

-- いずれかの露出があるVisit
WHERE is_sps_visit OR is_mcs_visit OR is_agc_visit
```

### 露出数や露出時間で絞り込み

```sql
-- SPS露出が10件以上のVisit
WHERE sps_count >= 10

-- MCS露出の平均露出時間が1秒以上
WHERE mcs_avg_exptime >= 1.0

-- 複合条件
WHERE sps_count >= 5 AND sps_avg_exptime >= 30
```

### メモの検索

```sql
-- Visitメモに特定のキーワードを含む
WHERE visit_note LIKE '%calibration%'

-- 特定のユーザーのメモがあるVisit
WHERE visit_note_user = 'yamada'

-- シーケンスメモの検索
WHERE visit_set_note LIKE '%weather%'
```

### 複合条件

```sql
-- SpS露出があり、特定の日付範囲で、メモに 'good' が含まれるVisit
WHERE is_sps_visit 
  AND issued_at::date BETWEEN '2024-06-01' AND '2024-06-30'
  AND visit_note LIKE '%good%'

-- シーケンスタイプが scienceTrace で、ステータスが SUCCESS のもの
WHERE sequence_type = 'scienceTrace' AND status = 'SUCCESS'
```

---

## セキュリティ制限

以下の構文は禁止されています：

- **サブクエリ**: `WHERE id IN (SELECT ...)`
- **DML文**: INSERT, UPDATE, DELETE
- **DDL文**: CREATE, DROP, TRUNCATE
- **未許可の関数**: システム関数、ユーザー定義関数

---

## 実装ファイル

このフィルター言語は以下のファイルで実装されています：

| ファイル | 役割 |
|---------|------|
| [columns.py](../backend/src/pfs_obslog/visitquery/columns.py) | 仮想カラム定義 (`VIRTUAL_COLUMNS`) |
| [parser.py](../backend/src/pfs_obslog/visitquery/parser.py) | pglastによるWHERE句パース |
| [evaluator.py](../backend/src/pfs_obslog/visitquery/evaluator.py) | ASTをSQLAlchemy式に変換 |
| [joins.py](../backend/src/pfs_obslog/visitquery/joins.py) | JOIN最適化ロジック |

**関連ドキュメント:**
- [SQLフィルタリング概要](./sql-filtering.md) - アーキテクチャと実装の詳細
