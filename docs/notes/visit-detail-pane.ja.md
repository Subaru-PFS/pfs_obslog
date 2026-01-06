# Visit詳細ペイン 調査レポート

## 概要

Homeページの右側に表示されるVisit詳細ペインの実装について、既存プロジェクト（`old-project/codebase`）の調査結果をまとめる。

## 現在の状態

### フロントエンド

- [Home.tsx](../frontend/src/pages/Home/Home.tsx): 右ペインに placeholder を表示
- `selectedVisitId` がある場合「Visit #xxx の詳細（未実装）」と表示
- 選択なしの場合「左のリストからVisitを選択してください」と表示

### バックエンド

- `/api/visits`: Visit一覧取得APIは実装済み
- `/api/visits/{id}`: Visit詳細取得APIは**未実装**

---

## 既存プロジェクトの構造

### ファイル構成

```
old-project/codebase/webui/src/pages/Home/VisitDetail/
├── index.tsx              # メインコンポーネント
├── context.tsx            # FitsIdの状態管理
├── types.ts               # 型定義
├── VisitInspector/        # Visit情報表示
│   ├── index.tsx          # タブ切り替え＋サマリー
│   ├── styles.module.scss
│   ├── SpsInspector/      # SpS露出詳細
│   ├── McsInspector/      # MCS露出詳細
│   ├── AgcInspector/      # AGC露出詳細
│   ├── IicSequence/       # シーケンス情報
│   └── SequenceGroup/     # シーケンスグループ情報
└── FitsHeaderInfo/        # FITSヘッダー表示
    ├── index.tsx
    └── styles.module.scss
```

### レイアウト

詳細ペインは**上下分割**されている：

1. **上部（VisitInspector）**: Visitのサマリー＋タブ切り替えの露出情報
2. **下部（FitsHeaderInfo）**: 選択したFITSファイルのヘッダー情報

`split-grid`ライブラリで分割バーをドラッグ可能にしている。

---

## コンポーネント詳細

### 1. VisitDetail（メインコンポーネント）

```tsx
// API呼び出し
const api = fetcher.path('/api/visits/{id}').method('get').create()
const [detail, { refetch }] = createResource(() => props.id, async id => (await api({ id })).data)
```

- `split-grid`で上下分割
- 上部: `VisitInspector`
- 下部: `FitsHeaderInfo`
- 初期比率: `1fr 8px 250px`（下部固定250px）

### 2. VisitDetailContext

選択中のFITSファイル情報を保持：

```typescript
type FitsId = {
  visit_id: number
  type: 'sps' | 'mcs' | 'agc'
  fits_id: number  // camera_id, frame_id, or exposure_id
}
```

### 3. VisitInspector

#### サマリー表示

| 項目 | 内容 |
|------|------|
| ID | Visit IDと左リストへの遷移ボタン |
| Description | pfs_visit_description |
| Issued at | 発行日時 |
| Number of Exposures | SpS/MCS/AGC の露出数 |
| Notes | Visitに紐づくメモ（追加・編集・削除可能） |

#### タブ

1. **SpS**: SpS露出一覧（画像表示あり）
2. **MCS**: MCS露出一覧（画像表示あり）
3. **AGC**: AGC露出一覧（画像表示あり）
4. **IIC Sequence**: シーケンス情報
5. **Sequence Group**: シーケンスグループ情報

タブ切り替え時に`setFitsId`を呼び出してFitsHeaderInfoの表示を更新。

### 4. SpsInspector

- 露出タイプ、露出数、平均露出時間を表示
- Image Type選択（Raw / postISRCCD）
- Image Size選択（Small / Medium / Large）
- Download All（FITSファイル一括ダウンロード）
- **4x4グリッドテーブル**で露出画像を表示
  - 行: arm（n, r, m, b）
  - 列: module（1-4）
  - 各セルにカメラID、画像プレビュー、ダウンロードボタン

### 5. McsInspector

- 露出数、平均露出時間を表示
- Image Type選択（Plot / Raw）
- Image Size選択
- **リスト形式**で各露出を表示
  - Frame ID
  - Plot画像（`/api/mcs_data/{frame_id}.png`）
  - Raw画像（`/api/fits/visits/{visit_id}/mcs/{frame_id}.png`）
  - FITSヘッダー表示ボタン
  - FITSダウンロードボタン
  - JSONプレビューボタン

### 6. AgcInspector

- 露出数、平均露出時間を表示
- Image Size選択
- **ページネーション**あり（1ページ20件）
- 各露出に6カメラの画像を表示
  - Exposure ID
  - 6つのHDU（カメラ）の画像プレビュー

