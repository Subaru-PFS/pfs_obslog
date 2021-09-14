import Color from "color"
import { defineComponent, PropType } from "vue"
import { api } from "~/api"
import { VisitSet } from "~/api-client"
import { bgColor, fgColor } from "~/utils/colors"
import { $reactive } from "~/vue-utils/reactive"
import NoteList from "../components/NoteList"
import { visitListContext } from './'
import style from './style.module.scss'


export default defineComponent({
  setup($p) {
    const $ = $reactive({
      get seq() {
        return $p.visitSet.sps_sequence!
      },
      get seqStatusText() {
        return $.seq.status?.cmd_output
      },
      get typeColor() {
        return sequenceTypeBaseColor[$.seq.sequence_type!] || Color('grey')
      },
      get statusColor() {
        return statusBaseColor[$.seqStatusText!]! || Color('#f00')
      },
    })

    const $c = visitListContext.inject()

    return () =>
      <div class={style.visitSet}>
        <table class="compact-table">
          <tr>
            <th>VisitSet</th>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
          <tr>
            <td>{$.seq.visit_set_id}</td>
            <td>{$.seq.name}</td>
            <td
              style={{
                color: fgColor($.typeColor).string(),
                backgroundColor: bgColor($.typeColor).string(),
              }}
            >{$.seq.sequence_type}</td>
            <td
              style={{
                color: fgColor($.statusColor).string(),
                backgroundColor: bgColor($.statusColor).string(),
              }}
            >{
                $.seqStatusText && `${$.seqStatusText} (${$.seq.status?.status_flag})`
              }</td>
          </tr>
        </table>
        <code class="command">{$.seq.cmd_str}</code>
        {$.seq.comments &&
          <div style={{ fontFamily: 'monospace' }}> {$.seq.comments} </div>
        }
        <NoteList
          notes={$.seq.notes}
          createNote={body => api.visitSetNoteCreate({ visit_set_id: $.seq.visit_set_id, body })}
          updateNote={(note_id, body) => api.visitSetNoteUpdate(note_id, { body })}
          deleteNote={note_id => api.visitSetNoteDestroy(note_id)}
          refresh={$c.notifyUpdate}
        />
      </div>
  },
  props: {
    visitSet: {
      type: Object as PropType<VisitSet>,
      required: true,
    }
  },
})

const sequenceTypeBaseColor: { [name: string]: Color } = {
  scienceObject: Color('#07f'),
  scienceTrace: Color('#00f'),
  scienceArc: Color('#0f0'),
  ditheredArcs: Color('#0f0'),
  undefined: Color('#777'),
}

const statusBaseColor: { [name: string]: Color } = {
  finishRequested: Color('#00f'),
  complete: Color('#0f0'),
}
