# Home

レイアウトに合わせて次のようなコンポーネントに別れている。
意味的に別れているわけではないのでHomeコンポーネント内で共有するべきデータは`provide`/`inject`(context)を使い共有する。

* SearchBox
* SearchCondition
* VisitList
* VisitInspector

## Context

Home componentで共有するデータは`homeContext.provide()`で作られ、子コンポーネントからは`homeContext.inject()`でそれにアクセスできる。

### 共有データ

* 検索条件
    * searchboxの文字列
    * SpSの個数条件、MCSの個数条件
    * 日付
    * 検索番号 (refresh用に)
* VisitInspectorで表示しているvisit_id

## VisitList

検索結果の表示。homeContextの検索条件をwatchしてその結果をリストに表示する。
検索結果はこのコンポーネントが保持する。


## VisitInspector

visitの詳細を表示する。
詳しいノートは[ここ](./VisitInspector/README.ja.md)。
