import { defineComponent } from "vue"
import { api } from "~/api"
import AddButton from "~/components/AddButton"
import { MI } from "~/components/MaterialIcon"
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

      return (
        <>
          <h3>PFS Visit</h3>
          <dl>
            <dt>ID</dt>
            <dd>{m.id}</dd>
            <dt>Description</dt>
            <dd>{m.description}</dd>
            <dt>Issued</dt>
            <dd>{m.issued_at}</dd>
            <dt>Notes</dt>
            <dd>
              <ul class="notes">
                {m.notes.slice().sort((a, b) => a.id - b.id).map(n =>
                  <li key={n.id}>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <div style={{ flexGrow: 1 }}>{n.body}</div>
                      <div class="username">{n.user.account_name}</div>
                      <button
                        onClick={e => editNote(n.id, n.body)}
                        disabled={$g.session!.user.id !== n.user_id}
                      > {MI('edit')}</button>
                    </div>
                  </li>
                )}
                <li>
                  <AddButton onSubmit={(note) => addNote(m!.id, note)} />
                </li>
              </ul>
            </dd>
          </dl>
        </>
      )
    }

    return render
  },
})
