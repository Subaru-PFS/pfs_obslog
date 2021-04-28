# pfs-obslog

## やること
    * [ ] テストデータの作成
    * [ ] FITSファイルのサポート
        * [ ] ダウンロード
        * [ ] ヘッダの表示
        * [ ] 画像のプレビュー
    * [ ] UIの構成を考える
        * １つのvisitに対する情報量が多すぎてvisit内の情報でも欲しいものにすぐアクセスできない。
            * 現状は１つのvisitに対する情報は１ページにまとめてしまっている
        * １つのvisitに付随する情報は・・・
            * pfs_visit
            * sps_sequence
            * mcs_visit
                * exposures
            * sps_visit
                * exposures
            * FITSファイル
        * 改善案
            * タブ
            * ウインドウ
    * [ ] URLに表示している情報を埋め込む
    * [ ] spinner表示の再検討
        * 非同期に読み込むパーツが多く、ajax中にずっと画面ブロックのローディングが出ていると長いこと操作できない
    * [ ] メモのmarkdown化
        * 画像も貼り付けられるように

## 背景

PFSの観測中、またはエンジニアリング中にopDBの内容を確認したり諸々のメモを残すためのUIが必要である。PFS Obslogはそのために必要なGUIをWebブラウザーを通して提供する。

## 開発セットアップ

1. minicondaを`~/miniconda3`にインストール
1. Python環境のセットアップ
    ```bash
    git clone git@github.com:Subaru-PFS/pfs_obslog.git
    cd pfs_obslog/
    git checkout development
    ~/miniconda3/bin/conda create -n py39 python=3.9
    make setup python_home=~/minicoda3/envs/py39/bin/python
    ```
1. テストDBの構築
    ```bash
    make setup-test-db  
    ```

1. テストの実行
    ```bash
    make test
    ```

1. `src/pfs_obslog/server/userauth.py`の作成

    認証ロジックは非公開にしたいので、ファイルをどこかから手に入れるか自分で作る。

1. 起動
    ```bash
    make dev-server
    ```

## デプロイ

1. Python環境のセットアップ
    ```bash
    ~/miniconda3/bin/conda create -n py39 python=3.9
    ```

1. 起動
    ```bash
    make deploy
    ```

## 設計

### obslogに関連するテーブル
* `pfs_visit` を基本単位としてvisitのタイプ(SpS, MCS)に応じた詳細を表示する。
    * `pfs_visit` has one `sps_visit`
    * `pfs_visit` has many `mcs_exposures`
* `pfs_visit` は `visit_set` でまとめたい
    * `visit_set` has one `pfs_visit`

* １つのpfs_visitがsps_visit、mcs_exposure両方に含まれるかどうかは仮定しない。
    * DB上にその制約がないため
* sps_sequence(visit_set)でsps_visitをまとめる
* pfs_visitを走査しリストを作る
* pfs_visitに対応するvisit_setで束ねる
    * 対応するものがない場合は1つだけのpfs_visitを含むvisit_setを作りそこにpfs_visitを放り込む
    * MCSのデータの場合はそうなる

## schemaメモ

* pfs_visit has one visit_set (visit_set.pfs_visit_id が primary keyなので！)
* visit_set has one sps_sequence
* -> pfs_visit has one sps_sequence
* visit_setに紐づかないpfs_visitは8500件以上。
* １つのvisit_setに最大で350

### リスト構造
* VisitSet
    * note
        * リストの最上位要素
        * あれば`sps_sequence`レコードに対応
    * attributes
        * sps_sequence?
            * name
            * sequence_type
            * comments
            * cmd_str
            * status
            * processing_status[]
        * pfs_visit[]
            * note
                * 必ず１つは存在する
                * `pfs_visit`レコードに対応
            * attributes
                * pfs_description
                * sps_visit?
                    * note
                        * SpSデータの場合は存在する
                    * attributes
                        * exp_type
                        * sps_exposures?[]
                * mcs_exposures?[]
                    * note
                        * MCSデータの場合は存在する
