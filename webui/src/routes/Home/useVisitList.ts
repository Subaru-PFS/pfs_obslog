import { reactive } from "@vue/reactivity"
import { inject, onMounted, provide, watch } from "@vue/runtime-core"
import { api } from "~/api"
import { VisitListEntry, VisitSet } from "~/api-client"
import { async_debounce } from "~/utils/functools"


const KEY = Symbol('visit-list')


type ExposureSelector = 'any' | 'true' | 'false'


function makeProvider(perPage = 100) {
  const $ = reactive({
    visits: [] as VisitListEntry[],
    visitSets: {} as { [id: number]: VisitSet },
    count: 0,
  })

  const q = reactive({
    start: 0,
    end: 100,
    filter: '',
    date: {
      begin: null as null | string,
      end: null as null | string,
      range: false,
    },
    include_sps: 'any' as ExposureSelector,
    include_mcs: 'any' as ExposureSelector,
  })

  watch(() => [q.date, q.include_mcs, q.include_sps], () => {
    refresh(true)
  }, { deep: true })

  const refresh = async_debounce(400, async (goFirstPage = false) => {
    if (goFirstPage) {
      q.start = 0
      q.end = perPage
    }
    const { include_mcs, include_sps } = q
    const sqlFilter = buildSqlFilter(q.filter, q.date, { include_mcs, include_sps })
    const { visits, visit_sets, count } = (await api.visitList(q.start, q.end - q.start, sqlFilter)).data
    $.visits = visits
    $.visitSets = Object.fromEntries(visit_sets.map(vs => [vs.id, vs]))
    $.count = count
  })

  onMounted(refresh)

  const nextPage = async () => {
    q.start = q.end
    q.end = q.start + perPage
    await refresh()
  }

  const prevPage = async () => {
    q.start = Math.max(0, q.start - perPage)
    q.end = q.start + perPage
    await refresh()
  }

  const firstPage = async () => {
    q.start = 0
    q.end = perPage
    await refresh()
  }

  const loadMore = async () => {
    q.end += perPage
    await refresh()
  }

  const loadPrevsMore = async () => {
    q.start = Math.max(q.start - perPage, 0)
    await refresh()
  }

  return { $, q, refresh, nextPage, prevPage, firstPage, loadMore, loadPrevsMore }
}


export function provideUseVisitList(...args: Parameters<typeof makeProvider>) {
  const provider = makeProvider(...args)
  provide(KEY, provider)
  return provider
}


export function useVisitList() {
  const controller = inject<ReturnType<typeof makeProvider>>(KEY)!
  return controller
}

function filterToSqlTerms(s: string) {
  const terms = s
    .replace(/'/g, '')
    .replace(/\-\s*/g, '-').split(/\s+/)
    .filter(c => c.length > 0)
    .map(c =>
      c.charAt(0) == '-' ?
        `any_column NOT LIKE '%${c.substring(1)}%'` :
        `any_column LIKE '%${c}%'`
    )
  return terms
}

type DateQuery = {
  begin: string | null
  end: string | null
  range: boolean
}
type VisitType = {
  include_sps: ExposureSelector,
  include_mcs: ExposureSelector,
}


function buildSqlFilter(filter: string, date: DateQuery, type: VisitType) {
  const terms = filterToSqlTerms(filter)
  if (date.begin && !date.range) { // day selection
    terms.push(`issued_at::date = '${date.begin}'`)
  }
  else {
    if (date.begin) {
      terms.push(`'${date.begin}' <= issued_at::date`)
    }
    if (date.end) {
      terms.push(`issued_at::date <= '${date.end}'`)
    }
  }
  terms.push({ true: 'is_sps_visit', false: 'not is_sps_visit', any: 'true' }[type.include_sps])
  terms.push({ true: 'is_mcs_visit', false: 'not is_mcs_visit', any: 'true' }[type.include_mcs])
  return terms.length > 0 ? 'where ' + terms.join(' AND ') : ''
}