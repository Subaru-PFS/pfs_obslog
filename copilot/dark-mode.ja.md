# ダークモード/ライトモード切り替え 実装方針（Frontend）

この文書は、PFS Obslog 2 のフロントエンドにおける「ダークモード/ライトモード切り替え」の設計方針と、後からリファクタリングしやすい実装段取り（チェックリスト）をまとめたものです。

対象: React + TypeScript + Vite、SCSS Modules（`frontend/src/**`）

---

## 現状（2026-01-11時点の実装）

- テーマのトークン（色など）は CSS カスタムプロパティ（CSS 変数）として定義されている
  - `frontend/src/index.css` の `:root`（light）と `:root[data-theme="dark"]`（dark）
- テーマ切り替えは `ThemeProvider` が `document.documentElement.dataset.theme` に `light|dark` を設定している
  - `frontend/src/components/Theme/ThemeContext.tsx`
- ヘッダにトグルボタンがあり、`useTheme()` の `toggleTheme()` を呼ぶ
  - `frontend/src/components/Header/Header.tsx`

### 気づき（要検討ポイント）

`ThemeContext.tsx` は「ユーザーが設定していない場合は system preference に追従する」意図がありますが、`prefers-color-scheme` 変化時に `setTheme()` を呼ぶため、結果として `localStorage` に保存してしまい、以降は system 追従ではなく“固定”になります。

- 期待仕様: system が変わったら UI も追従（ただしユーザーが明示設定している場合は固定）
- 現状挙動: system 変化で追従はするが、その瞬間に保存されて固定化される

この方針書では、ここをどう扱うか（2状態で割り切る／3状態で丁寧に扱う）を明確にします。

---

## 良い実装の方向性（候補）

### 候補A: CSS変数 + `data-theme`（推奨）

- テーマ差分は **CSS変数だけ** に集約する
- JS/React は **DOM ルートに `data-theme` を付け替えるだけ**
- コンポーネント側は `var(--token)`（もしくは `frontend/src/styles/theme.scss` の参照変数）だけを使う

このリポジトリは既にこの形に寄っているため、リファクタのコストが最小で済みます。

### 候補B: `prefers-color-scheme` のみ（トグル無し）

- CSS の `@media (prefers-color-scheme: dark)` のみで完結
- 要件が「切り替え（トグル）」なので今回は不採用

### 候補C: Tailwind の `dark:` variant

- Tailwind 前提のプロジェクトでは有効
- 本プロジェクトは SCSS Modules が中心なので、移行コストが大きく今回は非推奨

---

## 推奨アーキテクチャ（単一の真実を決める）

### ルール

1. **色（テーマ差分）は CSS 変数に集約**（`frontend/src/index.css`）
2. SCSS 側は **CSS 変数参照**を使う（`frontend/src/styles/theme.scss`）
3. TS/React 側は可能な限り **色をハードコードしない**
   - どうしても inline style が必要なら `'var(--token)'` を返す
4. DOM への反映点は **`<html>`（`document.documentElement`）の `data-theme` 1箇所**

---

## 「system 追従」をどう扱うか（2つの運用案）

### 案1: 2状態（light/dark）のみ。常にユーザー選択を保存

- 初期値だけ system を参照（localStorage が無い場合）
- 以降はトグルしたテーマを localStorage に保存し続ける
- `matchMedia` の listener は不要（消す）

利点:
- 実装が簡単。バグりにくい。

欠点:
- OS 設定変更に追従しない。

### 案2: 3状態（system/light/dark）。system のときだけ追従

- localStorage には `system|light|dark` を保存
  - または「保存が無い＝system」とする（この場合は system 変化時に**保存しない**ことが重要）
- `resolvedTheme`（実際に適用するテーマ）は次で決定
  - `mode === 'light'` → `light`
  - `mode === 'dark'` → `dark`
  - `mode === 'system'` → `matchMedia('(prefers-color-scheme: dark)')` で決定

利点:
- 意図が明確。system 追従が正しく動く。

欠点:
- 状態と UI の設計が少し増える（ただし API は小さく保てる）。

---

## 初期描画のチラつき（FOUC / flash of wrong theme）対策

React の `useEffect` で `data-theme` を設定すると、初回描画で一瞬 light が見える可能性があります。

推奨は「CSS が適用されるより前に `data-theme` を決める」ことです。

### 推奨手順（Vite/React）

