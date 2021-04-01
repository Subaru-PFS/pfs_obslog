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

    let mouseState: 'up' | 'down' = 'up'

    const onMousedown = (e: MouseEvent) => {
      mouseState = 'down'
      document.addEventListener('mouseup', () => mouseState = 'up', { once: true })
    }

    const render = () => {
      const groups = groupVisits($.members)

      return (<>
        <div
          tabindex={0}
          onMousedown={onMousedown}
          class="visit_list" style={{ display: 'flex', flexDirection: 'column' }}
          onKeydown={onKeydown}
        >
          <input type="text" v-model={$.offset} />
          <button onClick={() => $.offset -= 100} disabled={$.offset == 0}>🔼</button>
          <FlexScroll>
            {
              groups.map(g =>
                <div>
                  <div class="visit-set">
                    <div>{g.visit_set_id}</div>
                    {
                      g.visits.map(m =>
                        <div
                          onMouseenter={e => {
                            if (mouseState == 'down') {
                              $.selectedIds = [m.id]
                            }
                          }}
                          onMousedown={() => $.selectedIds = [m.id]}
                          onClick={() => $.selectedIds = [m.id]}
                        >
                          <Entry
                            m={m}
                            selected={$.selectedIds.includes(m.id)} />
                        </div>
                      )
                    }
                  </div>
                </div>
              )
            }
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


function groupVisits(vs: VisitListEntry[]) {
  class VisitGroup {
    constructor(readonly visit_set_id?: number, readonly visits: VisitListEntry[] = []) {
    }
  }
  const gs: VisitGroup[] = []
  let g: VisitGroup | null = null
  for (const m of vs) {
    if (!(g && g.visit_set_id === m.visit_set_id)) {
      g && gs.push(g)
      g = new VisitGroup(m.visit_set_id)
    }
    g.visits.push(m)
  }
  g && gs.push(g)
  return gs
}