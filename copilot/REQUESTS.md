
* [x] 移行後の不足機能の修正

  移行後リリースをしたら以下の機能が移行前と比べて不足していると指摘を受けました。
  既存プロジェクトの該当コードと見比べて、機能を移植してください。

  修正内容が不明な場合は指示者に確認してください。

  * [x] visit detailのAGCのサムネールが表示されません。（勘違いでした）

  * [x] Thumbnail and header of AG images are missing.
    * ~~確かにエラー表示が起きている。例えばvisit=135826など。~~
    * 対応済み: URL形式を修正（スラッシュ→ハイフン）
    * 追加対応: ROOT_PATH デフォルトを './' から '' に変更（先頭の`/`が余計につく問題を修正）

  * [x] A button to bulk download SpS FITS file is missing
    * ~~bulkとはどういう意味だろう？既存プロジェクトに対応するものがあるか確認してください。~~
    * 対応済み: Download Allボタンを追加（Raw/postISRCCD）

  * [x] A button to download postISRCCD image is missing
    * 対応済み: 個別ダウンロードボタンを2つに分離

  * [x] (visit detailのSpSの画像について) column name was just only number, not `SM[1234]`
    * 対応済み: 列名を数字のみに変更（SM1-4 → 1-4）

  * [x] (おそらくvisit set listのvisit setのgroupについて) The color is "scienceTrace" has changed, and very similar to  scienceObject now. (I think it was closed to the cell color for camera number in the figure)
    * 対応済み: scienceTraceを#00fベースの色に分離

  * [x] (design inspectorにて) Maybe some fiber statuses (such as BROKENCOBRA) is missing?
    * 対応済み: BROKENCOBRA, NOTCONVERGED, BAD_PSFを追加

  * [x] On the design viewer, guide stars used to be marked with triangles (but circles are used now).
    * 対応済み: ガイド星マーカーを三角形に変更

* [ ] 指示者に追加の依頼がないか確認（ask_for_instructionsを使い）
