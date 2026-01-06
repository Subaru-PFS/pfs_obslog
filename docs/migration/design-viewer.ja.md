# Design Viewer 仕様書

このドキュメントは既存プロジェクト（`old-project/codebase/webui/src/pages/Designs`）のDesign Viewer機能の詳細な仕様を記述します。新プロジェクトへの移植時の参考資料として使用してください。

## 概要

Design Viewerは、PFS（Prime Focus Spectrograph）の観測設計（PFS Design）を可視化・管理するための機能です。主に以下の3つのコンポーネントで構成されています：

1. **DesignList** - Design一覧のサイドパネル
2. **SkyViewer** - WebGLベースの天球表示メインビュー
3. **DesignDetail** - 焦点面ビューとファイバー詳細パネル

### ページ構成

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

### 認証

Design Viewerは認証必須のページです（`requireLogin`でラップ）。

---

## 1. DesignList（Design一覧）

### 1.1 機能概要

Design一覧を左サイドパネルに表示します。検索、ソート、フィルタリング機能を提供。

### 1.2 表示項目

各Designエントリには以下の情報を表示：

| 項目 | 説明 | 表示例 |
|------|------|--------|
| name | Design名 | `COSMOS_deep_1` |
| id | Design ID（Hex/Decimal切替可能） | `1a2b3c4d5e6f7890` |
| date_modified | 更新日時 | `2025-12-30 12:34:56` |
| ファイバー数 | science/sky/fluxstd/photometry/guidestar | `100 / 20 / 10 / 50 / 6` |
| 座標 | RA, Dec, Altitude | `α=150.00°, δ=2.00°, Alt.=45.00°` |

### 1.3 ユーザー設定（localStorage保存）

| 設定キー | 選択肢 | デフォルト | 説明 |
|---------|--------|-----------|------|
| `/DesignList/idFormat` | `hex` / `decimal` | `hex` | ID表示形式 |
| `/DesignList/sortOrder` | `altitude` / `date_modified` | `altitude` | ソート順 |

### 1.4 検索・フィルタリング

- **検索テキストボックス**: Design名またはIDで正規表現検索
- 大文字小文字を区別しない（`'i'`フラグ）
- 無効な正規表現はそのまま文字列マッチ

### 1.5 ソート

1. **altitude（高度順）**: 現在の天頂からの角距離でソート（観測しやすい順）
2. **date_modified（更新日時順）**: 新しい順

### 1.6 グループ化

同一座標付近（0.001度以内）のDesignは同一グループとして表示。

```typescript
const designCrossMatchCosine = Math.cos(angle.deg2rad(0.001))
```

### 1.7 エントリ操作ボタン

| ボタン | アイコン | 機能 |
|--------|---------|------|
| Download | `download` | FITSファイルをダウンロード |
| Copy ID | `content_copy` | IDをクリップボードにコピー |

### 1.8 インタラクション

- **クリック**: Designを選択し、天球ビューでその位置にジャンプ
- **マウスホバー**: フォーカス表示（天球上でもハイライト）
- **選択中**: シアン色でハイライト
- **フォーカス中**: マゼンタ色でハイライト

### 1.9 スタイル

```scss
// 選択状態の色
.entry-selected { background: linear-gradient(to bottom, #0ff lighter, #0ff darker) }
.entry-hover { background: linear-gradient(to bottom, #cac lighter, #cac darker) }
.entry-selected-hover { background: linear-gradient(to bottom, #aff lighter, #aff darker) }
```

---

## 2. SkyViewer（天球表示）

### 2.1 技術スタック

- **@stellar-globe/stellar-globe**: WebGLベースの天球可視化ライブラリ
- Pan-STARRS DR1画像タイル（HiPS形式）を背景として表示
- React版: `react-stellar-globe`パッケージが`external/stellar-globe/react-stellar-globe`に存在

### 2.2 表示レイヤー

以下のレイヤーを重ねて表示：

1. **HipparcosCatalogLayer**: ヒッパルコス星カタログの恒星
2. **ConstellationLayer**: 星座線
3. **SimpleImageLayer**: Pan-STARRS DR1天体画像（HiPS）
   - URL: `//alasky.cds.unistra.fr/Pan-STARRS/DR1/color-i-r-g`
   - LOD Bias: -0.25
