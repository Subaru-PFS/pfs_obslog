* フロントエンドの開発サーバーで`/obslog/api`へのAPIリクエストがバックエンドの開発サーバーにプロキシされるように設定してください。
  これは開発時にフロントエンドのdevserverにアクセスすることによってバックエンドのAPIを利用できるようにするためです。

* また、バックエンドのエンドポイントは全て`/obslog/api`で始まるようにしてください。
  * `/obslog`の部分はpydantic-settingsによって設定可能にしてください。(デフォルトで`/obslog`にしてください。)
    * pydantic-settingsの環境変数はcase sensitiveにしてください。環境変数のprefixはPFS_OBSLOG_としてください。

* フロントエンドでもバックエンドのエンドポイントは`/obslog/api`で始まるようにしてください。
  * `/obslog`の部分はviteの環境変数によって設定可能にしてください。(デフォルトで`/obslog`にしてください。)
  * ReactRouterはHashRotuerを使ってください。

* フロントエンドに認証の仕組みを実装してください。
  * 認証が必要なルートはログインルートにリダイレクトするようにしてください。
  * 画面は old-project/codebase/webui/src/pages/Login/index.tsx を参考にしてください。

このタスクの実現のためにOpenAPI周りで多少の試行錯誤が必要になるかもしれません。
もしそういうことがあれば、その際に得られた知見を.github/copilot-instructions.mdに追記してください。
