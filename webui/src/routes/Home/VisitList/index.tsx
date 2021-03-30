import { defineComponent, PropType, reactive, watchEffect } from "vue"
import { api } from "~/api"
import { VisitListEntry } from "~/api-client"
import FlexScroll from "~/components/FlexScroll"
import Entry from "./Entry"

export default defineComponent({
  setup($$) {
    const $ = reactive({
      selectedIds: [] as number[],
      members: [] as VisitListEntry[],
      offset: 0,
    })

    watchEffect(async () => {
      const { visits, } = (await api.visitList($.offset)).data
      $.members = visits
    })

    watchEffect(() => {
      $$.onChange($.selectedIds)
    })

    const onKeydown = (e: KeyboardEvent) => {
      e.preventDefault()
      const index = $.members.findIndex(m => $.selectedIds.includes(m.id))
      switch (e.key) {
        case 'ArrowUp':
          $.selectedIds = [$.members[Math.max(index - 1, 0)].id]
          break
        case 'ArrowDown':
          $.selectedIds = [$.members[Math.min(index + 1, $.members.length - 1)].id]
          break
      }
    }

    const render = () => {
      const entries = $.members.map(m =>
        <Entry
          m={m}
          onSelect={id => $.selectedIds = [id]}
          selected={$.selectedIds.includes(m.id)} />
      )
      return (<>
        <div
          class="visit_list" style={{ display: 'flex', flexDirection: 'column' }}
          tabindex={0} onKeydown={onKeydown}
        >
          <input type="text" v-model={$.offset} />
          <button onClick={() => $.offset -= 100} disabled={$.offset == 0}>🔼</button>
          <FlexScroll>
            {entries}
          </FlexScroll>
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
