# PFS-OBSLOG WebUI

## Routes

### Home
メイン画面


## Style管理

* 1度しか使わないようなレイアウトの指定のためにはstyle属性を使う
* 色に関してはdarkモード対応のためスタイルシートを使う
* アプリ共通パーツは`src/style`の中に書く
* それ以外はコンポーネントに付随させる
* 基本はlightモード用に書く
* darkモード用は`preferred color scheme`でファイルの最後ででもまとめて上書きする