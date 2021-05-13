import { defineComponent } from "vue"
import { api } from "~/api"
import AddButton from "~/components/AddButton"
import MI from "~/components/MaterialIcon"
import { $g } from "~/global"
import { int } from "~/types"
import { useVisitInspector } from "../useVisitInspector"


export default defineComponent({
  setup() {
    const visitInspector = useVisitInspector()

    const addNote = async (visit_set_id: int, body: string) => {
      await api.visitSetNoteCreate({ visit_set_id, body })
      await visitInspector.refresh()
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
        await visitInspector.refresh()
      }
    }

    const render = () => {
      const seq = visitInspector.$.m!.sps_sequence!

      return (
        <dl>
          <dt>Sequence Type</dt>
          <dd>{seq.sequence_type}</dd>
          <dt>Sequence Name</dt>
          <dd>{seq.name}</dd>
          <dt>Status</dt>
          <dd>{seq.status}</dd>
          <dt>Command</dt>
          <dd><code>{seq.cmd_str}</code></dd>
          <dt>Comments</dt>
          <dd>{seq.comments}</dd>
          <dt>Notes</dt>
          <dd>
            <ul class="notes">
              {seq.notes.slice().sort((a, b) => a.id - b.id).map(n =>
                <li key={n.id}>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <div style={{ flexGrow: 1 }}>{n.body}</div>
                    <div class="username">{n.user.account_name}</div>
                    <button
                      onClick={e => editNote(n.id, n.body)}
                      disabled={$g.session!.user.id !== n.user_id}
                    > <MI icon='edit' /></button>
                  </div>
                </li>
              )}
              <li>
                <AddButton onSubmit={(note) => addNote(seq.visit_set_id, note)} />
              </li>
            </ul>
          </dd>
        </dl>
      )
    }

    return render
  },
})
