import { OpReturnType } from "openapi-typescript-fetch"
import { useNavigate, useSearchParams } from "solid-app-router"
import { batch, createContext, createEffect, createMemo, createSignal, on, onMount, useContext } from "solid-js"
import { fetcher } from "~/api"
import { paths } from "~/api/schema"
import { useLoading } from "~/components/Loading"
import { assertNotNull } from "~/utils/assertNotNull"
import { reconciled } from "~/utils/reconciled"
import { searchString } from "~/utils/searchString"
import { createProducibleSignal } from "../../../utils/createProusibleSignal"
import { useHomeContext } from "../context"

export const perPage = 200

function makeContext() {
  const api = fetcher.path('/api/visits').method('get').create()

  const [queryParams, setQueryParams] = createProducibleSignal(initialQueryParams())
  const [groups, setGroups] = createProducibleSignal<VisitGroup[]>([])
  const [visitCount, setVisitCount] = createSignal(0)
  const [lastRefresh, setLastRefresh] = createSignal(new Date())
  const [isLoading, startLoading] = useLoading()
  const [scrollElement, setScrollElement] = createSignal<HTMLDivElement>()
  const { visitId, refreshHomeSignal } = useHomeContext()
  const navigate = useNavigate()

  createEffect(on([visitId, queryParams], () => {
    const { limit, offset, whereSql } = queryParams()
    navigate(`/visits${visitId() ? `/${visitId()}` : ''}${searchString({
      limit,
      offset,
      whereSql,
    })}`)
  }, { defer: true }))

  const refresh = async (showLoader = true) => {
    const { limit, offset, whereSql } = queryParams()
    try {
      await startLoading(async () => {
        const res = await api({ limit, offset, sql: `select * ${whereSql}` })
        batch(() => {
          setVisitCount(res.data.count)
          setGroups(reconciledVisitGroups(groups(), compileVisitGroups(res.data)))
          setLastRefresh(new Date())
        })
      }, { showLoader })
    }
    catch (e) {
      if (e instanceof api.Error && e.status === 422) {
        alert(e.data.detail)
      }
    }
  }

  createEffect(on(refreshHomeSignal, params => {
    params.list && refresh(params.list.showLoader ?? false)
  }, { defer: true }))

  onMount(() => {
    refresh()
  })

  const [columns, setColumns] = createProducibleSignal(defaultColumns())

  return {
    queryParams,
    setQueryParams,
    groups,
    refresh,
    isLoading,
    visitCount,
    scrollElement,
    setScrollElement,
    columns,
    setColumns,
    lastRefresh,
  }
}


function initialQueryParams() {
  const [searchParams] = useSearchParams()
  const { whereSql, limit, offset } = searchParams
  return {
    whereSql: whereSql ?? '',
    limit: limit ? Number(limit) : perPage,
    offset: offset ? Number(offset) : 0,
  }
}


const Context = createContext<ReturnType<typeof makeContext>>()


export function VisitSetListContext(props: { children: any }) {
  const context = makeContext()

  return (
    <Context.Provider value={context}>
      {props.children}
    </Context.Provider>
  )
}


export function useVisitSetListContext() {
  return assertNotNull(useContext(Context))
}


type ListVisitResponse = OpReturnType<paths["/api/visits"]['get']>
type VisitResponse = ListVisitResponse["visits"][number]
type IicSequenceResponse = ListVisitResponse["iic_sequence"][number]
type VisitGroup = {
  iicSequence?: IicSequenceResponse
  visits: VisitResponse[]
}


function compileVisitGroups(res: ListVisitResponse) {
  const groups: VisitGroup[] = []
  const iicSequences = Object.fromEntries(res.iic_sequence.map(i => [i.visit_set_id, i]))
  for (const v of res.visits) {
    const iicSequence = v.visit_set_id !== undefined ? iicSequences[v.visit_set_id] : undefined
    let g = groups.slice(-1)[0]
    if (g === undefined || g.iicSequence !== iicSequence) {
      g = {
        iicSequence,
        visits: []
      }
      groups.push(g)
    }
    g.visits.push(v)
  }
  return groups
}


