import { defineComponent } from "vue"
import Folder from "~/components/Folder"
import LazyImage from "~/components/LazyImage"
import MI from "~/components/MI"
import { $reactive } from "~/vue-utils/reactive"
import { inspectorContext } from "./"


export default defineComponent({
  setup() {
    const inspector = inspectorContext.inject()
    const $ = $reactive({
      showPreview: !import.meta.env.DEV,
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
            <MI icon="visibility" /> Preview
          </label>
          <table class="compact-table">
            <tr>
              <th>ID</th>
              <th data-tooltip="Exposure Start"><MI icon="schedule" /></th>
              <th data-tooltip="Exposure Time[s]"><MI icon="shutter_speed" /></th>
              <th>FITS</th>
              {$.showPreview &&
                <th data-tooltip="Preview" ><MI icon="visibility" /></th>
              }
              <th data-tooltip="Notes"><MI icon="comment" /></th>
            </tr>
            {$.sps.exposures.slice().sort((a, b) => a.camera_id - b.camera_id)
              .map(e => <>
                <tr>
                  <td>{e.camera_id}</td>
                  <td>{time(e.exp_start)}</td>
                  <td style={{ textAlign: 'right' }}>{e.exptime}</td>
                  <td>
                    <button
                      data-tooltip="Download"
                      onClick={_ => location.href = `./api/fits_download/${$.visitId}/${e.camera_id}`}
                    >
                      <MI icon="file_download" />
                    </button>
                    <button
                      data-tooltip="Show"
                      onClick={_ => location.href = `./api/fits_preview/${$.visitId}/${e.camera_id}`}
                    >
                      <MI icon="open_in_new" />
                    </button>
                  </td>
                  {
                    $.showPreview &&
                    <td>
                      <LazyImage
                        src={`./api/fits_preview/${$.visitId}/${e.camera_id}?width=400&height=400`}
                        scrollTarget={inspector.el}
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