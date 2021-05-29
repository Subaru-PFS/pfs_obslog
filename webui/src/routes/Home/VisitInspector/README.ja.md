# VisitInspector

visitの詳細を表示する。

## props

* `visit_id`
    * この値を`watchEffect`しサーバーからデータを取得する。


## Note

Noteの表示・編集は何箇所かあるがコンポーネントを共通化したい。

### API

`pfs_visit`, `sps_sequence`などに紐づくノート１つ１つには`create`, `destroy`, `update`の操作に対応するAPIがある。

### UI

* 一覧の各項目に対してmonaco editorで編集、削除
* 一覧の最後に１行コメント、monaco editorで編集→新規

### コンポーネント

* MarkdownViewer
* MonacoEditor
* MarkdownEditor
    * 概要
        * Markdownを編集するためのコンポーネント。
        * MonacoEditorでMDを編集しMarkdownViewerでプレビューできる
        * ファイルのDrag&Dropも受け付ける
    * props
        * onFileDrop, onSubmit, style, preview
* NewNote
    * 概要
        * ノートの１要素を作成するためのコンポーネント
        * 「簡易作成」「MD作成ボタン」があり
        * MarkdownEditorコンポーネントを利用
    * props
        * onFileDrop, onSubmit
* Note
    * 概要
        * 既存のノートを表示・編集・削除するためのコンポーネント
    * props
        * onFileDrop, onSubmit, onDelete
