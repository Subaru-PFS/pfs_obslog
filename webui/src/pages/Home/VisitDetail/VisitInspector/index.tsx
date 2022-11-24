import { createEffect, createMemo, createSignal } from 'solid-js'
import { fetcher } from '~/api'
import { Icon } from '~/components/Icon'
import { GridCellGroup } from '~/components/layout'
import { Tabs } from '~/components/Tabs'
import { tippy } from '~/components/Tippy'
import gridStyles from '~/styles/grid.module.scss'
import { useHomeContext } from '../../context'
import { NoteList } from '../../NoteList'
import { numberOfExposuresStyle } from '../../VisitSetList/colors'
import { useVisitDetailContext } from '../context'
import { VisitDetailType } from '../types'
import { AgcInspector } from './AgcInspector'
import { IicSequence } from './IicSequence'
import { McsInspector } from './McsInspector'
import { SpsInspector } from './SpsInspector'
import styles from './styles.module.scss'
tippy


export function VisitInspector(props: { visit: VisitDetailType }) {
  const [activeTabIndex, setActiveTabIndex] = createSignal(0)
  const { setFitsId } = useVisitDetailContext()

  createEffect(() => {
    // change active tab so that the tab display something.
    const { sps, mcs, agc, sps_sequence } = props.visit
    const nothingToDisplay = ![sps, mcs, agc, sps_sequence][activeTabIndex()]
    if (nothingToDisplay) {
      let tabIndex = 0
      tabIndex === 0 && !props.visit.sps && ++tabIndex
      tabIndex === 1 && !props.visit.mcs && ++tabIndex
      tabIndex === 2 && !props.visit.agc && ++tabIndex
      tabIndex === 3 && !props.visit.sps_sequence && (tabIndex = activeTabIndex())
      setActiveTabIndex(tabIndex)
    }
    // change fits viewer target
    const tabIndex = activeTabIndex()
    if (tabIndex === 0 && (props.visit.sps?.exposures.length ?? 0) > 0) {
      setFitsId({ visit_id: props.visit.id, type: 'sps', fits_id: props.visit.sps?.exposures[0].camera_id! })
    } else if (tabIndex === 1 && (props.visit.mcs?.exposures.length ?? 0) > 0) {
      setFitsId({ visit_id: props.visit.id, type: 'mcs', fits_id: props.visit.mcs?.exposures[0].frame_id! })
    }
    else if (tabIndex === 2 && (props.visit.agc?.exposures.length ?? 0) > 0) {
      setFitsId({ visit_id: props.visit.id, type: 'agc', fits_id: props.visit.agc?.exposures[0].id! })
    }
    else {
      setFitsId(undefined)
    }
  })

  return (
    <div class={styles.visitInspector}>
      <Summary visit={props.visit} />
      <Tabs
        style={{ "flex-grow": 1 }}
        activeTabIndex={activeTabIndex()}
        onActiveTabIndexChange={setActiveTabIndex}
        tabs={[
          { title: 'SpS', contents: props.visit.sps && (() => <SpsInspector visit={props.visit} />) },
          { title: 'MCS', contents: props.visit.mcs && (() => <McsInspector visit={props.visit} />) },
          { title: 'AGC', contents: props.visit.agc && (() => <AgcInspector visit={props.visit} />) },
          { title: 'IIC Sequence', contents: props.visit.sps_sequence && (() => <IicSequence visit={props.visit} />) },
        ]} />
    </div>
  )
}


function Summary(props: { visit: VisitDetailType }) {
  const { goToVisit } = useHomeContext()
  const noe = createMemo<[number, number, number]>(() => {
    const { sps, mcs, agc } = props.visit
    return [sps?.exposures.length ?? 0, mcs?.exposures.length ?? 0, agc?.exposures.length ?? 0]
  })

  return (
    <div class={styles.summary} style={{ "grid-template-columns": "repeat(4, auto) 1fr" }} >
      <GridCellGroup class={gridStyles.header}>
        <div>ID</div>
        <div use:tippy={{ content: 'Description' }}><Icon icon='note' /></div>
        <div use:tippy={{ content: 'Issued at' }}><Icon icon='schedule' /></div>
        <div use:tippy={{ content: 'Number of {SpS | MCS | AGC} Exposures' }}><Icon icon='tag' /></div>
        <div use:tippy={{ content: 'Notes' }}><Icon icon='chat_bubble_outline' /></div>
      </GridCellGroup>
      <GridCellGroup class={gridStyles.data}>
        <div>
          <button
            use:tippy={{ content: 'Show this visit in the left list' }}
            style={{ display: 'flex', 'align-items': 'center' }} onClick={() => {
              goToVisit({ visitId: props.visit.id })
            }}>
            <Icon icon='switch_access_shortcut' />
            {props.visit.id}
          </button>
        </div>
        <div>{props.visit.description}</div>
        <div>{props.visit.issued_at?.split('T').join(' ')}</div>
        <div>
          <span style={numberOfExposuresStyle(...noe())} >
            {noe()[0]}/{noe()[1]}/{noe()[2]}
          </span>
        </div>
        <VisitNotes visit={props.visit} />
      </GridCellGroup>
    </div>
  )
}


function VisitNotes(props: { visit: VisitDetailType }) {
  const { refreshHome } = useHomeContext()
  const createNote = fetcher.path('/api/visits/{visit_id}/notes').method('post').create()
  const updateNote = fetcher.path('/api/visits/{visit_id}/notes/{id}').method('put').create()
  const deleteNote = fetcher.path('/api/visits/{visit_id}/notes/{id}').method('delete').create()

  const refresh = async () => {
    await refreshHome({
      list: {},
      detail: {},
    })
  }

  return (
    <NoteList
      notes={props.visit.notes}
      createNote={async (body) => {
        await createNote({ visit_id: props.visit.id, body })
        await refresh()
      }}
      updateNote={async (noteId, body) => {
        await updateNote({ visit_id: props.visit.id, id: noteId, body })
        await refresh()
      }}
      deleteNote={async (noteId) => {
        await deleteNote({ visit_id: props.visit.id, id: noteId })
        await refresh()
      }} />
  )
}
