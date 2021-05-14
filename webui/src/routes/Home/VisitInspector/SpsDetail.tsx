import { defineComponent } from "vue"
import Folder from "~/components/Folder"
import MI from "~/components/MI"
import { $reactive } from "~/vue-utils/reactive"
import { inspectorContext } from "./inspectorContext"


export default defineComponent({
  setup() {
    const inspector = inspectorContext.inject()
    const $ = $reactive({
      get visitId() {
        return inspector.$.visit?.id
      },
      get sps() {
        return inspector.$.visit?.sps!
      },
    })
    return () =>
      <>
        <Folder title="Exposures (Compact)" opened={true} key="sps_exposures_compact">
          <table class="compact-table">
            <tr>
              <th>ID</th>
              <th>Start</th>
              <th>ExpTime[s]</th>
              <th>Annotations</th>
              <th>FITS</th>
            </tr>
            {$.sps.exposures.slice().sort((a, b) => a.camera_id - b.camera_id)
              .map(e => <>
                <tr>
                  <td>{e.camera_id}</td>
                  <td>{time(e.exp_start)}</td>
                  <td>{e.exptime}</td>
                  <td>
                    <ul class="notes">
                      {e.annotation.map(a => (
                        <li key={a.annotation_id}>{a.notes} flag={a.data_flag} {a.created_at}</li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <button onClick={_ => location.href = `./api/fits_download/${$.visitId}/${e.camera_id}`}>
                      <MI icon="file_download" />
                    </button>
                    <button onClick={_ => location.href = `./api/fits_preview/${$.visitId}/${e.camera_id}`}>
                      <MI icon="visibility" />
                    </button>
                  </td>
                </tr>
              </>)
            }
          </table>
        </Folder>
        <Folder title="Exposures (Full)" opened={false} key="sps_exposures_compact">
          {$.sps.exposures.slice().sort((a, b) => a.camera_id - b.camera_id)
            .map(e => <>
              <h4>Camera ID: {e.camera_id}</h4>
              <dl>
                <dt>exptime</dt>
                <dd>{e.exptime}</dd>
                <dt>exp_start</dt>
                <dd>{e.exp_start}</dd>
                <dt>exp_end</dt>
                <dd>{e.exp_end}</dd>
                <dt>Annotation</dt>
                <dd>
                  <ul class="notes">
                    {e.annotation.map(a => (
                      <li key={a.annotation_id}>{a.notes} flag={a.data_flag} {a.created_at}</li>
                    ))}
                  </ul>
                </dd>
              </dl>
            </>)
          }
        </Folder>
      </>
  },
})


function time(s?: string) {
  if (s) {
    return s.split('T')[1].slice(0, 5)
  }
}