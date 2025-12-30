# pfs-obslog フロントエンド仕様書

## 概要

PFS Obslog のフロントエンドは SolidJS + TypeScript で構築されたSPA (Single Page Application) です。観測データの閲覧、検索、ノート追加などの機能を提供します。

## 技術スタック

- **フレームワーク**: SolidJS 1.6.10
- **言語**: TypeScript 4.9.5
- **ビルドツール**: Vite 4.1.1
- **ルーティング**: solid-app-router 0.4.2
- **スタイリング**: SCSS Modules
- **API通信**: openapi-typescript-fetch
- **状態管理**: SolidJSリアクティブプリミティブ
- **Node.js**: 16.17.1 (Volta管理)

## プロジェクト構造

```
webui/src/
├── App.tsx              # ルートコンポーネント・ルーティング定義
├── index.tsx            # エントリーポイント
├── index.scss           # グローバルスタイル
├── api/
│   ├── index.ts         # API設定・ヘルパー
│   └── schema.ts        # OpenAPI生成型定義
├── session/
│   └── index.tsx        # 認証・セッション管理
├── pages/
│   ├── Home/            # ホーム画面 (Visit一覧・詳細)
│   ├── Login/           # ログイン画面
│   ├── Designs/         # PFS Design画面
│   ├── Header/          # ヘッダーコンポーネント
│   └── Devel/           # 開発用画面
├── components/
│   ├── DatePicker/      # 日付選択
│   ├── Icon/            # アイコン
│   ├── LazyImage/       # 遅延読み込み画像
│   ├── Loading/         # ローディング表示
│   ├── Tabs/            # タブコンポーネント
│   ├── Tippy.tsx        # ツールチップ
│   ├── layout/          # レイアウトコンポーネント
│   └── pfs/             # PFS固有コンポーネント
├── styles/
│   └── *.module.scss    # 共有スタイルモジュール
└── utils/               # ユーティリティ関数
```

## ルーティング

```typescript
// App.tsx
<Routes>
  <Route path="/" element={<Navigate href='/visits' />} />
  <Route path="/visits/sql-syntax-help" element={<SqlSyntaxHelp />} />
  <Route path="/visits/:visit_id?" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/designs/:design_id?" element={<Designs />} />
</Routes>
```

| パス | コンポーネント | 説明 |
|------|---------------|------|
| `/` | - | `/visits` へリダイレクト |
| `/visits/:visit_id?` | Home | Visit一覧・詳細画面 |
| `/visits/sql-syntax-help` | SqlSyntaxHelp | SQL構文ヘルプ |
| `/login` | Login | ログイン画面 |
| `/designs/:design_id?` | Designs | PFS Design画面 |

## 認証・セッション (session/)

### セッション管理

```typescript
// セッション取得
const [session, { mutate: mutateSession }] = createResource(
  async () => (await getSession({})).data
)

// ログイン
export async function login(username: string, password: string)

// ログアウト
export async function logout()

// 現在のユーザー取得
export function useCurrentUser()
```

### 認証保護

```typescript
// 認証必須コンポーネントラッパー
export function requireLogin<Y, Z>(X: (props: Z) => Y) {
  return (props: Z) => (
    <RequireLogin>
      <X {...props} />
    </RequireLogin>
  )
}
```

未認証の場合は `/login` へリダイレクト。

## API通信 (api/)

### 設定

```typescript
import { Fetcher } from "openapi-typescript-fetch"

export const fetcher = Fetcher.for<paths>()

fetcher.configure({
  baseUrl,
  use: [errorHandler]
})
```

### 使用例

```typescript
// API呼び出し
const api = fetcher.path('/api/visits/{id}').method('get').create()
const { data } = await api({ id: visitId })

// URL生成 (ダウンロードリンク等)
const url = apiUrl('/api/visits.csv').methods('get').create({ sql, limit })
```

### エラーハンドリング

- 409, 422: 個別処理
- その他: アラート表示

## 主要ページ

### Home (/pages/Home/)

Visit一覧・詳細を表示するメインページ。

