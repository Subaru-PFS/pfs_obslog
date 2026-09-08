* [ ] visit set listのExposure Timeの欄の実装の調査

  これはどういう実装になっていますか？１のvisitにSpS, MCS, AGCのExposureがあるときはどういう計算になっているか調べてください。

* [ ] avg_exptimeの仕様をフロントエンドのツールチップに表示

  以下のavg_exptimeの仕様をフロントエンドのテーブルのTHにマウスオーバーした時のツールチップに表示してください。

  1つのVisitにおける露出の平均時間を表示しています。\n\n計算ロジック（優先順位: SPS > MCS > AGC）:\n- SPSの露出がある場合: SPSの全露出のexptimeの平均値\n- SPSがなくMCSがある場合: MCSの全露出のmcs_exptimeの平均値  \n- SPS/MCSがなくAGCがある場合: AGCの全露出のagc_exptimeの平均値\n\n複数種類のExposureがあっても混合しません（例: SPS+MCSがあればSPSの平均のみ表示）。

* [ ] 指示者に追加の依頼がないか確認（ask_for_instructionsを使い）
