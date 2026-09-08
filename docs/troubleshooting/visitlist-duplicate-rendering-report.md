# VisitList で重複して見えるエントリ不具合レポート

## 概要

- 症状: `VisitList` で同じ `visit_id` のエントリが重複して表示されるように見えることがあった。
- 実際の原因: これは想定されたデータモデル上のケースではなく、フロントエンドの描画バグだった。
- 根本原因: `VisitList` は連続する `iic_sequence_id` ごとに visit をグループ化していたが、描画時の各グループの key に `iic_sequence_id` しか使っていなかった。

## 想定されるデータの振る舞い

- `pfs_visit.pfs_visit_id` はバックエンドモデルの主キーである。
- visit list のバックエンドは、まず `PfsVisit` から対象の visit ID を取得し、JOIN ベースのフィルタリングを使う場合は `distinct()` を適用する。
- その後の詳細クエリで、取得した各 visit 行に対して 1 つの `VisitListEntry` を組み立てる。

そのため、通常の想定では API レスポンスに同じ `visit_id` を持つ複数のリスト項目が意図的に含まれることはない。

## フロントエンド側の根本原因

修正前の `VisitList` では、次の組み合わせになっていた。

1. `compileVisitGroups()` は、現在の visit の sequence が直前の visit から変わったときだけグループを分割していた。
2. 描画されるグループの key には `group.iicSequence?.iic_sequence_id` しか使っていなかった。

このため、`A -> B -> A` のような sequence 順序を持つページでは、sequence `A` に対して視覚上は 2 つの別グループが生成される一方、両方のグループに同じ React key が割り当てられていた。

React の key は兄弟要素間で一意でなければならない。異なる 2 つのグループで同じ key を再利用すると、更新やページネーション変更時の再コンシリエーションで誤った subtree が使われ、visit 行が重複している、または古い行が残っているように見えることがある。

## 発生条件

このバグが起きるには、現在表示中の visit ページ内で同じ `iic_sequence_id` が非連続な複数の区間に現れる必要があった。

典型的な発生パターンは次の通り。

- 先頭ページでの自動更新
- ページネーションの変更
- `Load more newer` / `Load more older`
- 1 ページ内で見える visit の並びが組み替わるようなフィルタ変更

これらのケースでは、同じ sequence 区間が同一の group key を共有したまま、ある描画ツリーから別の描画ツリーへ遷移する可能性があった。

## `visit_id` 行が重複して見えた理由

各グループ内の行 key にはすでに `visit.id` が使われており、これは正しい。

しかし、親グループの key 重複によってグループコンポーネントの再コンシリエーションが誤ると、React は本来とは異なるグループ subtree を再利用してしまう。その結果、画面上では次のような見え方になり得る。

- 同じ行が 2 回表示される
- データが変わった後も行が残り続ける
- ある行が本来属するグループから消えたように見える

そのため、バックエンドデータ自体は一意のままでも、UI 上の症状としては `visit_id` が重複しているように見えていた。

## 実施した修正

この修正では、visit の順序を保つため既存の「連続区間ごとのグループ化」動作は維持しつつ、各グループが固有の key を持つようにした。

- グループ化ロジックを `frontend/src/pages/VisitsBrowser/VisitList/visitGrouping.ts` に切り出した
- `VisitGroup.key` を追加した
- グループ key を sequence 区間の境界、つまり sequence ID と先頭 visit ID の組み合わせから生成するようにした
- `VisitList.tsx` を更新し、`key={group.key}` でグループを描画するようにした
- `A -> A -> B -> A` という sequence パターンに対する回帰テストを追加した

## 検証

変更前のベースライン:

- `cd frontend && npm run test:run` ✅
- `cd frontend && npm run build` ✅
- `cd frontend && npm run lint` ❌ 無関係なファイル `src/pages/Designs/SkyViewer/HscPdr3Layer.tsx` ですでに失敗していた

変更後の検証:

- `cd frontend && npx eslint src/pages/VisitsBrowser/VisitList/VisitList.tsx src/pages/VisitsBrowser/VisitList/visitGrouping.ts src/pages/VisitsBrowser/VisitList/visitGrouping.test.ts` ✅
- `cd frontend && npm run test:run` ✅
- `cd frontend && npm run build` ✅

## 変更ファイル

- `frontend/src/pages/VisitsBrowser/VisitList/VisitList.tsx`
- `frontend/src/pages/VisitsBrowser/VisitList/visitGrouping.ts`
- `frontend/src/pages/VisitsBrowser/VisitList/visitGrouping.test.ts`