4. **GridLayer (AltAz)**: 高度方位座標グリッド
   - 水平線（赤）: 12分割
   - 天頂方向: オレンジ
   - 基準色: 青
5. **GridLayer (EquatorialGrid)**: 赤道座標グリッド（白、薄い）
6. **MarkersLayer**: Design位置マーカー（円形）
7. **SingleMarker**: フォーカス/選択中のDesignマーカー

### 2.3 カメラ設定

```typescript
const tilt = Math.PI / 2  // 天頂から水平線方向に傾斜

// 初期視野角
fovy: 2  // ラジアン

// Designにジャンプ時
fovy: angle.deg2rad(0.8)  // 約0.8度
```

### 2.4 Designマーカー

```typescript
const FOV = angle.deg2rad(1.4)  // マーカー直径（PFS視野に相当）
const markerColor: V4 = [0.75, 0.75, 0.5, 1]  // 通常
const focusColor: V4 = [1, 0, 1, 0.75]        // フォーカス（マゼンタ）
const selectedColor: V4 = [0, 1, 1, 1]        // 選択（シアン）
```

### 2.5 時刻コントロール

| UI要素 | 機能 |
|--------|------|
| DatePicker | 日付選択（HST基準） |
| Clock | アナログ時計UI（ドラッグで時刻変更） |
| "Set time to now" | 現在時刻に設定 |
| "Center Zenith" | 天頂を中心に表示 |
| "Fiber Markers" | ファイバーマーカー表示ON/OFF |

### 2.6 ハワイ標準時（HST）

```typescript
const HstTzOffset = 600  // 分単位（UTC-10:00）
```

### 2.7 すばる望遠鏡位置

```typescript
const SubaruTelescopeLocation = {
  lat: angle.dms2deg('19:49:32'),   // 北緯19度49分32秒
  lon: angle.dms2deg('-155:28:36')  // 西経155度28分36秒
}
```

### 2.8 マウス操作

- **ドラッグ**: パン（視点移動）
- **スクロール**: ズーム
- **マーカークリック**: Designを選択
- **マーカーホバー**: Designをフォーカス

---

## 3. DesignDetail（焦点面ビュー）

### 3.1 構成要素

1. **FocalPlane**: PFS焦点面のファイバー配置可視化（Canvas 2D）
2. **色分け選択**: Target Type / Fiber Status
3. **凡例（Legend）**: 色の意味を表示
4. **FiberDetail / DesignSummary**: 詳細情報パネル

### 3.2 FocalPlane コンポーネント

#### 3.2.1 幾何学的構成

```
- 3つのセクター（Field）
- 各セクター14モジュール
- 各モジュール57コブラ
- 合計: 3 × 14 × 57 = 2,394 コブラ
```

#### 3.2.2 コブラ位置計算

```typescript
const DELX = Math.sqrt(3)  // 横方向間隔
const DELY = 1             // 縦方向間隔

// コブラID（1-based）からローカル座標を計算
const x0 = -DELX * ((cm0 % 2 == 0 ? 1 : 2) + 2 * mf0)
const y0 = -DELY * ((cm0 - 1) - 2 * mf0)

// セクターに応じて回転（120度ずつ）
const [x, y] = rotation(x0, y0, f0 * 4 * Math.PI / 3)
```

#### 3.2.3 表示サイズ

- デフォルトサイズ: 250px（幅は√3/2倍）
- 六角形の半径: 58（単位座標系）

### 3.3 色分けモード

#### 3.3.1 Target Type（ターゲットタイプ）

| 値 | 名前 | 色 | 説明 |
|----|------|-----|------|
| 1 | SCIENCE | lightsteelblue | 科学ターゲット |
| 2 | SKY | yellow | スカイ（空の減算用） |
| 3 | FLUXSTD | magenta | フラックス標準星 |
| 4 | UNASSIGNED | gray | 未割り当て |
| 5 | ENGINEERING | red | エンジニアリング |
| 6 | SUNSS_IMAGING | olive | SuNSS イメージング |
| 7 | SUNSS_DIFFUSE | blue | SuNSS 拡散 |

