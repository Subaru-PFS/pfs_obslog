import { useNavigate } from 'solid-app-router'
import { batch, createEffect, createMemo, createSignal, For, JSX, on, onCleanup, onMount, Show } from 'solid-js'
import { apiUrl, fetcher } from '~/api'
import { DateRangePicker } from '~/components/DatePicker'
import { Icon, IconButton } from '~/components/Icon'
import { Flex, FlexColumn, FlexPadding } from '~/components/layout'
import { Block, useLoading, useModelLoading } from '~/components/Loading'
import { tippy } from '~/components/Tippy'
import { downloadLink } from '~/utils/downloadLink'
import { shortFormatDate, shortFormatTime } from '~/utils/time'
import { useHomeContext } from '../context'
import { NoteList } from '../NoteList'
import { IicSequenceResponse, VisitGroupType, VisitResponse } from '../VisitDetail/types'
import { numberOfExposuresStyle, sequenceTypeStyle, statusStyle } from './colors'
import { columnDescription, ColumnKeys, perPage, usePaginator, useVisitSetListContext, VisitSetListContext } from './context'
import styles from './styles.module.scss'
tippy


export function VisitSetList() {
  return (
    <VisitSetListContext>
      <div class={styles.visitSetList}>
        <ToolBar />
        <SearchResult />
      </div>
    </VisitSetListContext>
  )
}


