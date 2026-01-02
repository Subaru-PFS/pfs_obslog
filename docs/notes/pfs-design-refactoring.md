# PFS Design Viewer リファクタリング調査

このドキュメントは PFS Design Viewer の現状把握と今後のリファクタリング検討のための調査結果をまとめたものです。

## 概要

Design Viewerは、PFS（Prime Focus Spectrograph）の観測設計（PFS Design）を可視化・管理するための機能です。

### 現在の実装状況

**バックエンドAPI**: ✅ 実装完了
**フロントエンド**: ✅ 実装完了（SolidJS → React移植済み）

---

## 1. API エンドポイント一覧

### バックエンド実装ファイル

- [backend/src/pfs_obslog/routers/pfs_designs.py](../../backend/src/pfs_obslog/routers/pfs_designs.py)

### エンドポイント

| メソッド | エンドポイント | 説明 | 認証 |
|---------|--------------|------|------|
| GET | `/api/pfs_designs` | Design一覧取得 | 不要 |
| GET | `/api/pfs_designs/{id_hex}` | Design詳細取得 | 不要 |
| GET | `/api/pfs_designs/{id_hex}.fits` | FITSファイルダウンロード | 不要 |

### レスポンススキーマ

#### PfsDesignEntry（一覧用）

```python
class PfsDesignEntry(BaseModel):
    id: str              # Design ID（16進数文字列）
    frameid: str         # ファイル名
    name: str            # Design名
    date_modified: datetime  # 更新日時
    ra: float            # 中心赤経
    dec: float           # 中心赤緯
    arms: str            # 使用するアーム
    num_design_rows: int # Design行数
    num_photometry_rows: int
    num_guidestar_rows: int
    design_rows: DesignRows  # ターゲットタイプ別行数
```

#### PfsDesignDetail（詳細用）

```python
class PfsDesignDetail(BaseModel):
    fits_meta: FitsMeta  # FITSメタデータ
    date_modified: datetime
    design_data: DesignData      # ファイバー配置データ
    photometry_data: PhotometryData  # 測光データ
    guidestar_data: GuidestarData    # ガイド星データ
```

---

## 2. フロントエンドコンポーネント構成

### ディレクトリ構造

```
frontend/src/pages/Designs/
├── Designs.tsx           # メインページ
├── DesignsContext.tsx    # 状態管理（React Context）
├── types.ts              # 型定義
├── legend.ts             # 色凡例定義
├── DesignList/
│   ├── DesignList.tsx    # Design一覧サイドパネル
│   └── DesignList.module.scss
├── SkyViewer/
│   ├── SkyViewer.tsx     # 天球表示（WebGL）
│   ├── Clock.tsx         # アナログ時計UI
│   └── SkyViewer.module.scss
└── DesignDetail/
    ├── DesignDetail.tsx  # 焦点面ビュー
    └── DesignDetail.module.scss
```

### 画面レイアウト

```
+------------------+------------------------------------------+
|                  |                                          |
|   DesignList     |           SkyViewer                      |
|   (左サイド)     |           (天球表示)                     |
|                  |                                          |
|                  +------------------------------------------+
|                  |                                          |
|                  |           DesignDetail                   |
|                  |           (焦点面ビュー)                 |
+------------------+------------------------------------------+
```

---

## 3. 主要コンポーネントの機能

### 3.1 DesignList（Design一覧）

**機能:**
- Design一覧の表示（検索、ソート、グループ化）
- ID表示形式の切り替え（Hex/Decimal）
- ソート順の切り替え（高度順/更新日時順）
- FITSダウンロード、IDコピー

**状態管理:**
- `idFormat`: localStorage保存
- `sortOrder`: localStorage保存
- `searchText`: ローカルstate

### 3.2 SkyViewer（天球表示）

**技術スタック:**
- `@stellar-globe/react-stellar-globe`: WebGL天球可視化
- Pan-STARRS DR1 HiPS画像をバックグラウンドに表示