#### 3.3.2 Fiber Status（ファイバー状態）

| 値 | 名前 | 色 | 説明 |
|----|------|-----|------|
| 1 | GOOD | lightsteelblue | 正常 |
| 2 | BROKENFIBER | red | 破損 |
| 3 | BLOCKED | orange | 一時的にブロック |
| 4 | BLACKSPOT | purple | ブラックスポット背後 |
| 5 | UNILLUMINATED | blue | 未照射 |

### 3.4 FiberDetail（ファイバー詳細）

マウスホバーしたコブラの詳細情報を表示：

#### 3.4.1 Fiber情報

| 項目 | 説明 |
|------|------|
| Cobra Id | コブラID（1-2394） |
| Fiber Id | ファイバーID |
| Module ID | モジュールID（1-42） |
| Sector ID | セクターID（1-3） |

#### 3.4.2 Design情報

| 項目 | 説明 |
|------|------|
| catId | カタログID |
| Tract/Patch | トラクト/パッチ |
| objId | オブジェクトID |
| α | 赤経 |
| δ | 赤緯 |
| Target Type | ターゲットタイプ名 |
| Fiber Status | ファイバー状態名 |
| pfiNominal | 公称位置 |

#### 3.4.3 Photometry情報

| 項目 | 単位 | 説明 |
|------|------|------|
| filterName | - | フィルター名 |
| fiberFlux | nJy | ファイバーフラックス |
| fiberFluxErr | nJy | ファイバーフラックスエラー |
| psfFlux | nJy | PSFフラックス |
| psfFluxErr | nJy | PSFフラックスエラー |
| totalFlux | nJy | トータルフラックス |
| totalFluxErr | nJy | トータルフラックスエラー |

### 3.5 DesignSummary（Design概要）

コブラをホバーしていない時に表示：

| 項目 | ソース |
|------|--------|
| Name | FITSヘッダー `DSGN_NAM` |
| Modified | ファイル更新日時 |
| α | FITSヘッダー `RA` |
| δ | FITSヘッダー `DEC` |
| Position Angle | FITSヘッダー `POSANG` |
| Arms | FITSヘッダー `ARMS` |

---

## 4. SkyViewer内のDesignDetail（ファイバーマーカー）

### 4.1 概要

選択されたDesignのファイバー位置を天球上にマーカーとして表示。

### 4.2 マーカータイプ

| タイプ | 形状 | 対象 |
|--------|------|------|
| Circle | 円 | ターゲットファイバー |
| Polygon (Triangle) | 三角形 | ガイド星 |

### 4.3 色

ターゲットファイバーはTarget Typeに応じた色で表示。
ガイド星は赤色。

### 4.4 表示制御

- "Fiber Markers"チェックボックスでON/OFF
- ズームレベルに応じてアルファ値が変化（広域では薄く、近づくと濃く）

```typescript
const minFovy = Math.log(angle.deg2rad(0.025))
const maxFovy = Math.log(angle.deg2rad(2))
// fovyがminFovy～maxFovyの範囲でアルファが0～1に変化
```

---

## 5. Context（状態管理）

### 5.1 Designs2Provider

以下の状態を管理：

| 状態 | 型 | 説明 |
|------|-----|------|
| designs | `{ store: { list: PfsDesignEntry[] }, loading, refetch }` | Design一覧 |
| designDetail | `Resource<PfsDesignDetail>` | 選択中Designの詳細 |
| showFibers | `boolean` | ファイバーマーカー表示 |
| jumpToSignal | `JumpToOptions` | カメラジャンプ指示 |
| focusedDesign | `PfsDesignEntry \| undefined` | フォーカス中Design |
| selectedDesign | `PfsDesignEntry \| undefined` | 選択中Design |
| now | `Date` | 表示時刻 |
| telescopeLocation | `{ lat, lon }` | 望遠鏡位置 |
| zenithSkyCoord | `SkyCoord` | 現在の天頂座標 |

### 5.2 URLルーティング

