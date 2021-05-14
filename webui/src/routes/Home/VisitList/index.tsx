import { defineComponent, ref, watch } from "vue"
import { api } from "~/api"
import { VisitListEntry, VisitSet } from "~/api-client"
import MI from "~/components/MI"
import { ignoreSequentialEvents } from "~/utils/functools"
import { makeContext } from "~/vue-utils/context"
import { $reactive } from "~/vue-utils/reactive"
import { homeContext } from "../homeContext"
import { useDragSelect } from "./useDragSelect"
import VisitEntry from "./VisitEntry"
import VisitGroup from "./VisitGroup"


const visitListContext = makeContext(() => {
  const home = homeContext.inject()
  const perPage = 100

  const $ = $reactive({
    visits: [] as VisitListEntry[],
    visitSets: {} as { [id: number]: VisitSet },
    count: 0,
    get moreEntries() {
      return $.count > $.q.end
    },
    get morePrevEntries() {
      return $.q.start > 0
    },
    get q() {
      return home.$.query
    },
    get sql() {
      return home.$.sql
    }
  })

  const refresh = async () => {
    console.log($.sql)
    const q = $.q
    const { visits, visit_sets, count } = (await api.visitList(q.start, q.end - q.start, $.sql)).data
    $.visits = visits
    $.visitSets = Object.fromEntries(visit_sets.map(vs => [vs.id, vs]))
    $.count = count
  }

  watch(
    () => [$.q, $.sql],
    refresh,
    { deep: true, immediate: true },
  )

  const listEl = ref<HTMLDivElement | undefined>(undefined)
  const listEndEl = ref<HTMLDivElement | undefined>(undefined)

  return {
    $,
    listEl,
    listEndEl,
    async goFirstPage() {
      $.q.start = 0
      $.q.end = perPage
      await refresh()
      listEl.value?.scrollTo(0, 0)
    },
    async goPrevPage() {
      $.q.start = Math.max(0, $.q.start - perPage)
      $.q.end = $.q.start + perPage
      await refresh()
      listEl.value?.scrollTo(0, listEl.value?.scrollHeight)
    },
    async goNextPage() {
      $.q.start = $.q.end
      $.q.end = $.q.start + perPage
      await refresh()
      listEl.value?.scrollTo(0, 0)
    },
    async goLastPage() {
      $.q.start = Math.max(0, $.count - perPage)
      $.q.end = $.count
      await refresh()
      listEl.value?.scrollTo(0, listEl.value?.scrollHeight)
    },
    async loadMore() {
      $.q.end += perPage
      await refresh()
    },
    async loadPrevsMore() {
      const h0 = listEndEl.value!.offsetTop
      $.q.start = Math.max($.q.start - perPage, 0)
      await refresh()
      const h1 = listEndEl.value!.offsetTop
      listEl.value!.scrollTop += h1 - h0
    },
  }
})

export default defineComponent({
  setup() {
    visitListContext.provide()
    return () =>
      <div style={{ display: 'flex', flexDirection: 'column', }} >
        <PageNavigator />
        <MainList />
      </div>
  },
})


const PageNavigator = defineComponent({
  setup() {
    const visitList = visitListContext.inject()
    return () =>
      <div style={{ display: 'flex' }}>
        <button
          onClick={visitList.goFirstPage}
          disabled={!visitList.$.morePrevEntries}
        > <MI icon='first_page' /> </button>
        <button
          onClick={visitList.goPrevPage}
          disabled={!visitList.$.morePrevEntries}
        > <MI icon='navigate_before' /> </button>
        <input
          type="text"
          size={15}
          style={{ textAlign: 'center' }}
          readonly={true}
          value={`${visitList.$.q.start}-${visitList.$.q.end} / ${visitList.$.count}`}
        />
        <button
          onClick={visitList.goNextPage}
          disabled={!visitList.$.moreEntries}
        >
          <MI icon='navigate_next' />
        </button>
        <button
          onClick={visitList.goLastPage}
          disabled={!visitList.$.moreEntries}
        >
          <MI icon='last_page' />
        </button>
      </div>
  }
})


const MainList = defineComponent({
  setup() {
    const visitList = visitListContext.inject()
    const home = homeContext.inject()
    const dragSelect = useDragSelect()
    const { onKeydown } = useKeyNavigation()

    return () =>
      <div
        tabindex={0}
        onMousedown={dragSelect.mousedownStart}
        onKeydown={onKeydown}
        style={{
          cursor: 'default',
          flexGrow: 1,
          height: 0, // https://github.com/philipwalton/flexbugs/issues/197
          maxWidth: '20em',
          overflowY: 'auto'
        }}
        ref={visitList.listEl}
        {...{ onSelectstart: (e: Event) => e.preventDefault() }}
      >
        <div class="fill-h">
          <button
            onClick={visitList.loadPrevsMore}
            disabled={!visitList.$.morePrevEntries}
          > <MI icon='expand_less' /> </button>
        </div>
        {groupVisits(visitList.$.visits).map(g => dragSelect.element(
          () => home.$.selectedVisitId = g.visits[0].id,
          <VisitGroup date={g.visits[0].issued_at} visitSet={g.visit_set_id ? visitList.$.visitSets[g.visit_set_id] : undefined}>
            {g.visits.map(m => dragSelect.element(
              () => home.$.selectedVisitId = m.id,
              <VisitEntry visit={m} selected={m.id === home.$.selectedVisitId} />
            ))}
          </VisitGroup>
        ))}
        <div ref={visitList.listEndEl}></div>
        <div class="fill-h">
          <button
            onClick={visitList.loadMore}
            disabled={!visitList.$.moreEntries}
          > <MI icon='expand_more' /> </button>
        </div>
      </div>
  }
})

function useKeyNavigation() {
  const visitList = visitListContext.inject()
  const home = homeContext.inject()
  const $ = $reactive({
    get index() {
      return Math.max(0, visitList.$.visits.findIndex(v => v.id === home.$.selectedVisitId))
    },
  })

  const onKeydown = ignoreSequentialEvents(async (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        if ($.index == 0 && visitList.$.q.start > 0) {
          await visitList.loadPrevsMore()
        }
        home.$.selectedVisitId = (visitList.$.visits[Math.max($.index - 1, 0)].id)
        break
      case 'ArrowDown':
        e.preventDefault()
        if ($.index + 1 >= visitList.$.visits.length) {
          await visitList.loadMore()
        }
        home.$.selectedVisitId = visitList.$.visits[Math.min($.index + 1, visitList.$.visits.length - 1)].id
        break
    }
  })

  return {
    onKeydown,
  }
}


function groupVisits(vs: VisitListEntry[]) {
  type Group = {
    visit_set_id?: number
    visits: VisitListEntry[]
  }
  function group(visit_set_id?: number): Group {
    return { visit_set_id, visits: [] }
  }
  const gs: Group[] = []
  let g: Group | null = null
  for (const m of vs) {
    if (!(g && g.visit_set_id === m.visit_set_id)) {
      g && gs.push(g)
      g = group(m.visit_set_id)
    }
    g.visits.push(m)
  }
  g && gs.push(g)
  return gs
}
