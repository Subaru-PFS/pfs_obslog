import { defineComponent } from "vue"
import { api } from "~/api"
import AddButton from "~/components/AddButton"
import Folder from "~/components/Folder"
import MI from "~/components/MI"
import { $g } from "~/global"
import { int } from "~/types"
import { $reactive } from "~/vue-utils/reactive"
import { inspectorContext } from "./inspectorContext"


export default defineComponent({
  setup() {
    const inspector = inspectorContext.inject()
    const $c = inspector.$
    const $ = $reactive({
      get seq() {
        return $c.visit?.sps_sequence!
      }
    })

    const addNote = async (visit_set_id: int, body: string) => {
      await api.visitSetNoteCreate({ visit_set_id, body })
      inspector.refresh()
    }

    const editNote = async (visit_set_note_id: int, initial: string) => {
      const body = prompt(undefined, initial)
      if (body !== null) {
        if (body.length > 0) {
          await api.visitSetNoteUpdate(visit_set_note_id, { body })
        }
        else {
          await api.visitSetNoteDestroy(visit_set_note_id)
        }
        inspector.refresh()
      }
    }

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
          <dd><code>{$.seq.cmd_str}</code></dd>
          {$.seq.comments &&
            <>
              <dt>Comments</dt>
              <dd>{$.seq.comments}</dd>
            </>}
        </dl>
        <Folder title="Notes">
          <ul class="notes">
            {$.seq.notes.slice().sort((a, b) => a.id - b.id).map(n =>
              <li key={n.id}>
                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <div style={{ flexGrow: 1 }}>{n.body}</div>
                  <div class="username">{n.user.account_name}</div>
                  <button
                    onClick={e => editNote(n.id, n.body)}
                    disabled={$g.session!.user.id !== n.user_id}
                  >
                    <MI icon='edit' />
                  </button>
                </div>
              </li>
            )}
            <li>
              <AddButton onSubmit={(note) => addNote($.seq.visit_set_id, note)} />
            </li>
          </ul>
        </Folder>
      </>
  },
})