- `frontend/src/preloadTheme.ts` を作って最小ロジックで `document.documentElement.dataset.theme` を設定
- `frontend/src/main.tsx` で **最初に** `import './preloadTheme'` し、その後 `import './index.css'`
  - こうすると CSS 注入前に `data-theme` が決まる

（代替）`frontend/index.html` の `<head>` にインラインスクリプトを入れる方法もありますが、Vite 環境では TS と共有しにくくなるため、まずは `preloadTheme.ts` を推奨します。

---

## リファクタリング段取り（具体）

### Step 0: 方針を決める

- 「案1（2状態）」か「案2（3状態）」かを決定
- この決定で `ThemeContext` の API が変わるため、最初に確定する

### Step 1: ThemeContext の責務を整理

対象: `frontend/src/components/Theme/ThemeContext.tsx`

- ルート DOM 反映（`document.documentElement.dataset.theme`）を 1箇所に集約
- system 追従をやる場合は「追従時に localStorage を更新しない」よう分離する
  - 例: `applyThemeToDom(theme)` と `persistPreference(mode)` を分ける

期待する結果:
- localStorage の内容（=ユーザー意思）と、画面適用（=resolved theme）が混ざらない

### Step 2: 初期化の早期適用

対象: `frontend/src/main.tsx` + 新規 `frontend/src/preloadTheme.ts`

- 起動直後に `data-theme` を確定させる
- 可能なら `ThemeProvider` の初期 state も同じロジックを共有する

期待する結果:
- リロード時にテーマが一瞬反転して見える現象が減る

### Step 3: 色のハードコードを減らす（CSS変数に寄せる）

#### 3.1 inline style を CSS 変数へ

対象例:
- `frontend/src/pages/VisitsBrowser/VisitDetail/VisitDetail.tsx`
- `frontend/src/utils/exposureColors.ts`

現状:
- `exposureColors.ts` が `#dddddd` のような固定色を返し、`VisitDetail.tsx` が inline style に流し込む

推奨:
- 可能なら SCSS class に寄せる（例: `expBadge expBadge--sps` のように）
- 難しければ `getExposureColorStyle()` が `backgroundColor: 'var(--exp-sps-bg)'` のように **CSS変数参照を返す**
  - こうすればテーマ変更時に自動追従する

期待する結果:
- JS に色定義が残らず、テーマ差分が `index.css` に集約される

#### 3.2 既存のトークンを優先利用

- 既に `index.css` に `--exp-*-bg/text/selected` などがある
- まずはそれらを参照する形に寄せ、足りないトークンがあれば `index.css` に追加する

### Step 4: 既存の dark 用上書きスタイルの整理

対象例:
- `frontend/src/components/DateRangePicker/DateRangePicker.scss`

- `:root[data-theme="dark"] { ... }` の形で上書きされている場合は、原則 OK
- ただし「特定コンポーネントだけ別の暗黙色を持つ」状態が増えると崩れやすいので、可能ならトークン化して `index.css` に吸収する

### Step 5: 掃除（unused を減らす）

- `exposureColorsSelected` のように未使用であれば削除候補
- 逆に必要なら「selected 状態」も CSS 変数で表現して、JS は参照のみ

### Step 6: 検証

最低限の目視チェック:
- Visits/Designs/Login の主要画面で読みやすい
- トグルで即時に切り替わる
- リロード後も設定が維持される（仕様による）
- system 追従を採用した場合、OS 設定変更に追従する（ただしユーザー固定時は追従しない）

追加できるなら（任意）:
- `ThemeContext` のユニットテスト（localStorage / dataset / matchMedia）

---

## 変更対象ファイル一覧（目安）

- `frontend/src/index.css`（トークン定義の単一ソース）
- `frontend/src/styles/theme.scss`（SCSS からトークン参照）
- `frontend/src/components/Theme/ThemeContext.tsx`（状態管理/DOM反映）
- `frontend/src/main.tsx`（初期適用の順序）
- `frontend/src/components/Header/Header.tsx`（トグル UI）
- `frontend/src/utils/exposureColors.ts`（色ハードコードの除去候補）
- `frontend/src/pages/VisitsBrowser/VisitDetail/VisitDetail.tsx`（inline style の見直し）

---

## 実務的な補助（探し方）

ハードコード色や「テーマ非対応になりやすい書き方」を探す例:

- `#` 付き 16進色（`#fff` / `#ffffff` など）
- `rgb(...)` / `hsl(...)` の直接指定
- `background-color: white` / `color: black` の直書き

まずは `frontend/src/**` を対象に検索し、見つかった箇所を「CSS変数参照 or トークン化」に寄せるのが安全です。
