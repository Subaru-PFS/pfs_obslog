import { defineComponent, onMounted, PropType, reactive, watchEffect } from "vue"
import { api } from "~/api"
import { Visit } from "~/api-client"

export default defineComponent({
  setup($p) {
    const $ = reactive({
      selected_ids: [] as number[],
      members: [] as Visit[],
      offset: 0,
    })

    watchEffect(async () => {
      $.members = (await api.pfsVisitIndex($.offset)).data
    })

    watchEffect(() => {
      $p.onChange($.selected_ids)
    })

    const render = () => {
      const options = $.members.map(m =>
        <option key={m.id} value={m.id}>{m.id} ({m.description}) {m.issued_at}</option>
      )
      return (<>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <input type="text" v-model={$.offset} />
          <button onClick={() => $.offset -= 100} disabled={$.offset == 0}>🔼</button>
          <select v-model={$.selected_ids} multiple style={{ flexGrow: 1 }}>
            {options}
          </select>
          <button onClick={() => $.offset += 100}>🔽</button>
        </div>
      </>)
    }

    return render
  },
  props: {
    onChange: {
      type: Function as PropType<(selected_ids: number[]) => void>,
      required: true,
    }
  },
})
