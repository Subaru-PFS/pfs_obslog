# フロントエンドコンポーネント移行状況

このドキュメントは既存プロジェクト（`old-project/codebase/webui`）から新プロジェクトへのフロントエンドコンポーネント移行状況を追跡します。

**注**: 既存プロジェクトは SolidJS で実装されており、新プロジェクトは React に移植されています。

## 移行状況サマリー

| カテゴリ | 完了 | 一部完了 | 未完了 | 進捗率 |
|----------|------|----------|--------|--------|
| ページ | 2 | 1 | 1 | 63% |
| 共通コンポーネント | 4 | 0 | 4 | 50% |
| Home機能 | 4 | 2 | 3 | 56% |
| Design機能 | 0 | 0 | 5 | 0% |
| **合計** | **10** | **3** | **13** | **40%** |

---

## ページ

| 既存コンポーネント | 新コンポーネント | 状態 | 備考 |
|-------------------|-----------------|------|------|
| `pages/Login` | `pages/Login` | ✅ 完了 | ログインフォーム |
| `pages/Header` | - | ⏳ 未実装 | ヘッダー（ナビゲーション、ログアウト） |
| `pages/Home` | `pages/Home` | ✅ 完了 | Visit一覧・詳細ページ |
| `pages/Designs` | - | ⏳ 未実装 | PFS Design一覧・詳細ページ |

---

## 共通コンポーネント (components/)

| 既存コンポーネント | 新コンポーネント | 状態 | 備考 |
|-------------------|-----------------|------|------|
| `components/Icon` | `components/Icon` | ✅ 完了 | Material Symbolsアイコン |
| `components/Loading` | `components/LoadingSpinner`, `components/LoadingOverlay` | ✅ 完了 | ローディング表示 |
| `components/Tabs` | `components/Tabs` | ✅ 完了 | タブUI |
| `components/Tippy` | `components/Tooltip` | ✅ 完了 | ツールチップ |
| `components/DatePicker` | - | ⏳ 未実装 | 日付範囲選択 |
| `components/LazyImage` | - | ⏳ 未実装 | 遅延読み込み画像 |
| `components/layout` | - | ⏳ 未実装 | Flex/Grid等のレイアウトユーティリティ |
| `components/pfs/FocalPlane` | - | ⏳ 未実装 | PFS焦点面可視化 |

---

## Homeページ機能 (pages/Home/)

### Visit一覧 (VisitSetList → VisitList)

| 既存機能 | 新実装 | 状態 | 備考 |
|---------|-------|------|------|
| Visit一覧表示 | `VisitList` | ✅ 完了 | IicSequenceでグループ化表示 |
| 列表示の切り替え | `VisitList` | ✅ 完了 | 表示列選択UI |
| SQLフィルタリング | `VisitList` | ✅ 完了 | WHERE句による検索 |
| ページネーション | `VisitList` | ✅ 完了 | オフセット/リミット |
| Go to Visit | - | 🔶 一部完了 | Visit ID指定でジャンプ（APIは未実装） |
| CSV/JSONダウンロード | - | ⏳ 未実装 | 一覧のエクスポート |
| 日付範囲フィルター | - | ⏳ 未実装 | DateRangePickerとの連携 |
| SQLシンタックスヘルプ | - | ⏳ 未実装 | `SqlSyntaxHelp` |

### Visit詳細 (VisitDetail)

| 既存機能 | 新実装 | 状態 | 備考 |
|---------|-------|------|------|
| Visit基本情報 | `VisitDetail` | ✅ 完了 | ID、説明、発行日時、露出数 |
| SPS Inspector | `SpsInspector` | ✅ 完了 | SPS露出一覧、アノテーション |
| MCS Inspector | `McsInspector` | ✅ 完了 | MCS露出一覧、環境情報 |
| AGC Inspector | `AgcInspector` | ✅ 完了 | AGC露出一覧、ガイドオフセット |
| IIC Sequence | `IicSequenceInfo` | ✅ 完了 | シーケンス情報表示 |
| Sequence Group | `SequenceGroupInfo` | ✅ 完了 | グループ情報表示 |
| Visit Notes | - | 🔶 一部完了 | 表示のみ（作成/編集/削除は未実装） |
| FITS Header Info | - | ⏳ 未実装 | FITSヘッダー表示 |
| FITS Preview | - | ⏳ 未実装 | FITSプレビュー画像 |

### Note機能 (NoteList)

| 既存機能 | 新実装 | 状態 | 備考 |
|---------|-------|------|------|
| メモ一覧表示 | - | 🔶 一部完了 | Visit詳細内で表示のみ |
| メモ作成 | - | ⏳ 未実装 | 認証必須 |
| メモ編集 | - | ⏳ 未実装 | 自分のメモのみ |
| メモ削除 | - | ⏳ 未実装 | 自分のメモのみ |

---

## Designsページ機能 (pages/Designs/)

| 既存機能 | 新実装 | 状態 | 備考 |
|---------|-------|------|------|
| Design一覧 (`DesignList`) | - | ⏳ 未実装 | PFS Design一覧表示 |
| Design詳細 (`DesignDetail`) | - | ⏳ 未実装 | Design詳細情報 |
| Sky Viewer (`SkyViewer`) | - | ⏳ 未実装 | 天球可視化 |
| Stellar Globe | - | ⏳ 未実装 | WebGLベースの3D天球表示 |
| Design Chart | - | ⏳ 未実装 | Designチャート画像 |

---

## 凡例

- ✅ **完了**: 新プロジェクトで実装済み
- 🔶 **一部完了**: 基本機能は実装済みだが一部機能が未実装
- ⏳ **未実装**: まだ移行されていない
- 🚧 **作業中**: 現在実装作業中
- ❌ **移行しない**: 新プロジェクトでは不要と判断

---

## 技術スタック変更点

| 項目 | 既存 | 新規 |
|------|------|------|
| UIフレームワーク | SolidJS | React 19 |
| ルーティング | solid-app-router | React Router v7 |
| 状態管理 | SolidJS Signals | RTK Query |
| スタイル | SCSS Modules | SCSS Modules |
| ビルドツール | Vite | Vite |
| API通信 | openapi-typescript-fetch | RTK Query (openapi-codegen) |

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2024-12-30 | 初版作成 |
