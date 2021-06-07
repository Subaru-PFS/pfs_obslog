import { defineComponent, ref, watch } from "vue"
import { api } from "~/api"
import { VisitListEntry, VisitSet } from "~/api-client"
import AsyncButton from "~/components/AsyncButton"
import MI from "~/components/MI"
import { shortFormat } from "~/utils/time"
import { makeContext } from "~/vue-utils/context"
import { $reactive } from "~/vue-utils/reactive"
import { homeContext } from "../homeContext"
import { perPage } from "../query"
import style from './style.module.scss'


export default defineComponent({
  setup() {
    visitListContext.provide()
    return () =>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} >
        <div style={{ display: 'flex' }}>
          <PageNavigator />
        </div>
        <MainList style={{ flexGrow: 1 }} />
      </div>
  },
})

const visitListContext = makeContext('visitlist', () => {
  const home = homeContext.inject()
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

  const listEl = ref<HTMLDivElement>()
  const listEndEl = ref<HTMLDivElement>()

  return {
    $,
    home,
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



const PageNavigator = defineComponent({
  setup() {
    const visitList = visitListContext.inject()
    return () =>
      <div style={{ display: 'flex', width: '100%' }}>
        <AsyncButton
          onClick={visitList.goFirstPage}
          disabled={!visitList.$.morePrevEntries}
        > <MI icon='first_page' /> </AsyncButton>
        <AsyncButton
          onClick={visitList.goPrevPage}
          disabled={!visitList.$.morePrevEntries}
        > <MI icon='navigate_before' /> </AsyncButton>
        <input
          type="text"
          size={15}
          style={{ textAlign: 'center', flexGrow: 1 }}
          readonly={true}
          value={`${visitList.$.q.start}-${visitList.$.q.end} / ${visitList.$.count}`}
        />
        <AsyncButton
          onClick={visitList.goNextPage}
          disabled={!visitList.$.moreEntries}
        >
          <MI icon='navigate_next' />
        </AsyncButton>
        <AsyncButton
          onClick={visitList.goLastPage}
          disabled={!visitList.$.moreEntries}
        >
          <MI icon='last_page' />
        </AsyncButton>
      </div>
  }
})


const MainList = defineComponent({
  name: 'MainList',
  setup() {
    const $c = visitListContext.inject()

    return () =>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div
          ref={$c.listEl}
          class={style.mainTableWrapper}
          style={{
            height: 0,
            flexGrow: 1,
            overflow: 'auto',
          }}
        >
          <div class="fill-h">
            <AsyncButton
              onClick={$c.loadPrevsMore}
              disabled={!$c.$.morePrevEntries}
            > <MI icon='expand_less' /> </AsyncButton>
          </div>
          <MainTable />
          <div ref={$c.listEndEl}></div>
          <div class="fill-h">
            <AsyncButton
              onClick={$c.loadMore}
              disabled={!$c.$.moreEntries}
            > <MI icon='expand_more' /> </AsyncButton>
          </div>
        </div>
      </div>
  },
})

const MainTable = defineComponent({
  setup() {
    const $c = visitListContext.inject()

    return () =>
      <table class={style.mainTable} >
        <thead>
          <tr>
            <th>Visit</th>
            <th>Desc.</th>
            <th><MI icon="schedule" title="Issued at" /></th>
            <th>SpS</th>
            <th>MCS</th>
            <th><MI icon="comment" title="Notes" /></th>
          </tr>
        </thead>
        <tbody>
          {groupVisits($c.$.visits).map(g =>
            <>
              {
                <tr>
                  <td colspan={6}>
                    {g.visit_set_id && JSON.stringify($c.$.visitSets[g.visit_set_id])}
                  </td>
                </tr>
              }
              {
                g.visits.map(v =>
                  <tr
                    class={{ [style.selected]: $c.home.$.visitId === v.id }}
                    onClick={() => $c.home.$.visitId = v.id}
                  >
                    <td style={{ textAlign: 'right' }} > {v.id} </td>
                    <td> {v.description} </td>
                    <td style={{ textAlign: 'center' }} > {shortFormat(v.issued_at)} </td>
                    <td style={{ textAlign: 'right' }}> {v.n_sps_exposures} </td>
                    <td style={{ textAlign: 'right' }}> {v.n_mcs_exposures} </td>
                    <td>
                      {v.notes.join('')}
                    </td>
                  </tr>
                )
              }</>
          )}
        </tbody>
      </table >
  },
})

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