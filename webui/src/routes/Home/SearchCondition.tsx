import { defineComponent, PropType, reactive, watchEffect } from "@vue/runtime-core"
import { MI } from "~/components/MaterialIcon"
import { useVisitList } from "./useVisitList"

export default defineComponent({
  setup() {
    const visitList = useVisitList()

    const $ = visitList.q.date

    const render = () => (
      <div class="search-condition" style={{ display: 'flex', alignItems: 'center' }}>
        <div class="type">
          <label>
            <input type="checkbox" checked={true} disabled={true} /> SpS
            </label>
          <label >
            <input type="checkbox" checked={true} disabled={true} /> MCS
          </label>
        </div>
        <div class="date" style={{ display: 'flex', alignItems: 'center' }}>
          {MI('date_range')}
          <DateInput v-model={$.begin} />
          <button onClick={e => $.range = !$.range}>{MI('more_horiz', 18)}</button>
          {$.range && <DateInput v-model={$.end} />}
        </div>
      </div>
    )
    return render
  }
})


const DateInput = defineComponent({
  setup($$, { emit }) {
    const $ = reactive({
      value: $$.modelValue || null,
    })

    watchEffect(() =>
      emit('update:modelValue', $.value)
    )

    const render = () => (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={e => $.value = null} disabled={$$.disabled}>
          {MI('cancel', 18)}
        </button>
        <input type="date" v-model={$.value} disabled={$$.disabled} />
      </div>
    )
    return render
  },
  props: {
    modelValue: {
      type: String as PropType<string | null>,
    },
    disabled: {
      type: Boolean,
      default: false,
    }
  }
})