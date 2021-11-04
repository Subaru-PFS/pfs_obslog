import { defineComponent } from "vue"
import { api } from "~/api"
import { $reactive } from "~/vue-utils/reactive"
import NoteList from "../components/NoteList"
import { inspectorContext } from "./"


export default defineComponent({
  setup() {
    const $c = inspectorContext.inject()
    const $ = $reactive({
      get seq() {
        return $c.$.visit?.sps_sequence!
      },
      get seqStatusText() {
        return $.seq.status?.cmd_output
      },
    })

    return () =>
      <>
        <table class="compact-table">
          <tr>
            <th>VisitSet</th>
            <th>Type</th>
            <th>Name</th>
            <th>Status</th>
          </tr>
          <tr>
            <td>{$.seq.visit_set_id}</td>
            <td>{$.seq.sequence_type}</td>
            <td>{$.seq.name}</td>
            <td>{
              $.seq && `${$.seqStatusText} (${$.seq.status?.status_flag})`
            }</td>
          </tr>
        </table>
        <code class="command">{$.seq.cmd_str}</code>
        {$.seq.comments &&
          <p>{$.seq.comments}</p>
        }
        {/* <Folder title="Notes"> */}
        <NoteList
          notes={$.seq.notes}
          createNote={body => api.createVisitSetNote({ visit_set_id: $.seq.visit_set_id, body })}
          updateNote={(note_id, body) => api.updateVisitSetNote(note_id, { body })}
          deleteNote={note_id => api.destroyVisitSetNote(note_id)}
          refresh={$c.notifyUpdate}
        />
        {/* </Folder> */}
      </>
  },
})
