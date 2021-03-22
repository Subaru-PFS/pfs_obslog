import gridStyles from '~/styles/grid.module.scss'
import { OpReturnType } from 'openapi-typescript-fetch'
import { createMemo, Show } from 'solid-js'
import { fetcher } from '~/api'
import { paths } from '~/api/schema'
import { GridCellGroup } from '~/components/layout'
import { useHomeContext } from '../../../context'
import { NoteList } from '../../../NoteList'
import styles from './styles.module.scss'
import { sequenceTypeStyle, statusStyle } from '~/pages/Home/VisitSetList/colors'


type VisitDetail = OpReturnType<paths['/api/visits/{id}']['get']>


export function IicSequence(props: { visit: VisitDetail }) {
  const createNote = fetcher.path('/api/visit_sets/{visit_set_id}/notes').method('post').create()
  const updateNote = fetcher.path('/api/visit_sets/{visit_set_id}/notes/{id}').method('put').create()
  const deleteNote = fetcher.path('/api/visit_sets/{visit_set_id}/notes/{id}').method('delete').create()

  const { refreshHome } = useHomeContext()
  const refresh = async () => {
    refreshHome({ detail: {}, list: {} })
  }

  const iicSequence = createMemo(() => props.visit.sps_sequence!)

  return (
    <div>
      <div class={styles.summary} style={{ "grid-template-columns": 'repeat(4, 1fr)' }}>
        <GridCellGroup class={gridStyles.header}>
          <div>Visit Set Id</div>
          <div>Name</div>
          <div>Type</div>
          <div>Status</div>
        </GridCellGroup>
        <GridCellGroup class={gridStyles.data}>
          <div>{iicSequence().visit_set_id}</div>
          <div>{iicSequence().name}</div>
          <div style={sequenceTypeStyle(props.visit.sps_sequence?.sequence_type)} >
            {iicSequence().sequence_type}</div>
          <div style={statusStyle(props.visit.sps_sequence?.status?.cmd_output)} >
            {iicSequence().status?.cmd_output}</div>
        </GridCellGroup>
      </div>
      <code class={styles.command}>{iicSequence().cmd_str}</code>
      <Show when={iicSequence().comments}>
        <div class={styles.command}>
          {iicSequence().comments}
        </div>
      </Show>
      <NoteList
        notes={iicSequence().notes}
        createNote={async (body) => {
          await createNote({ visit_set_id: iicSequence().visit_set_id, body })
          await refresh()
        }}
        updateNote={async (noteId, body) => {
          await updateNote({ id: noteId, body })
          await refresh()
        }}
        deleteNote={async (noteId) => {
          await deleteNote({ id: noteId })
          await refresh()
        }} />
    </div>
  )
}
