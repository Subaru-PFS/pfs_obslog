import { defineComponent, PropType, ref, watchEffect } from "vue"
import { VisitListEntry } from "~/api-client"
import style from "./style.module.scss"

export default defineComponent({
  setup($$) {
    const el = ref<HTMLDivElement | undefined>()
    watchEffect(() => {
      if ($$.selected) {
        el.value?.scrollIntoView({
          // behavior: 'smooth',
          block: 'nearest',
        })
      }
    })
    return () =>
      <div
        ref={el}
        class={{ [style.selected]: $$.selected, [style.visitEntry]: true }}
      >
        <div class="id">{$$.visit.id}</div>
        <div class="time">
          @{time($$.visit.issued_at)}
        </div> - {$$.visit.description}
      </div>
  },
  props: {
    visit: {
      type: Object as PropType<VisitListEntry>,
      required: true,
    },
    selected: {
      type: Boolean,
      required: true,
    },
  },
})

function time(s?: string) {
  if (s) {
    return s.split('T')[1].slice(0, 5)
  }
}