# フロントエンドコンポーネント移行状況

このドキュメントは既存プロジェクト（`old-project/codebase/webui`）から新プロジェクトへのフロントエンドコンポーネント移行状況を追跡します。

**注**: 既存プロジェクトは SolidJS で実装されており、新プロジェクトは React に移植されています。

## 移行状況サマリー

| カテゴリ | 完了 | 一部完了 | 未完了 | 進捗率 |
|----------|------|----------|--------|--------|
| ページ・レイアウト | 5 | 0 | 0 | 100% |
| 共通コンポーネント | 8 | 0 | 0 | 100% |
| Home: Visit一覧 | 8 | 0 | 0 | 100% |
| Home: Visit詳細 | 12 | 0 | 0 | 100% |
| Home: Note機能 | 4 | 0 | 0 | 100% |
| Designs機能 | 5 | 0 | 0 | 100% |
| **合計** | **42** | **0** | **0** | **100%** |

---

## ページ・レイアウト

| 既存コンポーネント | 既存パス | 新コンポーネント | 新パス | 状態 | 備考 |
|-------------------|---------|-----------------|-------|------|------|
| Login | `pages/Login` | Login | `pages/Login` | ✅ 完了 | ログインフォーム |
| Header | `pages/Header` | Header | `components/Header` | ✅ 完了 | ヘッダー（ナビゲーション、ログアウト） |
| Home | `pages/Home` | Home | `pages/Home` | ✅ 完了 | Visit一覧・詳細ページ |
| SqlSyntaxHelp | `pages/Home/SqlSyntaxHelp` | SqlSyntaxHelp | `pages/SqlSyntaxHelp` | ✅ 完了 | SQL構文ヘルプページ |
| Designs | `pages/Designs` | Designs | `pages/Designs` | ✅ 完了 | PFS Design一覧・詳細ページ |

---

## 共通コンポーネント (components/)

| 既存コンポーネント | 既存パス | 新コンポーネント | 新パス | 状態 | 備考 |
|-------------------|---------|-----------------|-------|------|------|
| Icon, IconButton | `components/Icon` | Icon, IconButton | `components/Icon` | ✅ 完了 | Material Symbolsアイコン |
| Loading, Block | `components/Loading` | LoadingSpinner, LoadingOverlay | `components/LoadingSpinner`, `components/LoadingOverlay` | ✅ 完了 | ローディング表示 |
| Tabs | `components/Tabs` | Tabs, TabPanel | `components/Tabs` | ✅ 完了 | タブUI |
| tippy (Tippy) | `components/Tippy.tsx` | Tooltip | `components/Tooltip` | ✅ 完了 | ツールチップ |
| LazyImage | `components/LazyImage` | LazyImage | `components/LazyImage` | ✅ 完了 | 遅延読み込み画像 |
| NoteList | `pages/Home/NoteList` | NoteList | `components/NoteList` | ✅ 完了 | メモ一覧（CRUD対応） |
| DatePicker, DateRangePicker | `components/DatePicker` | DateRangePicker | `components/DateRangePicker` | ✅ 完了 | 日付範囲選択 |
| FocalPlane | `components/pfs/FocalPlane.tsx` | FocalPlane | `components/FocalPlane` | ✅ 完了 | PFS焦点面可視化 |

---

## Homeページ機能 (pages/Home/)

### Visit一覧 (VisitSetList → VisitList)

| 既存機能 | 既存コンポーネント | 新コンポーネント | 状態 | 備考 |
|---------|------------------|-----------------|------|------|
| Visit一覧表示 | `VisitSetList` | `VisitList` | ✅ 完了 | IicSequenceでグループ化表示 |
| 列表示の切り替え | `VisitSetList/Columns` | `VisitList` (ColumnSelector) | ✅ 完了 | 表示列選択UI |
| SQLフィルタリング | `VisitSetList/SearchTextBox` | `VisitList` (SearchBar) | ✅ 完了 | WHERE句による検索 |
| ページネーション | `VisitSetList/Paginator` | `VisitList` (Paginator) | ✅ 完了 | オフセット/リミット |
| Go to Visit | `VisitSetList/ToolBar` (goToVisit) | `VisitList` | ✅ 完了 | Visit IDで直接ジャンプ |
| CSVダウンロード | `VisitSetList/ToolBar` (downloadCsv) | `VisitList` | ✅ 完了 | 一覧のCSVエクスポート |
| 日付範囲フィルター | `VisitSetList/SearchConditions` | `VisitList` + `DateRangePicker` | ✅ 完了 | issued_atによる日付絞り込み |
| SQLシンタックスヘルプ | `SqlSyntaxHelp` | `SqlSyntaxHelp` | ✅ 完了 | SQL構文のヘルプページ |