function reconciledVisitGroups(original: VisitGroup[], target: VisitGroup[]) {
  return reconciled(original, target, {
    key: (g, i) => g.iicSequence?.visit_set_id ?? -i,
    children: {
      iicSequence: {
        notes: {
          key: ({ id }) => id
        },

      },
      visits: {
        key: ({ id }) => id,
        children: {
          notes: {
            key: ({ id }) => id
          },
        },
      },
    }
  })
}


export function usePaginator() {
  const { setQueryParams, queryParams, refresh, scrollElement, visitCount } = useVisitSetListContext()

  const goFirstPage = async () => {
    setQueryParams.produce(_ => {
      _.offset = 0
      _.limit = perPage
    })
    await refresh()
    scrollElement()?.scroll(0, 0)
  }

  const goPrevPage = async () => {
    setQueryParams.produce(_ => {
      _.offset = Math.max(0, _.offset - perPage)
    })
    await refresh()
    scrollElement()?.scroll(0, 0)
  }
  const goNextPage = async () => {
    setQueryParams.produce(_ => {
      _.offset += perPage
      _.limit = perPage
    })
    await refresh()
    scrollElement()?.scroll(0, 0)
  }
  const goLastPage = async () => {
    const lastPage = Math.floor(visitCount() / perPage)
    const offset = lastPage * perPage
    setQueryParams.produce(_ => {
      _.offset = offset
      _.limit = perPage
    })
    await refresh()
    scrollElement()?.scroll(0, 0)
  }

  const loadMoreOlder = async () => {
    setQueryParams.produce(_ => {
      _.limit += (perPage >> 1)
    })
    await refresh()
  }

  const loadMoreNewer = async () => {
    setQueryParams.produce(_ => {
      _.limit += (perPage >> 1)
      _.offset = Math.max(0, _.offset - (perPage >> 1))
    })
    const h1 = scrollElement()!.scrollHeight
    await refresh()
    const h2 = scrollElement()!.scrollHeight
    scrollElement()!.scroll(0, h2 - h1)
  }

  const goFirstPageDisabled = createMemo(() => queryParams().offset === 0)
  const goPrevPageDisabled = goFirstPageDisabled
  const goNextPageDisabled = createMemo(() => visitCount() < queryParams().offset + queryParams().limit)
  const goLastPageDisabled = goNextPageDisabled
  const loadMoreNewerDisabled = goFirstPageDisabled

  return {
    goFirstPage, goPrevPage, goNextPage, goLastPage,
    goFirstPageDisabled, goPrevPageDisabled,
    loadMoreNewer, loadMoreOlder,
    loadMoreNewerDisabled,
    goLastPageDisabled, goNextPageDisabled,
  }
}


function defaultColumns() {
  return {
    id: true,
    description: true,
    issuedAtDate: true,
    issuedAtTime: true,
    numberOfExposures: true,
    exposureTime: true,
    coord_a: false,
    coord_d: false,
    azimuth: false,
    elevation: false,
    insturumentRotator: false,
    notes: true,
  }
}

export type ColumnKeys = keyof ReturnType<typeof defaultColumns>


export const columnDescription: Record<ColumnKeys, string> = {
  id: 'Visit ID',
  description: 'Description',
  issuedAtDate: 'Date Issued at',
  issuedAtTime: 'Time Issued at',
  numberOfExposures: 'Number of {SpS | MCS | AGC} Exposures',
  exposureTime: 'Exposure Time [s]',
  coord_a: 'Right Ascension [°]',
  coord_d: 'Declination [°]',
  azimuth: 'Azimuth [°]',
  elevation: 'Elevation [°]',
  insturumentRotator: 'Instrument Rotator [°]',
  notes: 'Notes',
}