#### 構造

```
Home
├── HomeContext (状態管理)
├── VisitSetList (左ペイン)
│   ├── ToolBar
│   │   ├── SearchTextBox
│   │   ├── SearchConditions
│   │   ├── Columns (表示カラム選択)
│   │   └── Paginator
│   └── SearchResult (Visit一覧)
└── VisitDetail (右ペイン)
    ├── VisitInspector
    │   ├── Summary
    │   └── Tabs
    │       ├── SpS Inspector
    │       ├── MCS Inspector
    │       ├── AGC Inspector
    │       ├── IIC Sequence
    │       └── Sequence Group
    └── FitsHeaderInfo
```

#### コンテキスト (context.tsx)

```typescript
function makeContext() {
  const [refreshHomeSignal, setRefreshHomeSignal] = createSignal<RefreshParams>({})
  const [visitId, setVisitId] = createSignal(...)
  const [goToVisitSignal, goToVisit] = createSignal<GotoVisitParams>({})

  return {
    visitId,
    setVisitId,
    refreshHomeSignal,
    refreshHome,
    goToVisit,
    goToVisitSignal,
  }
}
```

#### VisitSetList 機能

- **検索**: SQLライクなWHERE句またはテキスト検索
- **フィルター**: 日付範囲、露出タイプ (SpS/MCS/AGC)
- **ページネーション**: オフセットベース
- **表示カラム選択**: 動的カラム表示
- **エクスポート**: CSV/JSON

#### VisitDetail 機能

- **サマリー**: Visit基本情報
- **タブ表示**:
  - SpS: SpS露出一覧
  - MCS: MCS露出一覧・プロット
  - AGC: AGC露出一覧
  - IIC Sequence: シーケンス情報
  - Sequence Group: グループ情報
- **ノート**: 追加・編集・削除
- **FITSヘッダー**: メタデータ表示

### Designs (/pages/Designs/)

PFS Design の管理画面。

#### 構造

```
Designs
├── Designs2Provider (コンテキスト)
├── DesignList (左ペイン - デザイン一覧)
├── SkyViewer (天球表示)
└── DesignDetail (詳細情報)
```

### Login (/pages/Login/)

ログイン画面。ユーザー名・パスワードで認証。

## 共通コンポーネント

### layout/

```typescript
// Flexboxレイアウト
<Flex>        // display: flex
<FlexColumn>  // display: flex; flex-direction: column
<FlexPadding> // flex-grow: 1
<Center>      // 中央揃え

// グリッドレイアウト
<GridCellGroup>
```

### Icon/

Material Iconsを使用したアイコンコンポーネント。

```typescript
<Icon icon="search" />
<IconButton icon="refresh" onClick={...} tippy={{ content: 'Refresh' }} />
```

### Loading/

```typescript
<Loading />           // ローディングスピナー
<Block when={...}>    // 条件付きブロッキング表示
  {children}
</Block>
```

### Tabs/

```typescript
<Tabs
  activeTabIndex={index()}
  onActiveTabIndexChange={setIndex}
  tabs={[
    { title: 'Tab1', contents: () => <Content1 /> },
    { title: 'Tab2', contents: () => <Content2 /> },
  ]}
/>
```

### DatePicker/

日付・日付範囲選択コンポーネント。vanillajs-datepickerを使用。

### Tippy.tsx

tippy.jsを使用したツールチップ。

```typescript
<button use:tippy={{ content: 'Tooltip text' }}>
  Click me
</button>
```

## 状態管理パターン

### SolidJSリアクティブプリミティブ

```typescript
// シグナル
const [value, setValue] = createSignal(initialValue)

// リソース (非同期データ)
const [data, { mutate, refetch }] = createResource(fetcher)

// メモ化
const computed = createMemo(() => expensiveComputation())

// エフェクト
createEffect(() => {
  // リアクティブ値の変更を監視
})
```

### コンテキストパターン