### Visit詳細 (VisitDetail)

| 既存機能 | 既存コンポーネント | 新コンポーネント | 状態 | 備考 |
|---------|------------------|-----------------|------|------|
| Visit基本情報 | `VisitDetail` | `VisitDetail` (Summary) | ✅ 完了 | ID、説明、発行日時、露出数 |
| SPS Inspector | `VisitInspector/SpsInspector` | `SpsInspector` | ✅ 完了 | SPS露出一覧、プレビュー画像表示 |
| MCS Inspector | `VisitInspector/McsInspector` | `McsInspector` | ✅ 完了 | MCS露出一覧、環境情報表示 |
| AGC Inspector | `VisitInspector/AgcInspector` | `AgcInspector` | ✅ 完了 | AGC露出一覧、ガイドオフセット表示 |
| IIC Sequence Info | `VisitInspector/IicSequence` | `IicSequenceInfo` | ✅ 完了 | シーケンス情報表示 |
| Sequence Group Info | `VisitInspector/SequenceGroup` | `SequenceGroupInfo` | ✅ 完了 | グループ情報表示 |
| Visit Notes | `VisitDetail` (notes部分) | `VisitDetail` + `NoteList` | ✅ 完了 | メモのCRUD機能付き |
| FITS Preview画像 | `SpsInspector` (LazyImage) | `SpsInspector` + `LazyImage` | ✅ 完了 | SPS FITSプレビュー画像表示 |
| Image Type/Size選択 | `SpsInspector` (settings) | `SpsInspector` | ✅ 完了 | raw/postISRCCD、サイズ選択 |
| FITS Header Info | `FitsHeaderInfo` | `FitsHeaderDialog` | ✅ 完了 | FITSヘッダー表示（SPS/MCS対応、HDU選択、検索機能付き）、ダイアログ形式 |
| FITS Download | `SpsInspector` (downloadRawExposures) | `SpsInspector`, `McsInspector`, `AgcInspector` | ✅ 完了 | FITSファイルダウンロード |
| MCS/AGC Preview画像 | `McsInspector`, `AgcInspector` | `McsInspector`, `AgcInspector` | ✅ 完了 | MCS/AGC FITSプレビュー画像表示 |

### Note機能 (NoteList)

| 既存機能 | 既存コンポーネント | 新コンポーネント | 状態 | 備考 |
|---------|------------------|-----------------|------|------|
| メモ一覧表示 | `NoteList` | `NoteList` | ✅ 完了 | Visit詳細内で表示 |
| メモ作成 | `NoteList/NewNote` | `NoteList` | ✅ 完了 | 認証必須 |
| メモ編集 | `NoteList/Note` (edit) | `NoteList` | ✅ 完了 | 自分のメモのみ編集可 |
| メモ削除 | `NoteList/Note` (delete) | `NoteList` | ✅ 完了 | 自分のメモのみ削除可 |

---

## Designsページ機能 (pages/Designs/)

| 既存機能 | 既存コンポーネント | 新コンポーネント | 状態 | 備考 |
|---------|------------------|-----------------|------|------|
| Design一覧 | `DesignList` | `DesignList` | ✅ 完了 | PFS Design一覧表示（検索、ソート、グループ化対応） |
| Design詳細 | `DesignDetail` | `DesignDetail` | ✅ 完了 | 焦点面可視化、ファイバー/デザイン詳細パネル |
| Sky Viewer | `SkyViewer` | `SkyViewer` | ✅ 完了 | 天球可視化メインビュー（HiPS、星、星座） |
| Stellar Globe | `SkyViewer/StellarGlobe.tsx` | `SkyViewer` | ✅ 完了 | stellar-globeライブラリによる3D天球表示 |
| Design Circles | `SkyViewer/DesignCircles.tsx` | `SkyViewer` (DesignMarkers) | ✅ 完了 | Designマーカー描画（クリック/ホバー対応） |

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
| 2024-12-31 | Header, Layout, NoteList, LazyImage, SPS FITS Preview 完了 |
| 2024-12-31 | Go to Visit, SQLシンタックスヘルプページ完了 |
| 2024-12-31 | Design Viewer完了 (FocalPlane, DesignList, SkyViewer, DesignDetail) |
