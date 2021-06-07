import { defineComponent } from "vue"
import { api } from "~/api"
import Folder from "~/components/Folder"
import { $reactive } from "~/vue-utils/reactive"
import NoteList from "./components/NoteList"
import { inspectorContext } from "./inspectorContext"
import style from './style.module.scss'


export default defineComponent({
  setup() {
    const $c = inspectorContext.inject()
    const $ = $reactive({
      get seq() {
        return $c.$.visit?.sps_sequence!
      }
    })

    return () =>
      <>
        <table class="compact-table">
          <tr>
            <th>Type</th>
            <th>Name</th>
            <th>Status</th>
          </tr>
          <tr>
            <td>{$.seq.sequence_type}</td>
            <td>{$.seq.name}</td>
            <td>{$.seq.status}</td>
          </tr>
        </table>
        <dl>
          <dt>Command</dt>
          <dd><code class={style.command}>{$.seq.cmd_str}</code></dd>
          {$.seq.comments &&
            <>
              <dt>Comments</dt>
              <dd>{$.seq.comments}</dd>
            </>}
        </dl>
        <Folder title="Notes">
          <NoteList
            notes={$.seq.notes}
            createNote={body => api.visitSetNoteCreate({ visit_set_id: $.seq.visit_set_id, body })}
            updateNote={(note_id, body) => api.visitSetNoteUpdate(note_id, { body })}
            deleteNote={note_id => api.visitSetNoteDestroy(note_id)}
          />
        </Folder>
      </>
  },
})
