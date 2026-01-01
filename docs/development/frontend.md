# フロントエンド開発ガイド

## 概要

- **UIライブラリ:** React 19
- **言語:** TypeScript
- **ビルドツール:** Vite
- **データフェッチ:** RTK Query
- **ルーティング:** React Router
- **スタイル:** SCSS Modules + typed-scss-modules

## ディレクトリ構造

```
frontend/src/
├── components/       # UIコンポーネント
│   └── Example/
│       ├── Example.tsx
│       ├── Example.module.scss
│       ├── Example.module.scss.d.ts  # 自動生成
│       └── index.ts
├── router/           # ルーティング設定
├── store/            # Redux store
│   └── api/          # RTK Query API
├── test/             # テスト設定
└── main.tsx          # エントリーポイント
```

## 開発コマンド

```bash
cd frontend

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ビルド
npm run build

# リント
npm run lint

# テスト
npm run test:run

# npm run test は対話モード

# カバレッジ付きテスト
npm run test:coverage
```

## SCSS モジュールの型生成

SCSSファイルを追加・変更した場合は型ファイルを再生成してください。

```bash
# 一度だけ生成
npm run scss:types

# 監視モード（開発中に使用）
npm run scss:watch
```

生成された `.d.ts` ファイルはコミットしてください。

## RTK Query APIの生成

バックエンドのOpenAPIスキーマからRTK Queryのコードを自動生成します。

```bash
npm run generate-api
```

- バックエンドAPIが変更された場合は再生成が必要
- 生成された `generatedApi.ts` は直接編集しない
- カスタマイズは `emptyApi.ts` で行う

詳細は [frontend/README.md](../frontend/README.md) を参照。