function ToolBar() {
  const { queryParams, setQueryParams, refresh } = useVisitSetListContext()
  const { setVisitId, goToVisitSignal } = useHomeContext()
  const startLoading = useModelLoading()

  const goToVisit = async (id: number) => {
    const api = fetcher.path('/api/visits/{id}/rank').method('get').create()
    const { data: { rank } } = await startLoading(() => api({ id }))
    if (!rank) {
      alert(`No such visit (id=${id})`)
      return
    }
    setVisitId(id)
    setQueryParams.produce(_ => {
      _.whereSql = ''
      _.offset = Math.max(0, rank - (perPage >> 1))
      _.limit = perPage
    })
    await refresh()
    document.querySelector(`[data-visit="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  createEffect(on(goToVisitSignal, ({ visitId }) => {
    visitId && goToVisit(visitId)
  }, { defer: true }))

  const downloadCsv = () => {
    const { whereSql } = queryParams()
    if (whereSql === '') {
      if (!confirm('No filter specified. The output will be pretty big.')) {
        return
      }
    }
    const url = apiUrl('/api/visits.csv').methods('get').create({ sql: `select * ${whereSql}` })
    location.href = url
  }

  const downloadJson = () => {
    const { whereSql } = queryParams()
    if (whereSql === '') {
      if (!confirm('No filter specified. The output will be pretty big.')) {
        return
      }
    }
    const url = apiUrl('/api/visits').methods('get').create({ sql: `select * ${whereSql}`, limit: -1 })
    downloadLink(url, 'pfs-obslog.json')
  }

  const askVisitIdAndGo = async () => {
    const id = Number(prompt('Visit ID ?') || 'NaN')
    if (!Number.isFinite(id)) {
      return
    }
    await goToVisit(id)
  }

  return (
    <FlexColumn class={styles.searchBox}>
      <SearchTextBox />
      <Flex>
        <SearchConditions />
        <FlexPadding />
        <IconButton icon="switch_access_shortcut" tippy={{ content: 'Go to Visit' }} onClick={askVisitIdAndGo} />
        <IconButton icon="article" tippy={{ content: 'Download list as CSV' }} onClick={downloadCsv} />
        <IconButton icon="data_object" tippy={{ content: 'Download list as JSON' }} onClick={downloadJson} />
      </Flex>
      <Flex>
        <Columns />
        <FlexPadding />
        <Paginator />
      </Flex>
    </FlexColumn>
  )
}


function SearchTextBox() {
  const { queryParams, setQueryParams, refresh } = useVisitSetListContext()
  const [draft, setDraft] = createSignal(queryParams().whereSql)
  const isSql = createMemo(() => !!draft().match(/^\s*where\s+/i))
  const navigate = useNavigate()

  const submit = async () => {
    setQueryParams.produce(_ => {
      if (isSql()) {
        _.whereSql = draft()
      }
      else if (draft().match(/^\s*$/)) {
        _.whereSql = ''
      } else {
        _.whereSql = `where any_column like '%${draft()}%'`
      }
      _.limit = perPage
      _.offset = 0
    })
    await refresh()
  }

  createEffect(on(queryParams, ({ whereSql }) => {
    setDraft(whereSql)
  }, { defer: true }))

  return (
    <div class={styles.searchTextBox}>
      <form onSubmit={async e => {
        e.preventDefault()
        await submit()
      }}>
        <input
          type="search" value={draft()} onInput={e => setDraft(e.currentTarget.value)}
          classList={{ [styles.sql]: isSql() }}
          accessKey='s'
          placeholder='Type something to search'
          // @ts-ignore
          onSearch={async (e: Event) => {
            e.preventDefault()
            // @ts-ignore
            if (e.currentTarget.value === '') {
              await submit()
            }
          }}
        />
      </form>
      <IconButton icon="search" tippy={{ content: 'Search' }} onClick={submit} />
      <IconButton icon='help' tippy={{ content: 'Syntax Docs' }} onClick={e => {
        e.preventDefault()
        navigate('/visits/sql-syntax-help')
      }} />
    </div>
  )
}


type ExposureCondition = '>=0' | '>0' | '==0'


function SearchConditions() {
  const [isSps, setIsSps] = createSignal<ExposureCondition>('>=0')
  const [isMcs, setIsMcs] = createSignal<ExposureCondition>('>=0')
  const [isAgc, setIsAgc] = createSignal<ExposureCondition>('>=0')
  const [dateRange, setDateRange] = createSignal<[string | undefined, string | undefined]>([undefined, undefined])
  const { queryParams, setQueryParams, refresh } = useVisitSetListContext()

  const whereSql = createMemo(() => {
    const conditions: string[] = []
    for (const [c, column] of [
      [isSps(), 'is_sps_visit'], [isMcs(), 'is_mcs_visit'], [isAgc(), 'is_agc_visit']
    ] as [ExposureCondition, string][]) {
      switch (c) {
        case '==0':
          conditions.push(`not ${column}`)
          break
        case '>0':
          conditions.push(`${column}`)
          break
      }
    }
    const [start, end] = dateRange()
    if (start && end) {
      conditions.push(`(issued_at between '${start}' and '${end}')`)
    }
    else if (start) {
      conditions.push(`issued_at >= '${start}'`)
    }
    else if (end) {
      conditions.push(`issued_at <= '${end}'`)
    }
    return conditions.length > 0 ? `where ${conditions.join(' and ')}` : ''
  })

  let sync = true

  createEffect(on(whereSql, async newWhereSql => {
    if (sync && queryParams().whereSql !== newWhereSql) {
      setQueryParams.produce(_ => {
        _.whereSql = newWhereSql
        _.limit = perPage
        _.offset = 0
      })
      await refresh()
    }
    sync = true
  }, { defer: true }))

  createEffect(on(queryParams, ({ whereSql: newWhereSql }) => {
    if (whereSql() !== newWhereSql && whereSql() !== '') {
      sync = false
      batch(() => { // As current solidjs's implementation, this batch is not be needed.
        setShaking(true)
        setDateRange([undefined, undefined])
        setIsSps('>=0')
        setIsMcs('>=0')
        setIsAgc('>=0')
      })
    }
  }, { defer: true }))

  function ExposureType(props: {
    type: string
    value: ExposureCondition
    setValue: (value: string) => unknown
    tippy: string
  }) {
    return (
      <div class={styles.searchConditionExposureType} use:tippy={{ content: props.tippy }}>
        <span>{props.type}</span>
        <select value={props.value} onChange={e => props.setValue(e.currentTarget.value)}>
          <option value=">=0">&ge;0</option>
          <option value=">0">&gt;0</option>
          <option value="==0">=0</option>
        </select>
      </div>
    )
  }

  const [shaking, setShaking] = createSignal(false)

  return (
    <div class={styles.searchCondition} classList={{ [styles.shaking]: shaking() }} onAnimationEnd={() => setShaking(false)}>
      <ExposureType type='#SpS:' value={isSps()} setValue={setIsSps} tippy='Number of SpS Exposures' />
      <ExposureType type='#MCS:' value={isMcs()} setValue={setIsMcs} tippy='Number of MCS Exposures' />
      <ExposureType type='#AGC:' value={isAgc()} setValue={setIsAgc} tippy='Number of AGC Exposures' />
      <Icon icon='date_range' />
      <DateRangePicker
        value={dateRange()}
        onChange={setDateRange}
        class={styles.datePicker}
        datePickerOptions={{ allowOneSidedRange: true }}
      >
        {(start, end) => (
          <>
            {start} &#x2013; {end} <span onClick={() => {
              setDateRange([undefined, undefined])
            }} class={styles.datePickerClear}>&times;</span>
          </>
        )}
      </DateRangePicker>
    </div>
  )
}


function Columns() {
  function ColumnCheckbox(props: { children?: any, column: ColumnKeys }) {
    const { columns, setColumns } = useVisitSetListContext()
    return (
      <li use:tippy={{ content: columnDescription[props.column] }}>
        <label>
          <input
            type="checkbox" checked={columns()[props.column]}
            onInput={e => {
              setColumns(_ => {
                const draft = { ..._ }
                draft[props.column] = e.currentTarget.checked
                return draft
              })
            }}
          />{props.children}
        </label>
      </li>
    )
  }

  return (
    <ul class={styles.columns}>
      <ColumnCheckbox column='id'>ID</ColumnCheckbox>
      <ColumnCheckbox column='description'><Icon icon="description" /></ColumnCheckbox>
      <ColumnCheckbox column='issuedAtDate'><Icon icon="event" /></ColumnCheckbox>
      <ColumnCheckbox column='issuedAtTime'><Icon icon="schedule" /></ColumnCheckbox>
      <ColumnCheckbox column='numberOfExposures'><Icon icon="tag" /></ColumnCheckbox>
      <ColumnCheckbox column='exposureTime'><Icon icon="shutter_speed" /></ColumnCheckbox>
      <ColumnCheckbox column='coord_a'>&alpha;</ColumnCheckbox>
      <ColumnCheckbox column='coord_d'>&delta;</ColumnCheckbox>
      <ColumnCheckbox column='azimuth'>A&deg;</ColumnCheckbox>
      <ColumnCheckbox column='elevation'>E&deg;</ColumnCheckbox>
      <ColumnCheckbox column='insturumentRotator'>I&deg;</ColumnCheckbox>
      <ColumnCheckbox column='notes'><Icon icon='note' /></ColumnCheckbox>
    </ul>
  )
}


function SearchResult() {
  const { groups, isLoading, setScrollElement, refresh, queryParams } = useVisitSetListContext()
  const { visitId, setVisitId } = useHomeContext()
  const {
    goPrevPage, goNextPage, goPrevPageDisabled, goNextPageDisabled,
    loadMoreNewer, loadMoreOlder, loadMoreNewerDisabled,
  } = usePaginator()

  const keydown = async (e: KeyboardEvent) => {
    const findVisit = (id: number) => {
      for (let gi = 0; gi < groups().length; ++gi) {
        const g = groups()[gi]
        const vi = g.visits.findIndex(v => v.id === id)
        if (vi >= 0) {
          return { groupIndex: gi, visitIndex: vi }
        }
      }
    }

    if (!isLoading() && e.target === e.currentTarget && ['ArrowDown', 'ArrowUp'].includes(e.key) && visitId()) {
      e.preventDefault()
      const givi = findVisit(visitId()!)
      if (givi) { // usually this is true
        const { groupIndex: gi, visitIndex: vi } = givi
        switch (e.key) {
          case 'ArrowDown':
            if (vi + 1 < groups()[gi].visits.length) {
              setVisitId(groups()[gi].visits[vi + 1].id)
            } else if (gi + 1 < groups().length) {
              setVisitId(groups()[gi + 1].visits[0].id)
            }
            else {
              await loadMoreOlder()
            }
            break
          case 'ArrowUp':
            if (vi - 1 >= 0) {
              setVisitId(groups()[gi].visits[vi - 1].id)
            } else if (gi - 1 >= 0) {
              setVisitId(groups()[gi - 1].visits[groups()[gi - 1].visits.length - 1].id)
            }
            else {
              if (queryParams().offset > 0) {
                await loadMoreNewer()
              }
            }
            break
        }
        document.querySelector(`[data-visit="${visitId()}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }

  return (
    <Block class={styles.searchResult} when={isLoading()}>
      <FlexColumn
        class={styles.searchResultScroll} ref={setScrollElement}
        tabIndex={0}
        onKeyDown={keydown}
      >
        <div class={styles.searchResultLoadMoreNews}>
          <IconButton
            icon="navigate_before" onClick={goPrevPage} disabled={goPrevPageDisabled()}
            tippy={{ content: 'Next newer visits' }}
          />
          <Show when={loadMoreNewerDisabled()}
            fallback={
              <IconButton
                icon="expand_less" onClick={loadMoreNewer}
                tippy={{ content: 'Load more newer visits' }}
              />
            }
          >
            <IconButton
              icon="refresh" onClick={() => refresh()}
              tippy={{ content: 'Refresh' }}
            />
          </Show>
          <IconButton
            icon="navigate_next" onClick={goNextPage} disabled={goNextPageDisabled()}
            tippy={{ content: 'Next older visits' }}
          />
        </div>
        <div style={{ "flex-grow": 1 }}>
          <For each={groups()}>
            {(group) => <VisitGroup group={group} />}
          </For>
        </div>
        <div class={styles.searchResultLoadMoreOlder}>
          <IconButton
            icon="navigate_before" onClick={goPrevPage} disabled={goPrevPageDisabled()}
            tippy={{ content: 'Next newer visits' }}
          />
          <IconButton
            icon="expand_more" onClick={loadMoreOlder} disabled={goNextPageDisabled()}
            tippy={{ content: 'Load more older visits' }}
          />
          <IconButton
            icon="navigate_next" onClick={goNextPage} disabled={goNextPageDisabled()}
            tippy={{ content: 'Next older visits' }}
          />
        </div>
      </FlexColumn>
    </Block >
  )
}


function VisitGroup(props: { group: VisitGroupType }) {
  const { setVisitId, visitId } = useHomeContext()
  const selected = createMemo(() => !!props.group.visits.find(v => v.id === visitId()))

  return (
    <div classList={{ [styles.visitGroup]: true, [styles.selected]: selected() }}
      onClick={() => {
        if (props.group.visits.length > 0) {
          setVisitId(props.group.visits[0].id)
        }
      }}
    >
      <Show
        when={props.group.iicSequence}
        fallback={<NoIicSequence />}
      >
        <IicSequence iicSequence={props.group.iicSequence!} />
      </Show>
      <VisitTable visits={props.group.visits} />
    </div >
  )
}


function IicSequence(props: { iicSequence: IicSequenceResponse }) {
  const createNote = fetcher.path('/api/visit_sets/{visit_set_id}/notes').method('post').create()
  const updateNote = fetcher.path('/api/visit_sets/{visit_set_id}/notes/{id}').method('put').create()
  const deleteNote = fetcher.path('/api/visit_sets/{visit_set_id}/notes/{id}').method('delete').create()
  const { refresh } = useVisitSetListContext()

  return (
    <div class={styles.iicSequence}>
      <div class={styles.title}>{props.iicSequence.visit_set_id} &#x2013; {props.iicSequence.name}</div>
      <table>
        <thead>
          <tr>
            <th>Visit Set Id</th>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{props.iicSequence.visit_set_id}</td>
            <td>{props.iicSequence.name}</td>
            <td style={sequenceTypeStyle(props.iicSequence.sequence_type)} >
              {props.iicSequence.sequence_type}</td>
            <td style={statusStyle(props.iicSequence.status?.cmd_output)} >
              {props.iicSequence.status?.cmd_output}</td>
          </tr>
        </tbody>
      </table>
      <code class={styles.command}>{props.iicSequence.cmd_str}</code>
      <Show when={props.iicSequence.comments}>
        <div class={styles.iicSequenceComment}>
          {props.iicSequence.comments}
        </div>
      </Show>
      <NoteList
        notes={props.iicSequence.notes}
        createNote={async body => {
          await createNote({ visit_set_id: props.iicSequence.visit_set_id, body })
          await refresh(false)
        }}
        updateNote={async (noteId, body) => {
          await updateNote({ id: noteId, body })
          await refresh(false)
        }}
        deleteNote={async noteId => {
          await deleteNote({ id: noteId })
          await refresh(false)
        }}
      />
    </div>
  )
}


function VisitTable(props: { visits: VisitResponse[] }) {
  const { setVisitId, visitId } = useHomeContext()
  const { columns } = useVisitSetListContext()

  function Th(props: { children: any, column: ColumnKeys, style?: JSX.CSSProperties }) {
    return (
      <Show when={columns()[props.column]}>
        <th use:tippy={{ content: columnDescription[props.column] }} style={props.style}>{props.children}</th>
      </Show>
    )
  }

  function Td(props: { children?: any, column: ColumnKeys, style?: JSX.CSSProperties }) {
    return (
      <Show when={columns()[props.column]}>
        <td style={props.style}>{props.children}</td>
      </Show>
    )
  }

  return (
    <div class={styles.visitTable}>
      <table>
        <thead>
          <tr>
            <Th column='id' style={{ width: '7ch' }} >ID</Th>
            <Th column='description' style={{ width: '8ch' }} ><Icon icon='description' /></Th>
            <Th column='issuedAtDate' style={{ width: '10ch' }} ><Icon icon='event' /></Th>
            <Th column='issuedAtTime' style={{ width: '5ch' }} ><Icon icon='schedule' /></Th>
            <Th column='numberOfExposures' style={{ width: '10ch' }} ><Icon icon='tag' /></Th>
            <Th column='exposureTime' style={{ width: '6ch' }} ><Icon icon='shutter_speed' /></Th>
            <Th column='coord_a' style={{ width: '6ch' }} >&alpha;&deg;</Th>
            <Th column='coord_d' style={{ width: '6ch' }} >&delta;&deg;</Th>
            <Th column='azimuth' style={{ width: '6ch' }} >A&deg;</Th>
            <Th column='elevation' style={{ width: '6ch' }} >E&deg;</Th>
            <Th column='insturumentRotator' style={{ width: '6ch' }} >I&deg;</Th>
            <Th column='notes'><Icon icon='note' /></Th>
          </tr>
        </thead>
        <tbody onClick={e => e.stopPropagation()}>
          <For each={props.visits}>
            {v => (
              <tr
                onClick={() => setVisitId(v.id)}
                classList={{ [styles.selected]: visitId() === v.id }}
                data-visit={v.id}
              >
                <Td column='id' style={{ "text-align": 'right' }}>{v.id}</Td>
                <Td column='description'><span use:tippy={{ content: v.description }}>{v.description}</span></Td>
                <Td column='issuedAtDate' style={{ "text-align": 'center' }}> <span use:tippy={{ content: v.issued_at }}>{shortFormatDate(v.issued_at)}</span> </Td>
                <Td column='issuedAtTime' style={{ "text-align": 'center' }}> <span use:tippy={{ content: v.issued_at }}>{shortFormatTime(v.issued_at)}</span> </Td>
                <Td
                  column='numberOfExposures'
                  style={{
                    ...numberOfExposuresStyle(v.n_sps_exposures, v.n_mcs_exposures, v.n_agc_exposures),
                    ...{ "text-align": 'center' }
                  }}
                >
                  {v.n_sps_exposures}/{v.n_mcs_exposures}/{v.n_agc_exposures} </Td>
                <Td column='exposureTime' style={{ "text-align": 'right' }}> {v.avg_exptime?.toFixed(1)} </Td>
                <Td column='coord_a' style={{ "text-align": 'right' }}>{v.avg_ra?.toFixed(2)}</Td>
                <Td column='coord_d' style={{ "text-align": 'right' }}>{v.avg_dec?.toFixed(2)}</Td>
                <Td column='azimuth' style={{ "text-align": 'right' }}>{v.avg_azimuth?.toFixed(1)}</Td>
                <Td column='elevation' style={{ "text-align": 'right' }}>{v.avg_altitude?.toFixed(1)}</Td>
                <Td column='insturumentRotator' style={{ "text-align": 'right' }}>{v.avg_insrot?.toFixed(1)}</Td>
                <Td column='notes'>
                  <For each={v.notes}>
                    {n => <Note note={n} />}
                  </For>
                </Td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div >
  )
}


type Note = VisitResponse["notes"][number]


function Note(props: { note: Note }) {
  return (
    <div class={styles.note} use:tippy={{ content: `${props.note.body} ${props.note.user.account_name}` }}>
      <span class={styles.noteBody} >{props.note.body}</span>
      <span class={styles.noteUser}>{props.note.user.account_name}</span>
    </div>
  )
}


function Paginator() {
  const {
    goFirstPage, goPrevPage, goNextPage, goLastPage,
    goFirstPageDisabled, goPrevPageDisabled,
    goLastPageDisabled, goNextPageDisabled,
  } = usePaginator()
  const { setQueryParams, queryParams, visitCount, refresh, lastRefresh } = useVisitSetListContext()
  const autoRefresh = createMemo(() => {
    const { whereSql, offset } = queryParams()
    return whereSql.trim() === '' && offset === 0
  })
  const [isRefreshing, startRefreshing] = useLoading()
  const { refreshHome } = useHomeContext()

  const refresh_interval = 15_000

  onMount(() => {
    const interval = setInterval(async () => {
      if (autoRefresh() && (Number(new Date()) - Number(lastRefresh())) >= refresh_interval) {
        await startRefreshing(async () => await refresh(false))
      }
    }, 1_000)
    onCleanup(() => clearInterval(interval))
  })

  const goToLatestVisits = async () => {
    setQueryParams.produce(_ => {
      _.limit = 100
      _.offset = 0
      _.whereSql = ''
    })
    return refresh()
  }

  return (
    <div class={styles.paginator}>
      <IconButton
        icon='vertical_align_top'
        tippy={{ content: 'Go to latest visits' }}
        onClick={goToLatestVisits}
        disabled={queryParams().offset === 0 && queryParams().whereSql === ''}
      />
      <IconButton
        icon={autoRefresh() ? 'autorenew' : 'refresh'}
        tippy={{ content: autoRefresh() ? `Refresh Now (Refreshed every ${refresh_interval / 1000})` : 'Refesh Now' }}
        onClick={() => refreshHome({ detail: {}, list: { showLoader: true } })}
        classList={{ [styles.paginatorAutoRefresh]: autoRefresh() }} disabled={isRefreshing()}
      />
      <IconButton icon='first_page' disabled={goFirstPageDisabled()} onClick={goFirstPage} tippy={{ content: 'Latest Visits' }} />
      <IconButton icon='navigate_before' disabled={goPrevPageDisabled()} onClick={goPrevPage} tippy={{ content: 'Next Newer Visits' }} />
      <div class={styles.paginatorRange} use:tippy={{ content: `Displaying ${queryParams().offset + 1} - ${queryParams().offset + queryParams().limit} of ${visitCount()} visits` }}>
        <div>{queryParams().offset + 1} &#x2013; {queryParams().offset + queryParams().limit}</div>
        <div>{visitCount()}</div>
      </div>
      <IconButton icon='navigate_next' disabled={goNextPageDisabled()} onClick={goNextPage} tippy={{ content: 'Next Older Visits' }} />
      <IconButton icon='last_page' disabled={goLastPageDisabled()} onClick={goLastPage} tippy={{ content: 'Oldest Visits' }} />
    </div>
  )
}


function NoIicSequence() {
  return (
    <div class={styles.title}>No Visit Set</div>
  )
}
