# メモ

## アコーディオン
* vueのトランジション機能で実装する
    * `transform: height 0.2s` などで高さアニメーションをする場合`height`が数値で与えられている必要がある。
    * `v-on:enter`などの適当なタイミングでjsで`height`を数値で指定する必要がある。

## HMR
* `.vue`はHMRの対象だが`.jsx`はそうでない。
* `.jsx`ファイルをproxyするような`.vue`ファイルはHMRの対象になるが、毎回要するのは面倒
    ```jsx
    // HelloWorld.jsx
    export default defineComponent {
        return () => (
            <h1>Hello world</h1>
        )
    }
    ```
    ```js
    // HelloWorld.vue
    // <script>
    import { defineComponent } from 'vue'
    import HelloWorld './HelloWorld'

    export default defineComponent({
        setup() {
            return () => <HelloWorld />
        }
    })
    // </script>
    ```
* いっときrootコンポーネントだけ`.vue`にしてページ全体のリフレッシュを防いでいたが`vue-router`の導入でそれが無理になった。


### 参考
* https://note.com/noliaki/n/n6e3a60748c11