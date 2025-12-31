# フロントエンドコンポーネント移行状況

このドキュメントは既存プロジェクト（`old-project/codebase/webui`）から新プロジェクトへのフロントエンドコンポーネント移行状況を追跡します。

**注**: 既存プロジェクトは SolidJS で実装されており、新プロジェクトは React に移植されています。

## 移行状況サマリー

| カテゴリ | 完了 | 一部完了 | 未完了 | 進捗率 |
|----------|------|----------|--------|--------|
| ページ・レイアウト | 2 | 0 | 2 | 50% |
| 共通コンポーネント | 4 | 0 | 4 | 50% |
| Home: Visit一覧 | 4 | 1 | 3 | 56% |
| Home: Visit詳細 | 6 | 1 | 5 | 54% |
| Home: Note機能 | 0 | 1 | 3 | 13% |
| Designs機能 | 0 | 0 | 5 | 0% |
| **合計** | **16** | **3** | **22** | **43%** |

---

## ページ・レイアウト

| 既存コンポーネント | 既存パス | 新コンポーネント | 新パス | 状態 | 備考 |
|-------------------|---------|-----------------|-------|------|------|
| Login | `pages/Login` | Login | `pages/Login` | ✅ 完了 | ログインフォーム |
| Header | `pages/Header` | - | - | ⏳ 未実装 | ヘッダー（ナビゲーション、ログアウト） |
| Home | `pages/Home` | Home | `pages/Home` | ✅ 完了 | Visit一覧・詳細ページ |
| Designs | `pages/Designs` | - | - | ⏳ 未実装 | PFS Design一覧・詳細ページ |

---

## 共通コンポーネント (components/)

| 既存コンポーネント | 既存パス | 新コンポーネント | 新パス | 状態 | 備考 |
|-------------------|---------|-----------------|-------|------|------|
| Icon, IconButton | `components/Icon` | Icon | `components/Icon` | ✅ 完了 | Material Symbolsアイコン |
| Loading, Block | `components/Loading` | LoadingSpinner, LoadingOverlay | `components/LoadingSpinner`, `components/LoadingOverlay` | ✅ 完了 | ローディング表示 |
| Tabs | `components/Tabs` | Tabs, TabPanel | `components/Tabs` | ✅ 完了 | タブUI |
| tippy (Tippy) | `components/Tippy.tsx` | Tooltip | `components/Tooltip` | ✅ 完了 | ツールチップ |
| DatePicker, DateRangePicker | `components/DatePicker` | - | - | ⏳ 未実装 | 日付選択/日付範囲選択 |
| LazyImage | `components/LazyImage` | - | - | ⏳ 未実装 | 遅延読み込み画像 |
| Flex, FlexColumn, FlexPadding, GridCellGroup | `components/layout` | - | - | ⏳ 未実装 | Flex/Grid等のレイアウトユーティリティ |
| FocalPlane | `components/pfs/FocalPlane.tsx` | - | - | ⏳ 未実装 | PFS焦点面可視化 |

---

## Homeページ機能 (pages/Home/)

### Visit一覧 (VisitSetList → VisitList)

| 既存機能 | 既存コンポーネント | 新コンポーネント | 状態 | 備考 |
|---------|------------------|-----------------|------|------|
| Visit一覧表示 | `VisitSetList` | `VisitList` | ✅ 完了 | IicSequenceでグループ化表示 |
| 列表示の切り替え | `VisitSetList/Columns` | `VisitList` (ColumnSelector) | ✅ 完了 | 表示列選択UI |
| SQLフィルタリング | `VisitSetList/SearchTextBox` | `VisitList` (SearchBar) | ✅ 完了 | WHERE句による検索 |
| ページネーション | `VisitSetList/Paginator` | `VisitList` (Paginator) | ✅ 完了 | オフセット/リミット |
| Go to Visit | `VisitSetList/ToolBar` (goToVisit) | `VisitList` | 🔶 一部完了 | UI実装済み、バックエンドAPI未実装 |
| CSV/JSONダウンロード | `VisitSetList/ToolBar` (downloadCsv/downloadJson) | - | ⏳ 未実装 | 一覧のエクスポート |
| 日付範囲フィルター | `VisitSetList/SearchConditions` | - | ⏳ 未実装 | DateRangePickerとの連携 |
| SQLシンタックスヘルプ | `SqlSyntaxHelp` | - | ⏳ 未実装 | SQL構文のヘルプダイアログ |

