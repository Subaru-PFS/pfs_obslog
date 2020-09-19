import moment from 'moment'
import { defineComponent, inject, PropType } from "vue"
import { $control } from "."
import style from './style.module.scss'
import { SpsExposure, Visit } from "/src/api-client/api"

export const SpsExposureListComponent = defineComponent({
  props: {
    visit: { type: Object as PropType<Visit>, required: true },
  },
  setup($p) {
    return () => {
      const { exposures } = $p.visit.sps_visit!
      const { refresh } = inject($control)!

      const addSpsExposureNote = async (e: SpsExposure) => {
        alert("Not implemented")
      }

      return (
        <table class={style.spsExposureList}>
          <thead>
            <tr>
              <th>camera id</th>
              <th>exp start</th>
              <th>exp end</th>
              <th>exptime</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {exposures.map(e => (
              <tr>
                <td>{e.camera_id}</td>
                <td>{moment(e.exp_start).format('HH:mm:ss')}</td>
                <td>{moment(e.exp_end).format('HH:mm:ss')}</td>
                <td>{e.exptime}</td>
                <td>
                  <button onClick={() => alert('Look exposure:\n Not implemented yet.')}>👀</button>
                  <button onClick={() => alert('Detailed:\n Not implemented yet.')}>🔎</button>
                  <button title="🖌 Add Note" onClick={() => addSpsExposureNote(e)}>🖌</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
  }
})
