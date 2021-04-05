import { defineComponent, PropType, ref, watchEffect } from "vue"
import { VisitListEntry } from "~/api-client"

export default defineComponent({
  setup($$) {

    const el = ref<null | HTMLDivElement>(null)

    watchEffect(() => {
      if ($$.selected) {
        el.value?.scrollIntoView({
          // behavior: 'smooth',
          block: 'nearest',
        })
      }
    })

    const render = () => {
      const classes = {
        visitEntry: true,
        selected: $$.selected,
        sps: $$.m.sps_present,
        mcs: $$.m.mcs_present,
      }
      return (
        <div ref={el} class={classes}>
          <div class="id">{$$.m.id}</div> <div class="time">@{time($$.m.issued_at)}</div> - {$$.m.description}
        </div>
      )
    }

    return render
  },
  props: {
    m: {
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