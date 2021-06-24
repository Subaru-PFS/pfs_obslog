import { defineComponent } from "vue"
import Folder from "~/components/Folder"
import LazyImage from "~/components/LazyImage"
import MI from "~/components/MI"
import { armName, decodeCameraId, fitsFileName } from "~/pfs"
import { $reactive } from "~/vue-utils/reactive"
import { inspectorContext } from "./"


export default defineComponent({
  setup() {
    const inspector = inspectorContext.inject()
    const $ = $reactive({
      showPreview: true,
      get visit() {
        return inspector.$.visit!
      },
      get visitId() {
        return $.visit.id
      },
      get sps() {
        return $.visit.sps!
      },
    })
    return () =>
      <>
        <Folder title="Exposures" opened={true} key="sps_exposures_compact">
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '1em' }}>
            <input type="checkbox" v-model={$.showPreview} />&nbsp;
            <MI icon="visibility" /> Preview
          </label>
          <table class="compact-table">
            {$.sps.exposures.slice().sort((a, b) => a.camera_id - b.camera_id)
              .map((e, i_i) => <>
                {($.showPreview || i_i == 0) &&
                  <tr>
                    <th>ID</th>
                    <th data-tooltip="Module">M</th>
                    <th data-tooltip="Arm">Arm</th>
                    <th data-tooltip="Exposure Start"><MI icon="schedule" /></th>
                    <th data-tooltip="Exposure Time[s]"><MI icon="shutter_speed" /></th>
                    <th>FITS</th>
                    <th data-tooltip="Notes"><MI icon="comment" /></th>
                  </tr>
                }
                <tr>
                  <td>{e.camera_id}</td>
                  <td>{decodeCameraId(e.camera_id).sm}</td>
                  <td>{armName(e.camera_id)}</td>
                  <td>{time(e.exp_start)}</td>
                  <td style={{ textAlign: 'right' }}>{e.exptime.toFixed(2)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
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
                  <td>
                    <ul class="notes">
                      {e.annotation.map(a => (
                        <li key={a.annotation_id}>{a.notes} flag={a.data_flag} {a.created_at}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
                <tr>
                  {
                    $.showPreview &&
                    <td colspan={7} style={{ textAlign: 'center' }} >
                      {/* 4300 × 4416 */}
                      <LazyImage
                        style={{ marginBottom: '0.5em' }}
                        src={`./api/fits_preview/${$.visitId}/${e.camera_id}?width=400&height=400`}
                        scrollTarget={inspector.el}
                        width={Math.floor(0.08 * 4300)}
                        height={Math.floor(0.08 * 4416)}
                      /><br />
                      {fitsFileName($.visitId!, e.camera_id)}
                    </td>
                  }
                </tr>
              </>)
            }
          </table>
        </Folder>
      </>
  },
})


function time(s?: string) {
  if (s) {
    return s.split('T')[1].slice(0, 5)
  }
}