```
/designs                  → Design未選択
/designs/{design_id}      → 指定Designを選択
```

Design選択時、URLパラメータ`design_id`が更新される。
URL直接アクセス時、対応するDesignを自動選択・フォーカス。

---

## 6. API エンドポイント

### 6.1 使用するAPI

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/api/pfs_designs` | Design一覧取得 |
| GET | `/api/pfs_designs/{id_hex}` | Design詳細取得 |
| GET | `/api/pfs_designs/{id_hex}.fits` | FITSファイルダウンロード |

### 6.2 PfsDesignEntry スキーマ

```typescript
interface PfsDesignEntry {
  id: string              // 16進数ID
  frameid: string         // ファイル名
  name: string            // Design名
  date_modified: string   // ISO 8601日時
  ra: number              // 赤経（度）
  dec: number             // 赤緯（度）
  arms: string            // 使用アーム
  num_design_rows: number // Design行数
  num_photometry_rows: number
  num_guidestar_rows: number
  design_rows: {
    science: number
    sky: number
    fluxstd: number
    unassigned: number
    engineering: number
    sunss_imaging: number
    sunss_diffuse: number
  }
}
```

### 6.3 PfsDesignDetail スキーマ

```typescript
interface PfsDesignDetail {
  fits_meta: FitsMeta
  date_modified: string
  design_data: {
    fiberId: number[]
    catId: number[]
    tract: number[]
    patch: string[]
    objId: number[]
    ra: number[]
    dec: number[]
    targetType: number[]
    fiberStatus: number[]
    pfiNominal: [number, number][]
  }
  photometry_data: {
    fiberId: number[]
    fiberFlux: number[]
    psfFlux: number[]
    totalFlux: number[]
    fiberFluxErr: number[]
    psfFluxErr: number[]
    totalFluxErr: number[]
    filterName: string[]
  }
  guidestar_data: {
    ra: number[]
    dec: number[]
  }
}
```

---

## 7. 依存ライブラリ

### 7.1 stellar-globe

WebGL天球可視化ライブラリ。

**既存プロジェクト（SolidJS版）で使用:**
```typescript
import { Globe, SkyCoord, angle, ... } from '@stellar-globe/stellar-globe'
```

**新プロジェクト（React版）:**
```
external/stellar-globe/react-stellar-globe
```

主要エクスポート:
- `Globe$` - Globeコンポーネント
- `HipparcosCatalogLayer$` - 恒星レイヤー
- `ConstellationLayer$` - 星座レイヤー
- `HipsSimpleLayer$` - HiPS画像レイヤー
- `GridLayer$` - グリッドレイヤー
- `MarkerLayer$` - マーカーレイヤー
- `PathLayer$` - パスレイヤー
- `useGetGlobe` - Globeインスタンス取得フック

### 7.2 その他の依存

| ライブラリ | 用途 |
|-----------|------|
| gl-matrix | 行列・ベクトル演算 |
| Color | 色操作（legend.ts） |
| KdTree | 空間インデックス（マーカー選択） |

---

## 8. 実装時の注意点

### 8.1 SolidJS → React 変換

| SolidJS | React |
|---------|-------|
| `createSignal` | `useState` |
| `createEffect` | `useEffect` |
| `createMemo` | `useMemo` |
| `createResource` | RTK Query |
| `on([deps], fn)` | `useEffect` with deps |
| `For` | `Array.map` |
| `Show` | 条件付きレンダリング |

### 8.2 stellar-globeのReact版使用

既存のSolidJS向けコードを、`react-stellar-globe`のコンポーネント/フックに置き換え。

```tsx
// 例: React版での使用
import { Globe$, HipsSimpleLayer$, MarkerLayer$ } from 'react-stellar-globe'

