# pfs-obslog バックエンド仕様書

## 概要

PFS (Prime Focus Spectrograph) Obslog は、すばる望遠鏡のPFS装置の観測ログを管理・閲覧するためのWebアプリケーションです。バックエンドは FastAPI + SQLAlchemy で構築されています。

## 技術スタック

- **フレームワーク**: FastAPI
- **ORM**: SQLAlchemy
- **データベース**: PostgreSQL (opdb)
- **Python**: 3.10+
- **認証**: LDAP (stn_ldap) / 開発用認証
- **レスポンス形式**: ORJSON (高速JSON)
- **ミドルウェア**: GZip圧縮

## プロジェクト構造

```
backend/src/pfs_obslog/
├── app/
│   ├── fastapi_app.py      # FastAPIアプリケーション本体
│   ├── context.py          # リクエストコンテキスト (DB, Session, User)
│   ├── orjsonresponse.py   # ORJSONレスポンスクラス
│   ├── qadb.py             # QAデータベース接続
│   ├── staticassets.py     # 静的ファイル配信
│   └── routers/
│       ├── visit/
│       │   ├── visit.py    # Visit一覧・詳細API
│       │   └── csv.py      # CSV出力API
│       ├── visit_note.py   # Visitノート CRUD
│       ├── visit_set_note.py # VisitSetノート CRUD
│       ├── session.py      # 認証セッション
│       ├── fits.py         # FITSファイル配信・プレビュー
│       ├── plot.py         # MCSデータプロット
│       ├── pfsdesign.py    # PFS Design管理
│       ├── attachment.py   # 添付ファイル管理
│       ├── asynctask.py    # 非同期タスク処理
│       └── healthz.py      # ヘルスチェック
├── config.py               # 設定管理 (Pydantic BaseSettings)
├── db.py                   # データベース接続・セッション管理
├── schema.py               # Pydanticスキーマ定義
├── orm.py                  # ORM設定ヘルパー
├── visitquery.py           # Visit検索クエリ処理
├── userauth.py             # 認証処理
├── httpsession.py          # HTTPセッション管理
├── image.py                # FITS画像変換
├── fitsmeta.py             # FITSメタデータ
├── filecache/              # ファイルキャッシュ
├── fileseries.py           # 連番ファイル管理
├── parsesql/               # SQLパーサー
└── utils/                  # ユーティリティ
```

## 設定 (config.py)

### 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|----------|
| `PFS_OBSLOG_ENV` | 環境 (test/development/production) | development |
| `RELATIVE_URL_ROOT` | 相対URLルート | '' |
| `PFS_OBSLOG_DSN` | PostgreSQL DSN | 必須 |
| `PFS_OBSLOG_QADB_DSN` | QAデータベース DSN | 必須 |
| `PFS_OBSLOG_SECRET_KEY_BASE` | セッション暗号化キー | 必須 |

### ファイルパス設定

- `attachments_dir`: 添付ファイル保存ディレクトリ (デフォルト: `./attachments`)
- `data_root`: データルート (デフォルト: `/data`)
- `pfs_design_dir`: PFS Designファイルディレクトリ (デフォルト: `/data/pfsDesign`)
- `calexp_reruns`: Calexpリランディレクトリリスト

### 認証方式

- `stn_ldap`: すばる望遠鏡LDAP認証 (本番)
- `dev`: 開発用認証 (ユーザー名=パスワード)
- `test`: テスト用認証

## データモデル (opdb)

既存の `opdb` パッケージのモデルを使用。主要なモデル：

### コアエンティティ

- **pfs_visit**: 観測Visit
- **visit_set**: Visitセット (IICシーケンスとの関連)
- **iic_sequence**: IICシーケンス
- **iic_sequence_status**: シーケンスステータス
- **sequence_group**: シーケンスグループ

### 露出関連

- **sps_exposure**: SpS露出
- **sps_visit**: SpS Visit
- **sps_annotation**: SpSアノテーション
- **mcs_exposure**: MCS露出
- **agc_exposure**: AGC露出
- **agc_guide_offset**: AGCガイドオフセット

### Obslog固有

- **obslog_user**: ユーザー
- **obslog_visit_note**: Visitノート
- **obslog_visit_set_note**: VisitSetノート
- **obslog_mcs_exposure_note**: MCS露出ノート
- **obslog_fits_header**: FITSヘッダーキャッシュ

### テレスコープ・設計

- **tel_status**: テレスコープステータス
- **pfs_design_fiber**: PFS Design Fiber

## APIエンドポイント

### 認証 (session.py)

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/session` | ログイン |
| GET | `/api/session` | 現在のセッション取得 |
| DELETE | `/api/session` | ログアウト |

### Visit (visit/visit.py, visit/csv.py)

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/visits` | Visit一覧取得 (フィルタ、ページネーション対応) |
| GET | `/api/visits/{id}` | Visit詳細取得 |
| GET | `/api/visits/{id}/rank` | Visit順位取得 |
| GET | `/api/visits.csv` | Visit一覧CSV出力 |

#### Visit一覧のクエリパラメータ

- `sql`: WHERE句を含むSQLフィルター
- `offset`: オフセット
- `limit`: 取得件数 (デフォルト: 50)

