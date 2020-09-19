import { defineComponent, Teleport } from "vue";
import style from './style.module.scss'

export default defineComponent({
  setup(_, { slots }) {
    return () => (
      <div class={[style.wrapper, 'fill-height']}>
        <div>
          {slots.default?.()}
        </div>
      </div>
    )
  }
})