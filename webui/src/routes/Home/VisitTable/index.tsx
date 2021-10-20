import { StatusCodes } from "http-status-codes"
import { useLocalStorage } from "@vueuse/core"
import { defineComponent, PropType, ref, watch } from "vue"
import { apiFactory, isAxiosError } from "~/api"
import { VisitListEntry, VisitNote, VisitSet } from "~/api-client"
import AsyncButton from "~/components/AsyncButton"
import MI from "~/components/MI"
import { env } from "~/env"
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
        <ColumnList />
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
    columns: useLocalStorage(`${env.app_id}/VisitTable/columns`, {
      visit: true,
      description: true,
      issuedAt: true,
      numberOfExposures: true,
      exposureTime: true,
      coord_a: false,
      coord_d: false,
      azimuth: false,
      elevation: false,
      insturumentRotator: false,
      notes: true,
    }),
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

  const refresh = async (spinner = true) => {
    const q = $.q
    const api = apiFactory({ spinner, ignoreErrors: [StatusCodes.BAD_REQUEST] })
    try {
      const { visits, visit_sets, count } = (await api.visitList(q.start, q.end - q.start, $.sql)).data
      $.visits = visits
      $.visitSets = Object.fromEntries(visit_sets.map(vs => [vs.id, vs]))
      $.count = count
    }
    catch (e) {
      if (isAxiosError(e)) {
        const msg = e.response?.data?.detail
        msg && alert(msg)
      }
    }
  }

  watch(
    () => $p.query,
    () => refresh(true),
    { deep: true, immediate: true },
  )

  watch(

    () => $p.revision,
    () => refresh(false),
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


const ColumnList = defineComponent({
  setup() {
    const $c = visitListContext.inject()
    return () =>
      <div class={style.columnList}>
        <label data-tooltip="Visit" >
          <input v-model={$c.$.columns.visit} type="checkbox" />
          <span>Visit</span>
        </label>
        <label data-tooltip="Description" >
          <input v-model={$c.$.columns.description} type="checkbox" />
          <MI icon="description" size={18} />
        </label>
        <label data-tooltip="Issued at" >
          <input v-model={$c.$.columns.issuedAt} type="checkbox" />
          <MI icon="schedule" size={18} />
        </label>
        <label data-tooltip="Number of SpS/MCS Exposures" >
          <input v-model={$c.$.columns.numberOfExposures} type="checkbox" />
          <MI icon="tag" size={18} />
        </label>
        <label data-tooltip="Exposure Time" >
          <input v-model={$c.$.columns.exposureTime} type="checkbox" />
          <MI icon="shutter_speed" size={18} />
        </label>
        <label data-tooltip="Right Ascension" >
          <input v-model={$c.$.columns.coord_a} type="checkbox" />
          <span  >&alpha;</span>
        </label>
        <label data-tooltip="Declination">
          <input v-model={$c.$.columns.coord_d} type="checkbox" />
          <span  >&delta;</span>
        </label>
        <label data-tooltip="Azimuth">
          <input v-model={$c.$.columns.azimuth} type="checkbox" />
          <span  >A&deg;</span>
        </label>
        <label data-tooltip="Elevation">
          <input v-model={$c.$.columns.elevation} type="checkbox" />
          <span  >E&deg;</span>
        </label>
        <label data-tooltip="Instrument Rotator" >
          <input v-model={$c.$.columns.insturumentRotator} type="checkbox" />
          <span  >I&deg;</span>
        </label>
        <label data-tooltip="Notes" >
          <input v-model={$c.$.columns.notes} type="checkbox" />
          <MI icon="comment" size={18} />
        </label>
      </div>
  },
})


const MainList = defineComponent({
  name: 'MainList',
  setup() {
    const $c = visitListContext.inject()

    return () =>
      <div
        class={style.mainList}
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}>
        <div
          ref={$c.listEl}
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
      groupVisits($c.$.visits).map(g =>
        <VisitGroup visitSet={$c.$.visitSets[g.visit_set_id!]} visits={g.visits} />
      )
  },
})