```typescript
// コンテキスト作成
const Context = createContext<ContextType>()

// プロバイダー
function MyProvider(props) {
  const context = makeContext()
  return (
    <Context.Provider value={context}>
      {props.children}
    </Context.Provider>
  )
}

// 使用
function useMyContext() {
  return useContext(Context)!
}
```

## スタイリング

### SCSS Modules

```typescript
import styles from './styles.module.scss'

<div class={styles.container}>
  <div class={styles.header}>...</div>
</div>
```

### 型生成

```bash
# SCSSモジュールの型定義を生成
npm run generate-scss-types

# 監視モード
npm run watch-scss-types
```

### 共有スタイル

- `split.module.scss`: 分割ペインスタイル
- `grid.module.scss`: グリッドスタイル

## Split Pane

split-gridを使用した分割可能なペイン。

```typescript
import Split from 'split-grid'

onMount(() => {
  const split = Split({
    columnGutters: [{
      track: 1,
      element: gutterElement,
    }],
  })
  onCleanup(() => split.destroy())
})
```

## ビルド・開発

### スクリプト

```json
{
  "scripts": {
    "start": "vite",
    "dev": "vite",
    "build": "vite build --base=./",
    "refresh-api-schema": "openapi-typescript http://127.0.0.1:8000/openapi.json --output src/api/schema.ts",
    "type-check": "tsc --noEmit"
  }
}
```

### 開発サーバー

```bash
npm run dev
# http://localhost:5173
```

### ビルド

```bash
npm run build
# dist/に出力
```

### API型定義更新

バックエンドのOpenAPIスキーマから型定義を生成:

```bash
npm run refresh-api-schema
```

## 外部ライブラリ

### lib-webui/stellar-globe

天球表示用のカスタムライブラリ。SkyViewer で使用。

### 主要依存関係

- `solid-js`: UIフレームワーク
- `solid-app-router`: ルーティング
- `openapi-typescript-fetch`: API通信
- `immer`: 不変性ヘルパー
- `split-grid`: 分割ペイン
- `tippy.js`: ツールチップ
- `vanillajs-datepicker`: 日付選択
- `gl-matrix`: 行列計算 (3D表示)
- `material-icons`: アイコン

## レスポンシブ・UI考慮事項

1. **分割ペイン**: ユーザーがドラッグでリサイズ可能
2. **ローディング状態**: 非同期処理中の適切なフィードバック
3. **エラーハンドリング**: API エラー時のアラート表示
4. **トランジション**: solid-transition-group による遷移アニメーション

## 型定義

### Visit関連

```typescript
type VisitDetailType = {
  id: number
  description: string | null
  issued_at: string | null
  notes: VisitNote[]
  sps: SpsVisit | null
  mcs: McsVisit | null
  agc: AgcVisit | null
  iic_sequence: IicSequenceDetail | null
}

type VisitResponse = {
  id: number
  description: string | null
  issued_at: string | null
  visit_set_id: number | null
  n_sps_exposures: number
  n_mcs_exposures: number
  n_agc_exposures: number
  // ... 他のフィールド
}
```

### IICシーケンス

```typescript
type IicSequenceResponse = {
  visit_set_id: number
  sequence_type: string | null
  name: string | null
  comments: string | null
  cmd_str: string | null
  status: IicSequenceStatus | null
  notes: VisitSetNote[]
  group: SequenceGroup | null
}
```

## ノート機能

### Visitノート

```typescript
// 作成
await createNote({ visit_id, body })

// 更新
await updateNote({ visit_id, id, body })

// 削除
await deleteNote({ visit_id, id })
```

### VisitSetノート

同様のCRUD操作。IICシーケンスレベルでのノート。

## 検索機能

### テキスト検索

入力テキストが `where` で始まらない場合、自動的に:

```sql
WHERE any_column LIKE '%{input}%'
```

に変換される。

### SQL検索

`where` で始まる入力はSQLとして処理:

```sql
WHERE issued_at >= '2024-01-01' AND is_sps_visit
```

### フィルターUI

- 日付範囲
- 露出タイプ (SpS/MCS/AGC の有無)
