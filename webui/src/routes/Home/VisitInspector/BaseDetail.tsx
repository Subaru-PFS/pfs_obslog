import { defineComponent } from "vue"
import { api } from "~/api"
import Folder from "~/components/Folder"
import { $reactive } from "~/vue-utils/reactive"
import NoteList from "./components/NoteList"
import { inspectorContext } from "./inspectorContext"


export default defineComponent({
  setup() {
    const inspector = inspectorContext.inject()

    const $ = $reactive({
      get visit() {
        return inspector.$.visit!
      }
    })

    return () =>
      <>
        <table class="compact-table">
          <tr>
            <th>ID</th>
            <th>Desc.</th>
            <th>Issued</th>
          </tr>
          <tr>
            <td>{$.visit.id}</td>
            <td>{$.visit.description}</td>
            <td>{$.visit.issued_at}</td>
          </tr>
        </table>

        <Folder title="Notes" opened={true}>
          <NoteList
            notes={$.visit.notes}
            createNote={body => api.visitNoteCreate({ visit_id: $.visit.id, body })}
            updateNote={(note_id, body) => api.visitNoteUpdate(note_id, { body })}
            deleteNote={note_id => api.visitNoteDestroy(note_id)}
          />
        </Folder>
      </>
  },
})
