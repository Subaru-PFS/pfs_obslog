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

    // const addNote = async (visit_set_id: int, body: string) => {
    //   await api.visitSetNoteCreate({ visit_set_id, body })
    //   await visitInspector.refresh()
    // }

    // const editNote = async (visit_set_note_id: int, initial: string) => {
    //   const body = prompt(undefined, initial)
    //   if (body !== null) {
    //     if (body.length > 0) {
    //       await api.visitSetNoteUpdate(visit_set_note_id, { body })
    //     }
    //     else {
    //       await api.visitSetNoteDestroy(visit_set_note_id)
    //     }
    //     await visitInspector.refresh()
    //   }
    // }

    const render = () => {
      const sps = visitInspector.$.m!.sps!

      return (
        <>
          <h3>SpS</h3>
          <dl>
            <dt>Exposure Type</dt>
            <dd>{sps.exp_type}</dd>
            <dt>Exposures</dt>
            <dd>
              <table class="matrix">
                <tr>
                  <th>camera_id</th>
                  <th>exptime</th>
                  <th>exp_start</th>
                  {/* <th>exp_end</th> */}
                  <th>annotation</th>
                </tr>
                {sps.exposures.slice().sort((a, b) => a.camera_id - b.camera_id)
                  .map(e =>
                    <tr>
                      <td class="number">{e.camera_id}</td>
                      <td class="number">{e.exptime}</td>
                      <td >{e.exp_start}</td>
                      {/* <td >{e.exp_end}</td> */}
                      <td ></td>
                    </tr>
                  )}
              </table>
            </dd>
            {/* <dt>Sequence Name</dt>
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
                      > {MI('edit')}</button>
                    </div>
                  </li>
                )}
                <li>
                  <AddButton onSubmit={(note) => addNote(seq.visit_set_id, note)} />
                </li>
              </ul>
            </dd> */}
          </dl>
        </>
      )
    }

    return render
  },
})
