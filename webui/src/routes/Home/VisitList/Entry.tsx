import { defineComponent, PropType, ref, watchEffect } from "vue"
import { VisitListEntry } from "~/api-client"
import { int } from "~/types"

export default defineComponent({
  setup($$) {
    const render = () => {
      const classes = {
        entry: true,
        selected: $$.selected,
        sps: $$.m.sps_present,
        mcs: $$.m.mcs_present,
      }
      return <>
        <div ref={el} class={classes} onClick={e => $$.onSelect($$.m.id)} style={{ userSelect: 'none' }}>
          {$$.m.id} / {$$.m.visit_set_id}
          <div>
            {$$.m.description}
          </div>
        </div>
      </>
    }

    const el = ref<null | HTMLDivElement>(null)

    watchEffect(() => {
      if ($$.selected) {
        el.value!.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    })

    return render
  },
  props: {
    m: {
      type: Object as PropType<VisitListEntry>,
      required: true,
    },
    onSelect: {
      type: Function as PropType<(id: int) => void>,
      required: true,
    },
    selected: {
      type: Boolean,
      required: true,
    },
  },
})