### 7. IicSequence

- Visit Set ID、Name、Type、Statusを表示
- コマンド文字列（cmd_str）を表示
- コメントを表示
- **メモ機能**（追加・編集・削除）

### 8. SequenceGroup

- Group ID、Name、Created atを表示

### 9. FitsHeaderInfo

- 選択されたFITSファイルのヘッダー情報を表示
- HDU選択（0, 1, 2, ...）
- Key/Value/Commentの検索フィルター
- テーブル形式で表示

---

## バックエンドAPI

### `/api/visits/{id}` レスポンス

```typescript
interface VisitDetail {
  id: number
  description: string | null
  issued_at: string | null
  notes: VisitNote[]
  sps: SpsVisit | null
  mcs: McsVisit | null
  agc: AgcVisit | null
  iic_sequence: IicSequenceDetail | null
}

interface SpsVisit {
  exp_type: string
  exposures: SpsExposure[]
}

interface SpsExposure {
  camera_id: number
  exptime: number
  exp_start: string
  exp_end: string
  annotation: SpsAnnotation[]
}

interface McsVisit {
  exposures: McsExposure[]
}

interface McsExposure {
  frame_id: number
  exptime: number | null
  altitude: number | null
  azimuth: number | null
  insrot: number | null
  // ... その他の環境情報
  taken_at: string
  notes: McsExposureNote[]
}

interface AgcVisit {
  exposures: AgcExposure[]
}

interface AgcExposure {
  id: number
  exptime: number | null
  altitude: number | null
  azimuth: number | null
  insrot: number | null
  // ... その他の環境情報
  taken_at: string | null
  guide_offset: AgcGuideOffset | null
}

interface IicSequenceDetail extends IicSequence {
  notes: VisitSetNote[]
  group: SequenceGroup | null
  status: IicSequenceStatus | null
}
```

### 画像取得API（既存プロジェクト）

| エンドポイント | 説明 |
|--------------|------|
| `/api/fits/visits/{visit_id}/sps/{camera_id}.png` | SpS露出の画像プレビュー |
| `/api/fits/visits/{visit_id}/sps/{camera_id}.fits` | SpS露出のFITSダウンロード |
| `/api/fits/visits/{visit_id}/mcs/{frame_id}.png` | MCS露出の画像プレビュー |
| `/api/fits/visits/{visit_id}/mcs/{frame_id}.fits` | MCS露出のFITSダウンロード |
| `/api/fits/visits/{visit_id}/agc/{exposure_id}.png` | AGC露出の画像プレビュー |
| `/api/fits/visits/{visit_id}/agc/{exposure_id}.fits` | AGC露出のFITSダウンロード |
| `/api/mcs_data/{frame_id}.png` | MCSプロット画像 |
| `/api/fits/visits/{visit_id}/{exposure_type}/{fits_id}/meta` | FITSヘッダー情報 |

---

## 実装の優先順位（提案）

### Phase 1: 基本構造

1. `/api/visits/{id}` エンドポイント実装（バックエンド）
2. `VisitDetail` コンポーネント作成（タブなし、サマリーのみ）
3. 基本情報（ID、Description、Issued at、露出数）の表示

### Phase 2: 露出情報タブ

1. `SpsInspector` の実装（画像なし、テーブルのみ）
2. `McsInspector` の実装（画像なし、リストのみ）
3. `AgcInspector` の実装（画像なし、リストのみ）
4. `IicSequence` の実装
5. `SequenceGroup` の実装

### Phase 3: 画像機能

1. FITS画像APIの実装（バックエンド）
2. 画像プレビュー機能
3. FITSダウンロード機能

### Phase 4: FITSヘッダー

1. FITSヘッダーAPI実装（バックエンド）
2. `FitsHeaderInfo` コンポーネント実装
3. 上下分割レイアウト

### Phase 5: メモ機能

1. メモCRUD API（既存の`VisitNote`を活用）
2. メモUI実装

---

## 使用ライブラリ（既存プロジェクト）

- **split-grid**: 上下分割のリサイズ
- **tippy.js**: ツールチップ
- **SolidJS**: UIフレームワーク（新プロジェクトはReact）

---

## 注意事項

- 既存プロジェクトはSolidJSで書かれているため、Reactへの移植が必要
- `createSignal` → `useState`
- `createResource` → RTK Query
- `createMemo` → `useMemo`
- `createEffect` → `useEffect`
- `For` → `map`
- `Show` → 条件付きレンダリング
