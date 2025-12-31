# バックエンドAPI移行状況

このドキュメントは既存プロジェクト（`old-project/codebase`）から新プロジェクトへのバックエンドAPI移行状況を追跡します。

## 移行状況サマリー

| カテゴリ | 完了 | 未完了 | 進捗率 |
|----------|------|--------|--------|
| 認証 | 4 | 0 | 100% |
| ヘルスチェック | 1 | 0 | 100% |
| Visit | 3 | 1 | 75% |
| Visit Note | 3 | 0 | 100% |
| Visit Set Note | 3 | 0 | 100% |
| FITS | 0 | 8 | 0% |
| PFS Design | 0 | 4 | 0% |
| Attachment | 0 | 4 | 0% |
| Plot | 0 | 1 | 0% |
| **合計** | **14** | **18** | **44%** |

---

## API エンドポイント一覧

### 認証 (Session)

| メソッド | 既存エンドポイント | 新エンドポイント | 状態 | 備考 |
|----------|-------------------|-----------------|------|------|
| POST | `/api/session` | `/api/auth/login` | ✅ 完了 | ログイン処理 |
| GET | `/api/session` | `/api/auth/status` | ✅ 完了 | セッション状態取得 |
| DELETE | `/api/session` | `/api/auth/logout` | ✅ 完了 | ログアウト |
| - | - | `/api/auth/me` | ✅ 完了 | 新規追加：認証必須のユーザー情報取得 |

### ヘルスチェック

| メソッド | 既存エンドポイント | 新エンドポイント | 状態 | 備考 |
|----------|-------------------|-----------------|------|------|
| GET | `/api/healthz` | `/api/healthz` | ✅ 完了 | DBタイムスタンプ確認 → 単純なステータス返却に変更 |
| - | - | `/api/readyz` | ✅ 完了 | 新規追加：レディネスチェック |

### Visit

| メソッド | 既存エンドポイント | 新エンドポイント | 状態 | 備考 |
|----------|-------------------|-----------------|------|------|
| GET | `/api/visits` | `/api/visits` | ✅ 完了 | Visit一覧取得、SQLフィルタリング対応 |
| GET | `/api/visits/{id}` | `/api/visits/{visit_id}` | ✅ 完了 | Visit詳細取得 |
| GET | `/api/visits/{id}/rank` | - | ⏳ 未実装 | SQLフィルタリング内での順位取得 |
| GET | `/api/visits.csv` | - | ⏳ 未実装 | CSV形式でのエクスポート |

### Visit Note（Visitメモ）

| メソッド | 既存エンドポイント | 新エンドポイント | 状態 | 備考 |
|----------|-------------------|-----------------|------|------|
| POST | `/api/visits/{visit_id}/notes` | `/api/visits/{visit_id}/notes` | ✅ 完了 | メモ作成（要認証） |
| PUT | `/api/visits/{visit_id}/notes/{id}` | `/api/visits/{visit_id}/notes/{note_id}` | ✅ 完了 | メモ更新（自分のメモのみ） |
| DELETE | `/api/visits/{visit_id}/notes/{id}` | `/api/visits/{visit_id}/notes/{note_id}` | ✅ 完了 | メモ削除（自分のメモのみ） |

### Visit Set Note（シーケンスメモ）

| メソッド | 既存エンドポイント | 新エンドポイント | 状態 | 備考 |
|----------|-------------------|-----------------|------|------|
| POST | `/api/visit_sets/{visit_set_id}/notes` | `/api/visit_sets/{visit_set_id}/notes` | ✅ 完了 | シーケンスメモ作成（要認証） |
| PUT | `/api/visit_sets/{visit_set_id}/notes/{id}` | `/api/visit_sets/{visit_set_id}/notes/{note_id}` | ✅ 完了 | シーケンスメモ更新（自分のメモのみ） |
| DELETE | `/api/visit_sets/{visit_set_id}/notes/{id}` | `/api/visit_sets/{visit_set_id}/notes/{note_id}` | ✅ 完了 | シーケンスメモ削除（自分のメモのみ） |

### FITS ファイル

| メソッド | 既存エンドポイント | 新エンドポイント | 状態 | 備考 |
|----------|-------------------|-----------------|------|------|
| GET | `/api/fits/visits/{visit_id}/sps/{camera_id}.fits` | - | ⏳ 未実装 | SPS FITSファイルダウンロード |
| GET | `/api/fits/visits/{visit_id}/sps/{camera_id}.png` | - | ⏳ 未実装 | SPS FITSプレビュー画像 |
| GET | `/api/fits/visits/{visit_id}/agc/{exposure_id}.fits` | - | ⏳ 未実装 | AGC FITSファイルダウンロード |
| GET | `/api/fits/visits/{visit_id}/agc/{exposure_id}-{hdu_index}.png` | - | ⏳ 未実装 | AGC FITSプレビュー画像 |
| GET | `/api/fits/visits/{visit_id}/mcs/{frame_id}.fits` | - | ⏳ 未実装 | MCS FITSファイルダウンロード |
| GET | `/api/fits/visits/{visit_id}/mcs/{frame_id}.png` | - | ⏳ 未実装 | MCS FITSプレビュー画像 |
| GET | `/api/fits/visits/{visit_id}/sps/{camera_id}/headers` | - | ⏳ 未実装 | FITSヘッダー取得（存在する場合） |
| GET | `/api/fits/visits/{visit_id}/mcs/{frame_id}/headers` | - | ⏳ 未実装 | FITSヘッダー取得（存在する場合） |

### PFS Design

| メソッド | 既存エンドポイント | 新エンドポイント | 状態 | 備考 |
|----------|-------------------|-----------------|------|------|
| GET | `/api/pfs_designs` | - | ⏳ 未実装 | PFS Design一覧 |
| GET | `/api/pfs_designs/{id_hex}` | - | ⏳ 未実装 | PFS Design詳細 |
| GET | `/api/pfs_designs/{id_hex}.fits` | - | ⏳ 未実装 | PFS Design FITSダウンロード |
| GET | `/api/pfs_designs.png` | - | ⏳ 未実装 | PFS Designチャート画像 |

### Attachment（添付ファイル）

| メソッド | 既存エンドポイント | 新エンドポイント | 状態 | 備考 |
|----------|-------------------|-----------------|------|------|
| POST | `/api/attachments` | - | ⏳ 未実装 | 添付ファイルアップロード（要認証） |
| GET | `/api/attachments` | - | ⏳ 未実装 | 添付ファイル一覧（自分のファイル） |
| GET | `/api/attachments/{account_name}/{file_id}` | - | ⏳ 未実装 | 添付ファイルダウンロード |
| DELETE | `/api/attachments/{file_id}` | - | ⏳ 未実装 | 添付ファイル削除（自分のファイルのみ） |

### Plot（チャート）

| メソッド | 既存エンドポイント | 新エンドポイント | 状態 | 備考 |
|----------|-------------------|-----------------|------|------|
| GET | `/api/mcs_data/{frame_id}.png` | - | ⏳ 未実装 | MCSデータチャート画像 |

---

## 凡例

- ✅ **完了**: 新プロジェクトで実装済み
- ⏳ **未実装**: まだ移行されていない
- 🚧 **作業中**: 現在実装作業中
- ❌ **移行しない**: 新プロジェクトでは不要と判断

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2024-12-30 | 初版作成 |
