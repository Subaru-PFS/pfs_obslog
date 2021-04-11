import { defineComponent, ref } from "vue"
import { VisitListEntry } from "~/api-client"
import { MI } from "~/components/MaterialIcon"
import { useVisitList } from "../useVisitList"
import VisitEntry from "./VisitEntry"
import VisitGroup from "./VisitGroup"


export default defineComponent({
  props: {
    selectedId: {
      type: Number,
    },
  },
  setup($$, { emit }) {
    const dragSelect = useDragSelect()
    const visitList = useVisitList()
    const listEl = ref<HTMLDivElement | null>(null)
    const listEndEl = ref<null | HTMLDivElement>(null)

    const setSelectedId = (id: number | null) => {
      emit('update:selectedId', id)
    }

    const onKeydown = async (e: KeyboardEvent) => {
      const index = Math.max(0, visitList.$.visits.findIndex(m => m.id === $$.selectedId))
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          if (index == 0 && visitList.q.start > 0) {
            await loadPrevsMore()
          }
          const index2 = Math.max(0, visitList.$.visits.findIndex(m => m.id === $$.selectedId))
          setSelectedId(visitList.$.visits[Math.max(index2 - 1, 0)].id)
          break
        case 'ArrowDown':
          e.preventDefault()
          if (index + 1 >= visitList.$.visits.length) {
            await visitList.loadMore()
          }
          setSelectedId(visitList.$.visits[Math.min(index + 1, visitList.$.visits.length - 1)].id)
          break
      }
    }

    const loadPrevsMore = async () => {
      const h0 = listEndEl.value!.offsetTop
      await visitList.loadPrevsMore()
      const h1 = listEndEl.value!.offsetTop
      listEl.value!.scrollTop += h1 - h0
    }

    const render = () => {
      return (<>
        <div
          class="visitList"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {/* navigations */}
          <div style={{ display: 'flex' }}>
            <button onClick={async e => { await visitList.firstPage(); listEl.value?.scrollTo(0, 0) }} disabled={visitList.q.start == 0}> {MI('first_page')} </button>
            <button onClick={async e => { await visitList.prevPage(); listEl.value?.scrollTo(0, listEl.value?.scrollHeight) }} disabled={visitList.q.start == 0}> {MI('navigate_before')} </button>
            <input
              style={{ textAlign: 'center', flexGrow: 1, width: 0 }} type="text" readonly={true}
              value={`${visitList.q.start}-${visitList.q.end} / ${visitList.$.count}`}
            />
            <button onClick={async e => { await visitList.nextPage(); listEl.value?.scrollTo(0, 0) }}> {MI('navigate_next')}
            </button>
          </div>
          {/* main list */}
          <div
            tabindex={0}
            onMousedown={dragSelect.mousedownStart}
            onKeydown={onKeydown}
            style={{
              cursor: 'default',
              flexGrow: 1,
              height: 0, // https://github.com/philipwalton/flexbugs/issues/197
              width: '15em',
              overflowY: 'auto'
            }}
            // @ts-ignore
            onSelectstart={e => e.preventDefault()}
            ref={listEl}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button onClick={loadPrevsMore} disabled={visitList.q.start == 0}>{MI('expand_less')}</button>
            </div>
            {groupVisits(visitList.$.visits).map(g =>
              dragSelect.element(
                () => setSelectedId(g.visits[0].id),
                <VisitGroup date={g.visits[0].issued_at} visitSet={g.visit_set_id ? visitList.$.visitSets[g.visit_set_id] : undefined}>
                  {g.visits.map(m =>
                    dragSelect.element(
                      () => setSelectedId(m.id),
                      <VisitEntry m={m} selected={m.id === $$.selectedId} />
                    )
                  )}
                </VisitGroup>
              )
            )}
            <div ref={listEndEl}></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button onClick={e => visitList.loadMore()}>{MI('expand_more')}</button>
            </div>
          </div>
        </div>
      </>)
    }

    return render
  },
})


function useDragSelect() {
  let mouseState: 'up' | 'down' = 'up'
  let mouseDevice = false
  const mousedownStart = (e: MouseEvent) => {
    mouseDevice = true
    e.stopPropagation()
    mouseState = 'down'
    document.addEventListener('mouseup', () => mouseState = 'up', { once: true })
  }
  const element = (onSelect: () => void, slot: JSX.Element) => {
    return (
      <div
        onMouseenter={e => {
          if (mouseState == 'down') {
            e.stopPropagation()
            onSelect()
          }
        }}
        onMousedown={e => {
          mousedownStart(e)
          onSelect()
        }}
        onClick={e => {
          mouseDevice || onSelect()
        }}
      >
        {slot}
      </div>
    )
  }
  return { mousedownStart, element }
}


function groupVisits(vs: VisitListEntry[]) {
  class Group {
    constructor(
      readonly visit_set_id?: number,
      readonly visits: VisitListEntry[] = []) { }
  }
  const gs: Group[] = []
  let g: Group | null = null
  for (const m of vs) {
    if (!(g && g.visit_set_id === m.visit_set_id)) {
      g && gs.push(g)
      g = new Group(m.visit_set_id)
    }
    g.visits.push(m)
  }
  g && gs.push(g)
  return gs
}
