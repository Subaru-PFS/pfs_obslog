import { defineComponent } from "vue"
import style from './style.module.scss'

export default defineComponent({
  setup() {
    return () =>
      <div class={style.box}>
        <div class={style.loader}></div>
      </div>
  },
})
