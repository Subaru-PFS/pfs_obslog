## 設計

### コンポーネントの分割について

Home画面は次の要素で作られている。

* 検索条件
* メニュー
* visit一覧テーブル
* visit詳細

これらの要素は独立しておらず、例えばvisit一覧テーブルでとあるvisitを選択すると、
visit詳細に選択されたvisitの内容が表示されたり、
visit詳細からvisitやvisitSetにコメントを追加すると、それがvisit一覧テーブルに反映されたりする。

これらの要素を全て１つのコンポーネントで実装するとコンポーネントが巨大になりすぎて難しいので適当に画面の部品単位で分割する。
共通して持つ必要のあるデータ、関数は `provide`/`inject` を使い共有する。

一方で`VisitInspector`, `VisitTable`などはこの画面以外でも単体で再利用できると嬉しい。
そういうコンポーネントでは `provide` / `inject` を使わずに外部とやりとりする必要がある。

`Home/index.tsx` はいわゆるコンテナコンポーネントで、
必要なら`router`とのやりとりもここで行い子コンポーネントにはさせない。

### 画面で共有するデータ

* `query`
  * 検索条件
  * `VisitTable`の表示内容を決めるために使う
  * propsで`VisitTable`に渡す
* `focusedVisitId`
  * `VisitInspector`の表示内容を決める
  * propsで`VisitInspector`に渡す
* `revision`
  * 画面に表示されている情報のリビジョン
  * これが増えると情報をリロードする

### ページリフレッシュ

`VisitInspector`でコメントを追加するとその変更は`VisitTable`にも反映されて欲しい。
`VisitTable`はpropsから`revision`を渡され、それを`watch`し変更があれば更新する。
`VisitTable`, `VisitInspector`は必要があれば`update:revision`イベントを発行しページ全体のリロードを促す。

### 再利用可能コンポーネント

* `VisitTable`
  * 概要

    propsの`query`に従ってvisitの一覧を表示する。
    queryの更新もする
  * props
    * `query.sync`
    * `revision.sync`
* `VisitInspector`
  * 概要

    propsの`visitId`のvisitの詳細を表示する。
  * props
    * `revision.sync`
    * `visitId.sync`
