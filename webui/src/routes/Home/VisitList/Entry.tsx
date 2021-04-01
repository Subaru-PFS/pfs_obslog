import { defineComponent, PropType, ref, watchEffect } from "vue"
import { VisitListEntry } from "~/api-client"

export default defineComponent({
  setup($$) {

    const el = ref<null | HTMLDivElement>(null)

    watchEffect(() => {
      if ($$.selected) {
        el.value?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    })

    const render = () => {
      const classes = {
        selected: $$.selected,
        sps: $$.m.sps_present,
        mcs: $$.m.mcs_present,
      }
      return <>
        <div
          ref={el} class={{ entry: true, ...classes }}
          style={{ userSelect: 'none', paddingLeft: '2em', width: '400px' }}
        >
          <div style={{ whiteSpace: 'pre' }}>
            {$$.m.id} [{$$.m.description}]
            </div>
        </div>
      </>
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
