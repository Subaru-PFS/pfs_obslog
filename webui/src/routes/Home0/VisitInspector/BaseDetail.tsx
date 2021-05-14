import { defineComponent } from "vue"
import { api } from "~/api"
import AddButton from "~/components/AddButton"
import Folder from "~/components/Folder"
import MI from "~/components/MI"
import { $g } from "~/global"
import { int } from "~/types"
import { useVisitInspector } from "../useVisitInspector"


export default defineComponent({
  setup() {
    const visitInspector = useVisitInspector()

    const addNote = async (visit_id: int, body: string) => {
      await api.visitNoteCreate({ visit_id, body })
      await visitInspector.refresh()
    }

    const editNote = async (visit_note_id: int, initial: string) => {
      const body = prompt(undefined, initial)
      if (body !== null) {
        if (body.length > 0) {
          await api.visitNoteUpdate(visit_note_id, { body })
        }
        else {
          await api.visitNoteDestroy(visit_note_id)
        }
        await visitInspector.refresh()
      }
    }

    const render = () => {
      const m = visitInspector.$.m!

      return <>
        <table class="compact-table">
          <tr>
            <th>ID</th>
            <th>Desc.</th>
            <th>Issued</th>
          </tr>
          <tr>
            <td>{m.id} </td>
            <td>{m.description} </td>
            <td>{m.issued_at} </td>
          </tr>
        </table>
        <Folder title="Notes" opened={true}>
          <ul class="notes">
            {m.notes.slice().sort((a, b) => a.id - b.id).map(n =>
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
              <AddButton onSubmit={(note) => addNote(m!.id, note)} />
            </li>
          </ul>
        </Folder>
      </>
    }

    return render
  },
})