### Visit詳細 (VisitDetail)

| 既存機能 | 既存コンポーネント | 新コンポーネント | 状態 | 備考 |
|---------|------------------|-----------------|------|------|
| Visit基本情報 | `VisitDetail` | `VisitDetail` (Summary) | ✅ 完了 | ID、説明、発行日時、露出数 |
| SPS Inspector | `VisitInspector/SpsInspector` | `SpsInspector` | ✅ 完了 | SPS露出一覧、アノテーション表示 |
| MCS Inspector | `VisitInspector/McsInspector` | `McsInspector` | ✅ 完了 | MCS露出一覧、環境情報表示 |
| AGC Inspector | `VisitInspector/AgcInspector` | `AgcInspector` | ✅ 完了 | AGC露出一覧、ガイドオフセット表示 |
| IIC Sequence Info | `VisitInspector/IicSequence` | `IicSequenceInfo` | ✅ 完了 | シーケンス情報表示 |
| Sequence Group Info | `VisitInspector/SequenceGroup` | `SequenceGroupInfo` | ✅ 完了 | グループ情報表示 |
| Visit Notes表示 | `VisitDetail` (notes部分) | `VisitDetail` (Summary内) | 🔶 一部完了 | 表示のみ（CRUD未実装） |
| FITS Header Info | `FitsHeaderInfo` | - | ⏳ 未実装 | FITSヘッダー表示（HDU選択、検索機能付き） |
| FITS Preview画像 | `SpsInspector` (LazyImage), `McsInspector`, `AgcInspector` | - | ⏳ 未実装 | FITSプレビュー画像表示 |
| FITS Download | `SpsInspector` (downloadRawExposures) | - | ⏳ 未実装 | FITSファイルダウンロード |
| Image Type選択 | `SpsInspector` (raw/postISRCCD) | - | ⏳ 未実装 | 画像タイプ切り替え |
| Image Size選択 | `SpsInspector` (scale) | - | ⏳ 未実装 | プレビューサイズ切り替え |

### Note機能 (NoteList)

| 既存機能 | 既存コンポーネント | 新コンポーネント | 状態 | 備考 |
|---------|------------------|-----------------|------|------|
| メモ一覧表示 | `NoteList` | - | 🔶 一部完了 | Visit詳細内で表示のみ |
| メモ作成 | `NoteList/NewNote` | - | ⏳ 未実装 | 認証必須 |
| メモ編集 | `NoteList/Note` (edit) | - | ⏳ 未実装 | 自分のメモのみ編集可 |
| メモ削除 | `NoteList/Note` (delete) | - | ⏳ 未実装 | 自分のメモのみ削除可 |

---

## Designsページ機能 (pages/Designs/)

| 既存機能 | 既存コンポーネント | 新コンポーネント | 状態 | 備考 |
|---------|------------------|-----------------|------|------|
| Design一覧 | `DesignList` | - | ⏳ 未実装 | PFS Design一覧表示 |
| Design詳細 | `DesignDetail` | - | ⏳ 未実装 | Design詳細情報 |
| Sky Viewer | `SkyViewer` | - | ⏳ 未実装 | 天球可視化メインビュー |
| Stellar Globe | `SkyViewer/StellarGlobe.tsx` | - | ⏳ 未実装 | WebGLベースの3D天球表示 |
| Design Circles | `SkyViewer/DesignCircles.tsx` | - | ⏳ 未実装 | Designマーカー描画 |

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
| 2024-12-30 | コンポーネント単位の詳細な機能一覧に更新 |