### Visitノート (visit_note.py)

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/visits/{visit_id}/notes` | ノート作成 |
| PUT | `/api/visits/{visit_id}/notes/{id}` | ノート更新 |
| DELETE | `/api/visits/{visit_id}/notes/{id}` | ノート削除 |

### VisitSetノート (visit_set_note.py)

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/visit_sets/{visit_set_id}/notes` | ノート作成 |
| PUT | `/api/visit_sets/{visit_set_id}/notes/{id}` | ノート更新 |
| DELETE | `/api/visit_sets/{visit_set_id}/notes/{id}` | ノート削除 |

### FITSファイル (fits.py)

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/fits/visits/{visit_id}/sps/{camera_id}.fits` | SpS FITSファイル取得 |
| GET | `/api/fits/visits/{visit_id}/sps/{camera_id}.png` | SpS FITSプレビュー |
| GET | `/api/fits/visits/{visit_id}/agc/{exposure_id}.fits` | AGC FITSファイル取得 |
| GET | `/api/fits/visits/{visit_id}/mcs/{frame_id}.fits` | MCS FITSファイル取得 |

#### FITSタイプ

- `raw`: 生データ
- `calexp`: キャリブレーション済み
- `postISRCCD`: ISR処理後

### プロット (plot.py)

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/mcs_data/{frame_id}.png` | MCSデータ散布図 |

### PFS Design (pfsdesign.py)

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/pfs_designs` | PFS Design一覧 |
| その他 | - | Design詳細、可視化など |

### 添付ファイル (attachment.py)

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/attachments` | ファイルアップロード |
| GET | `/api/attachments/{account_name}/{file_id}` | ファイル取得 |
| GET | `/api/attachments` | ファイル一覧 |
| DELETE | `/api/attachments/{file_id}` | ファイル削除 |

### ヘルスチェック (healthz.py)

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/healthz` | ヘルスチェック |

## Visit検索クエリ (visitquery.py)

### 概要

SQLライクなWHERE句でVisitを検索できるカスタムクエリ機能を提供。

### サポートされるカラム

- `visit_id`, `id`: Visit ID
- `issued_at`: 発行日時
- `sequence_type`: シーケンスタイプ
- `comments`: コメント
- `visit_note`: Visitノート
- `visit_set_note`: VisitSetノート
- `status`: シーケンスステータス
- `is_sps_visit`, `is_mcs_visit`, `is_agc_visit`: 露出タイプフラグ
- `visit_set_id`: VisitSet ID
- `sequence_group_id`, `sequence_group_name`: シーケンスグループ
- `proposal_id`: プロポーザルID
- `any_column`: 全カラム検索

### クエリ最適化

WHERE句で使用されるカラムに基づいて必要なJOINのみを実行する最適化が実装されている (`RequiredJoins`クラス)。

## 認証・認可

### セッション管理

- Cookie/Tokenベースのセッション
- `httpsession.py`で管理
- 暗号化キー: `secret_key_base`

### コンテキスト (context.py)

- `NoLoginContext`: ログイン不要エンドポイント用
- `Context`: ログイン必須エンドポイント用
  - 未認証の場合は401エラー

## 非同期タスク (asynctask.py)

- マルチプロセス/マルチスレッドでの非同期処理
- FITS画像変換などCPU負荷の高い処理に使用
- `background_process()`: プロセス実行
- `background_thread()`: スレッド実行

## QAデータベース (qadb.py)

観測品質データを格納する別データベースへの接続を管理。

取得するデータ:
- `seeing_median`: シーイング中央値
- `transparency_median`: 透過率中央値
- `effective_exposure_time_*`: 有効露出時間 (b/r/n/m)

## ファイルキャッシュ

### FileBackedCache

ファイルシステムベースのキャッシュ。PNGプレビューなどに使用。

### PickleCache

Pickleシリアライズによるキャッシュ。

## Pydanticスキーマ (schema.py)

### 主要スキーマ

```python
# Visit関連
VisitBase          # Visit基本情報
VisitDetail        # Visit詳細 (露出情報含む)
VisitListEntry     # Visit一覧エントリ
VisitNote          # Visitノート
VisitSetNote       # VisitSetノート

# 露出関連
SpsExposure        # SpS露出
SpsVisit           # SpS Visit
SpsAnnotation      # SpSアノテーション
McsExposure        # MCS露出
McsVisit           # MCS Visit
AgcExposure        # AGC露出
AgcVisit           # AGC Visit
AgcGuideOffset     # AGCガイドオフセット

# シーケンス関連
IicSequence        # IICシーケンス
IicSequenceStatus  # シーケンスステータス
VisitSet           # Visitセット
SequenceGroup      # シーケンスグループ

# ユーザー
ObslogUser         # ユーザー情報
```

### ORM設定 (orm.py)

SQLAlchemyモデルからPydanticモデルへの変換をサポートする `OrmConfig` ヘルパー。

## セキュリティ考慮事項

1. **認証必須**: 全APIエンドポイントは認証が必要 (ヘルスチェック除く)
2. **セッション暗号化**: secret_key_baseによる暗号化
3. **ファイルアップロード制限**: 危険な拡張子のブロック (.exe, .php等)
4. **アカウント名バリデーション**: 安全な文字のみ許可
5. **SQLインジェクション対策**: パラメータ化クエリ使用

## 依存関係

主要な外部パッケージ:

- `fastapi`: Webフレームワーク
- `sqlalchemy`: ORM
- `pydantic`: データバリデーション
- `opdb`: PFSデータベースモデル
- `astropy`: FITS処理
- `numpy`, `matplotlib`: データ処理・可視化
- `pfs.datamodel`: PFSデータモデル