function SkyViewer() {
  return (
    <Globe$ viewOptions={{ fovy: 2 }}>
      <HipsSimpleLayer$ baseUrl="..." />
      <MarkerLayer$ markers={...} />
    </Globe$>
  )
}
```

### 8.3 Cobra ID → Fiber ID マッピング

`cobId2fiberId.json` マッピングファイルが必要。
`old-project/codebase/webui/src/components/pfs/cobId2fiberId.json` を移植。

### 8.4 パフォーマンス考慮

- Design一覧の検索はデバウンス処理（100ms）
- 天頂座標計算もデバウンス
- ファイバーマーカーは大量（数千個）あるため、BillboardRendererで効率的に描画

### 8.5 localStorage キー

| キー | 値 |
|------|-----|
| `/DesignList/idFormat` | `'hex'` \| `'decimal'` |
| `/DesignList/sortOrder` | `'altitude'` \| `'date_modified'` |

---

## 9. ファイル構成（移植後の想定）

```
frontend/src/
├── pages/
│   └── Designs/
│       ├── index.tsx           # メインページ
│       ├── DesignsContext.tsx  # 状態管理
│       ├── types.ts            # 型定義
│       ├── legend.ts           # 色定義
│       ├── DesignList/
│       │   ├── index.tsx
│       │   └── DesignList.module.scss
│       ├── SkyViewer/
│       │   ├── index.tsx
│       │   ├── StellarGlobe.tsx
│       │   ├── DesignCircles.tsx
│       │   ├── DesignMarkers.tsx
│       │   ├── Clock/
│       │   │   ├── index.tsx
│       │   │   ├── drawClock.ts
│       │   │   └── Clock.module.scss
│       │   └── SkyViewer.module.scss
│       └── DesignDetail/
│           ├── index.tsx
│           ├── FiberDetail.tsx
│           ├── DesignSummary.tsx
│           └── DesignDetail.module.scss
├── components/
│   └── FocalPlane/
│       ├── index.tsx
│       ├── Cobra.ts
│       ├── cobId2fiberId.json
│       └── FocalPlane.module.scss
```

---

## 10. 移植チェックリスト

### 10.1 基盤

- [ ] stellar-globe (React版) の組み込み設定
- [ ] ルーティング設定（`/designs`, `/designs/:design_id`）
- [ ] 型定義（PfsDesignEntry, PfsDesignDetail）
- [ ] API統合（RTK Query）

### 10.2 DesignList

- [ ] Design一覧表示
- [ ] 検索機能
- [ ] ソート機能（altitude/date_modified）
- [ ] ID表示形式切替（hex/decimal）
- [ ] グループ化表示
- [ ] 選択/フォーカス状態
- [ ] FITSダウンロードボタン
- [ ] IDコピーボタン
- [ ] localStorage永続化

### 10.3 SkyViewer

- [ ] Globe基本表示
- [ ] HiPS画像レイヤー
- [ ] 恒星・星座レイヤー
- [ ] グリッドレイヤー（AltAz, Equatorial）
- [ ] Designマーカー表示
- [ ] マーカー選択/フォーカス
- [ ] 時刻コントロール（DatePicker, Clock）
- [ ] 天頂センタリング
- [ ] ファイバーマーカー表示

### 10.4 DesignDetail

- [ ] FocalPlane描画
- [ ] 色分けモード切替
- [ ] 凡例表示
- [ ] ファイバー詳細表示
- [ ] Design概要表示

### 10.5 その他

- [ ] URLパラメータとの同期
- [ ] エラーハンドリング
- [ ] ローディング状態表示
- [ ] レスポンシブ対応

---

## 11. 参照

### 11.1 既存コード

- `old-project/codebase/webui/src/pages/Designs/` - メイン実装
- `old-project/codebase/webui/src/components/pfs/FocalPlane.tsx` - 焦点面コンポーネント
- `old-project/codebase/webui/src/components/pfs/cobId2fiberId.json` - ID マッピング

### 11.2 外部リソース

- [stellar-globe](https://github.com/niceno/stellar-globe) - 天球可視化ライブラリ
- [PFS datamodel](https://github.com/Subaru-PFS/datamodel) - データモデル仕様
- [HiPS (Hierarchical Progressive Surveys)](https://aladin.unistra.fr/hips/) - 天体画像形式

### 11.3 バックエンドAPI

- [backend/src/pfs_obslog/routers/pfs_designs.py](../../backend/src/pfs_obslog/routers/pfs_designs.py) - PFS Design API実装