**表示レイヤー:**
1. HipparcosCatalogLayer（恒星）
2. ConstellationLayer（星座線）
3. HipsSimpleLayer（Pan-STARRS画像）
4. GridLayer（AltAz / Equatorial）
5. ClickableMarkerLayer（Designマーカー）
6. PathLayer（選択/フォーカスハイライト）

**操作:**
- マウスドラッグ: 視点移動
- スクロール: ズーム
- マーカークリック: Design選択
- 時刻コントロール: 日付選択、アナログ時計

### 3.3 DesignDetail（焦点面ビュー）

**機能:**
- FocalPlaneコンポーネントでファイバー配置を可視化
- 色分けモード切り替え（Target Type / Fiber Status）
- ファイバーホバー時に詳細情報表示
- Design概要表示

**色分け定義:**

| Target Type | 色 |
|-------------|-----|
| SCIENCE | lightsteelblue |
| SKY | yellow |
| FLUXSTD | magenta |
| UNASSIGNED | gray |
| ENGINEERING | red |
| SUNSS_IMAGING | olive |
| SUNSS_DIFFUSE | blue |

---

## 4. 状態管理（DesignsContext）

React Contextを使用してページ全体の状態を管理:

| 状態 | 型 | 説明 |
|------|-----|------|
| `designs` | `PfsDesignEntry[]` | Design一覧 |
| `selectedDesign` | `PfsDesignEntry \| undefined` | 選択中Design |
| `focusedDesign` | `PfsDesignEntry \| undefined` | フォーカス中Design |
| `designDetail` | `PfsDesignDetail \| undefined` | 選択中Designの詳細 |
| `jumpToSignal` | `JumpToOptions \| null` | カメラジャンプ指示 |
| `showFibers` | `boolean` | ファイバーマーカー表示 |
| `now` | `Date` | 表示時刻 |
| `zenithSkyCoord` | `{ ra, dec }` | 天頂の赤道座標 |

---

## 5. 外部依存ライブラリ

| ライブラリ | 用途 | パス |
|-----------|------|------|
| `@stellar-globe/react-stellar-globe` | 天球可視化 | `external/stellar-globe/react-stellar-globe` |
| `react-use` | `useLocalStorage`フック | npm |

---

## 6. 既存プロジェクトとの差分

### SolidJS → React 変換

| SolidJS | React |
|---------|-------|
| `createSignal` | `useState` |
| `createEffect` | `useEffect` |
| `createMemo` | `useMemo` |
| `createResource` | RTK Query |
| `For` | `Array.map` |
| `Show` | 条件付きレンダリング |

### 旧プロジェクトにあって新プロジェクトにない機能

1. **`/api/pfs_designs.png` エンドポイント**: Design位置をmatplotlibでプロットする機能
   - 旧: `PlotDesignTask`で実装
   - 新: 未実装（SkyViewerで代替可能）

2. **キャッシュ機構**: FITSファイル読み込みのキャッシュ
   - 旧: `PickleCache`を使用
   - 新: 未実装（必要に応じて追加）

---

## 7. リファクタリング検討事項

### 7.1 パフォーマンス改善

- [ ] Design一覧取得のキャッシュ導入
- [ ] 検索のデバウンス処理追加
- [ ] ファイバーマーカー描画の最適化

### 7.2 機能追加案

- [ ] Design比較機能
- [ ] フィルタリング強化（アーム、ターゲットタイプ）
- [ ] エクスポート機能（CSV、JSONなど）

### 7.3 UI/UX改善

- [ ] レスポンシブデザイン対応
- [ ] キーボードショートカット
- [ ] ツールチップの情報充実

---

## 8. 関連ドキュメント

- [Design Viewer仕様書](../migration/design-viewer.md) - 詳細な仕様
- [バックエンドAPI移行状況](../migration/backend-api.md)
- [フロントエンドコンポーネント移行状況](../migration/frontend-components.md)