const VisitGroup = defineComponent({
  setup($p) {
    const $c = visitListContext.inject()
    return () =>
      <div class={style.visitGroup}>
        {$p.visitSet ?
          <VisitSetDetail visitSet={$p.visitSet} />
          :
          <div class={style.noVisitSet}>No visitset</div>
        }
        <table class={[style.mainTable, 'compact-table']}>
          <thead>
            <tr>
              {$c.$.columns.visit &&
                <th
                  style={{ width: '7ch' }}>Visit</th>
              }
              {$c.$.columns.description &&
                <th
                  style={{ width: '12ch' }}
                  data-tooltip="Description"><MI icon="description" /></th>
              }
              {$c.$.columns.issuedAt &&
                <th
                  style={{ width: '5ch' }}
                  data-tooltip="Issued at" ><MI icon="schedule" /></th>
              }
              {$c.$.columns.numberOfExposures &&
                <th
                  style={{ width: '5ch' }}
                  data-tooltip="Number of SpS/MCS Exposures"><MI icon="tag" /></th>
              }
              {$c.$.columns.exposureTime &&
                <th
                  style={{ width: '6ch' }}
                  data-tooltip="Average Exposure Time[s]" ><MI icon="shutter_speed" /></th>
              }
              {$c.$.columns.coord_a &&
                <th style={{ width: '6ch' /* 000.00 */ }} data-tooltip="Right Ascension" >&alpha;</th>
              }
              {$c.$.columns.coord_d &&
                <th style={{ width: '6ch' /* +00.00 */ }} data-tooltip="Declination" >&delta;</th>
              }
              {$c.$.columns.azimuth &&
                <th style={{ width: '6ch' /* +00.00 */ }} data-tooltip="Azimuth" >A&deg;</th>
              }
              {$c.$.columns.elevation &&
                <th style={{ width: '6ch' /* +00.00 */ }} data-tooltip="Elevation" >E&deg;</th>
              }
              {$c.$.columns.insturumentRotator &&
                <th style={{ width: '6ch' }} data-tooltip="Instrument Rotator" >I&deg;</th>
              }
              {$c.$.columns.notes &&
                <th data-tooltip="Notes" ><MI icon="comment" /></th>
              }
            </tr>
          </thead>
          {$p.visits.map(v =>
            <tr
              class={{ [style.visit]: true, [style.selected]: $c.$p.visitId === v.id }}
              onClick={() => $c.updateVisitId(v.id)}
            >
              {$c.$.columns.visit &&
                <td style={{ textAlign: 'right' }} > {v.id} </td>
              }
              {$c.$.columns.description &&
                <td> {v.description} </td>
              }
              {$c.$.columns.issuedAt &&
                <td style={{ textAlign: 'center' }} >
                  <span data-tooltip={v.issued_at}>
                    {shortFormat(v.issued_at)}
                  </span>
                </td>
              }
              {$c.$.columns.numberOfExposures &&
                <td style={{ textAlign: 'center' }}>
                  {v.n_sps_exposures}/{v.n_mcs_exposures}
                </td>
              }
              {$c.$.columns.exposureTime &&
                <td style={{ textAlign: 'right' }}> {v.avg_exptime?.toFixed(1)} </td>
              }
              {$c.$.columns.coord_a &&
                <td></td>
              }
              {$c.$.columns.coord_d &&
                <td></td>
              }
              {$c.$.columns.azimuth &&
                <td>{v.avg_azimuth}</td>
              }
              {$c.$.columns.elevation &&
                <td>{v.avg_altitude}</td>
              }
              {$c.$.columns.insturumentRotator &&
                <td>{v.avg_insrot}</td>
              }
              {$c.$.columns.notes &&
                <td>
                  {v.notes.map(n =>
                    <Note note={n} />
                  )}
                </td>
              }
            </tr>
          )}
        </table>
      </div>
  },
  props: {
    visitSet: {
      type: Object as PropType<VisitSet>,
    },
    visits: {
      type: Array as PropType<VisitListEntry[]>,
      required: true,
    },
  },
})


const Note = defineComponent({
  setup($p) {
    const $ = $reactive({
      get readableText() {
        return $p.note.body.replace(/\[(.*)\]\(.*?\)/g, '[$1]')
      },
      get body() {
        return $.readableText.replace(/(.{128,}?)(.*)/, '$1...')
      }
    })

    return () =>
      <div data-tooltip={`${$.readableText} / ${$p.note.user.account_name}`} class={style.notes}>
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