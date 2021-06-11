import { defineComponent, PropType, ref, watch } from "vue"
import { api } from "~/api"
import { VisitListEntry, VisitNote, VisitSet } from "~/api-client"
import AsyncButton from "~/components/AsyncButton"
import MI from "~/components/MI"
import { domStyle, int2color } from "~/utils/colors"
import { shortFormat } from "~/utils/time"
import { makeComponentContext } from "~/vue-utils/context"
import { $reactive } from "~/vue-utils/reactive"
import { buildSql, defaultQuery, perPage } from "../query"
import style from './style.module.scss'
import VisitSetDetail from "./VisitSetDetail"


const VisitTable = defineComponent({
  name: 'VisitTable',
  setup($p, ctx) {
    visitListContext.provide($p, ctx)
    return () =>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} >
        <div style={{ display: 'flex' }}>
          <PageNavigator />
        </div>
        <MainList style={{ flexGrow: 1 }} />
      </div>
  },
  props: {
    query: {
      type: Object as PropType<ReturnType<typeof defaultQuery>>,
      default: defaultQuery,
    },
    revision: {
      type: Number,
      default: -1,
    },
    visitId: {
      type: Number,
    }
  },
  emits: ['update:revision', 'update:query', 'update:visitId'],
})


export default VisitTable


export const visitListContext = makeComponentContext(VisitTable, ($p, { emit }) => {
  const $ = $reactive({
    visits: [] as VisitListEntry[],
    visitSets: {} as { [id: number]: VisitSet },
    count: 0,
    showVisitSet: true,
    get moreEntries() {
      return $.count > $.q.end
    },
    get morePrevEntries() {
      return $.q.start > 0
    },
    get q() {
      return $p.query
    },
    get sql() {
      return buildSql($p.query)
    },
  })

  const refresh = async () => {
    const q = $.q
    const { visits, visit_sets, count } = (await api.visitList(q.start, q.end - q.start, $.sql)).data
    $.visits = visits
    $.visitSets = Object.fromEntries(visit_sets.map(vs => [vs.id, vs]))
    $.count = count
  }

  watch(
    () => [$p.revision, $p.query],
    refresh,
    { deep: true, immediate: true },
  )

  const listEl = ref<HTMLDivElement>()
  const listEndEl = ref<HTMLDivElement>()

  return {
    $,
    $p,
    listEl,
    listEndEl,
    updateVisitId: (visitId: number) => {
      emit('update:visitId', visitId)
    },
    notifyUpdate: () => {
      emit('update:revision', $p.revision + 1)
    },
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
    const $c = visitListContext.inject()
    return () =>
      <div style={{ display: 'flex', width: '100%' }}>
        <button onClick={() => $c.$.showVisitSet = !$c.$.showVisitSet}>
          <MI icon={$c.$.showVisitSet ? 'folder_open' : 'folder'} />
        </button>
        <AsyncButton
          onClick={$c.goFirstPage}
          disabled={!$c.$.morePrevEntries}
          data-tooltip="First Page"
        ><MI icon='first_page' /></AsyncButton>
        <AsyncButton
          onClick={$c.goPrevPage}
          disabled={!$c.$.morePrevEntries}
          data-tooltip="Previous Page"
        ><MI icon='navigate_before' /></AsyncButton>
        <input
          type="text"
          size={15}
          style={{ textAlign: 'center', flexGrow: 1 }}
          readonly={true}
          value={`${$c.$.q.start}-${$c.$.q.end} / ${$c.$.count}`}
        />
        <AsyncButton
          onClick={$c.goNextPage}
          disabled={!$c.$.moreEntries}
          data-tooltip="Next Page"
        ><MI icon='navigate_next' /></AsyncButton>
        <AsyncButton
          onClick={$c.goLastPage}
          disabled={!$c.$.moreEntries}
          data-tooltip="Last Page"
        ><MI icon='last_page' /></AsyncButton>
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
              data-tooltip="Load Previous Visits"
            ><MI icon='expand_less' /></AsyncButton>
          </div>
          <MainTable />
          <div ref={$c.listEndEl}></div>
          <div class="fill-h">
            <AsyncButton
              onClick={$c.loadMore}
              disabled={!$c.$.moreEntries}
              data-tooltip="Load Next Visits"
            ><MI icon='expand_more' /></AsyncButton>
          </div>
        </div>
      </div>
  },
})

const MainTable = defineComponent({
  setup() {
    const $c = visitListContext.inject()
    return () =>
      <table class={style.mainTable}>
        {groupVisits($c.$.visits).map((g, gIndex) =>
          <>
            {$c.$.showVisitSet && g.visit_set_id &&
              <tr>
                <td colspan={12} >
                  <VisitSetDetail visitSet={$c.$.visitSets[g.visit_set_id]} />
                </td>
              </tr>
            }
            {($c.$.showVisitSet || gIndex === 0) &&
              <tr>
                <th data-tooltip="Visit Set ID" ><MI icon="folder" /></th>
                <th>Visit</th>
                <th data-tooltip="Description"><MI icon="description" /></th>
                <th data-tooltip="Issued at" ><MI icon="schedule" /></th>
                <th data-tooltip="Number of SpS/MCS Exposures">SpS<br />-<br />MCS</th>
                <th data-tooltip="Average Exposure Time[s]" ><MI icon="shutter_speed" /></th>
                <th data-tooltip="Azimuth" >Az.</th>
                <th data-tooltip="Elevation" >El.</th>
                <th data-tooltip="Right Ascension" >&alpha;</th>
                <th data-tooltip="Declination" >&delta;</th>
                <th data-tooltip="Instrument Rotator" >Inr</th>
                <th data-tooltip="Notes" ><MI icon="comment" /></th>
              </tr>
            }
            {g.visits.map(v =>
              <tr
                class={{ [style.selected]: $c.$p.visitId === v.id }}
                onClick={() => $c.updateVisitId(v.id)}
              >
                <td style={{
                  textAlign: 'right',
                  ...(!$c.$.showVisitSet && g.visit_set_id ? domStyle(int2color(g.visit_set_id)) : {}),
                }} > {g.visit_set_id} </td>
                <td style={{ textAlign: 'right' }} > {v.id} </td>
                <td> {v.description} </td>
                <td style={{ textAlign: 'center' }} data-tooltip={v.issued_at} > {shortFormat(v.issued_at)} </td>
                <td style={{ textAlign: 'center' }}>
                  {v.n_sps_exposures}/{v.n_mcs_exposures}
                </td>
                <td style={{ textAlign: 'right' }}> {v.avg_exptime?.toFixed(1)} </td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td>
                  {v.notes.map(n =>
                    <Note note={n} />
                  )}
                </td>
              </tr>
            )}
          </>
        )}
      </table >
  },
})

const Note = defineComponent({
  setup($p) {
    const $ = $reactive({
      get body() {
        return $p.note.body.replace(/\[(.*)\]\(.*?\)/g, '[$1]').replace(/(.{128,}?)(.*)/, '$1...')
      }
    })

    return () =>
      <div class={style.notes}>
        <div class="body">{$.body}</div>{' '}
        <div class="username">{$p.note.user.account_name}</div>
      </div>
  },
  props: {
    note: {
      type: Object as PropType<VisitNote>,
      required: true,
    }
  }
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