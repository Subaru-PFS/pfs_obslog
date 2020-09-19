import { defineComponent } from "vue"
import style from './style.module.scss'

export const Badge = defineComponent({
  props: {
    name: { type: String },
  },
  setup($p, { slots }) {
    return () => (
      <dl class={style.badge}>
        {$p.name && (<dt>{$p.name}: </dt>)}
        <dd>{slots.default?.()}</dd>
      </dl>
    )
  }
})
