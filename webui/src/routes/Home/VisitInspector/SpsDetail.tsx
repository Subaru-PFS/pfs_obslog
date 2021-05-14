import { defineComponent } from "vue"
import Folder from "~/components/Folder"
import LazyImage from "~/components/LazyImage"
import MI from "~/components/MI"
import { $reactive } from "~/vue-utils/reactive"
import { inspectorContext } from "./inspectorContext"


export default defineComponent({
  setup() {
    const inspector = inspectorContext.inject()
    const $ = $reactive({
      showPreview: true,
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
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1em' }}>
            <input type="checkbox" v-model={$.showPreview} />&nbsp;
            <MI icon="visibility" />
          </label>
          <table class="compact-table">
            <tr>
              <th>ID</th>
              <th>Start</th>
              <th>ExpTime[s]</th>
              <th>FITS</th>
              {$.showPreview &&
                <th>Preview</th>
              }
              <th>Annotations</th>
            </tr>
            {$.sps.exposures.slice().sort((a, b) => a.camera_id - b.camera_id)
              .map(e => <>
                <tr>
                  <td>{e.camera_id}</td>
                  <td>{time(e.exp_start)}</td>
                  <td>{e.exptime}</td>
                  <td>
                    <button onClick={_ => location.href = `./api/fits_download/${$.visitId}/${e.camera_id}`}>
                      <MI icon="file_download" />
                    </button>
                    <button onClick={_ => location.href = `./api/fits_preview/${$.visitId}/${e.camera_id}`}>
                      <MI icon="visibility" />
                    </button>
                  </td>
                  {
                    $.showPreview &&
                    <td>
                      <LazyImage
                        src={`./api/fits_preview/${$.visitId}/${e.camera_id}?width=400&height=400`}
                        width={400}
                        height={400}
                      />
                    </td>
                  }
                  <td>
                    <ul class="notes">
                      {e.annotation.map(a => (
                        <li key={a.annotation_id}>{a.notes} flag={a.data_flag} {a.created_at}</li>
                      ))}
                    </ul>
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