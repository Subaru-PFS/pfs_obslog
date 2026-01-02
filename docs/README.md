# ドキュメント

PFS Obslog 2 のドキュメント一覧です。

## 📚 ドキュメント構成

### 🔧 開発ガイド (`development/`)

開発者向けのセットアップ・開発手順に関するドキュメント。

| ドキュメント | 説明 |
|-------------|------|
| [backend.md](development/backend.md) | バックエンド開発ガイド（DB接続、モデル生成など） |
| [frontend.md](development/frontend.md) | フロントエンド開発ガイド（SCSS型生成、RTK Query生成など） |
| [session.md](development/session.md) | セッション管理の仕組み |
| [testing.md](development/testing.md) | テスト方針・遅いテストの調査 |

### 🚀 デプロイ (`deployment/`)

本番環境へのデプロイ手順。

| ドキュメント | 説明 |
|-------------|------|
| [production.md](deployment/production.md) | プロダクション環境セットアップ |

### 🏗️ アーキテクチャ (`architecture/`)

システム設計・仕様に関するドキュメント。

| ドキュメント | 説明 |
|-------------|------|
| [filter-language.md](filter-language.md) | フィルター言語仕様（仮想カラム、SQL構文） |
| [sql-filtering.md](sql-filtering.md) | SQLフィルタリング実装の詳細 |
| [visit-api.md](architecture/visit-api.md) | Visit一覧API仕様 |

### 📦 移行状況 (`migration/`)

既存プロジェクトからの移行進捗を追跡。

| ドキュメント | 説明 |
|-------------|------|
| [backend-api.md](migration/backend-api.md) | バックエンドAPI移行状況 |
| [frontend-components.md](migration/frontend-components.md) | フロントエンドコンポーネント移行状況 |
| [design-viewer.md](migration/design-viewer.md) | Design Viewer機能の仕様書 |

### 📝 技術メモ (`notes/`)

調査ログ・技術検討の記録。

| ドキュメント | 説明 |
|-------------|------|
| [pfs-design-speedup.md](notes/pfs-design-speedup.md) | PFS Design API高速化の調査 |
| [pfs-design-refactoring.md](notes/pfs-design-refactoring.md) | PFS Design Viewerリファクタリング調査 |
| [visit-detail-pane.md](notes/visit-detail-pane.md) | Visit詳細ペイン実装の調査 |

---

## その他のドキュメント

- [プロジェクトREADME](../README.md) - プロジェクト概要・クイックスタート
- [バックエンドREADME](../backend/README.md) - バックエンド固有の情報
- [フロントエンドREADME](../frontend/README.md) - フロントエンド固有の情報
- [テスト用DB作成](../backend/devel/make_test_db/README.md) - 開発用DBのセットアップ
- [SQLAlchemyモデル生成](../backend/devel/generate_models.md) - DBスキーマからのモデル自動生成
