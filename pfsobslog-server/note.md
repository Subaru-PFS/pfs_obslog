* ファイル構成

    ```
    pfsobslog/
        router/
            path operationをまとめる
            pydanticモデルの一部はここで定義しても良いかも
        apischemas/
            共用されるapiのpydanticモデル
        dbmodels/
            osblogで使うテーブル定義
    ```

* apischemasはAPI入出力のためだけに使い、ロジックはdbmodelsに集める