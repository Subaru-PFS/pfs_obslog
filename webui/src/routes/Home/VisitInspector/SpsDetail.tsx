import { defineComponent } from "vue"
import { apiUrl } from "~/api"
import { FitsType, SpsExposure } from "~/api-client"
import Folder from "~/components/Folder"
import LazyImage from "~/components/LazyImage"
import MI from "~/components/MI"
import { armName, decodeCameraId, fitsFileName } from "~/pfs"
import { $reactive } from "~/vue-utils/reactive"
import { inspectorContext } from "./"


const imageSize = {
  raw: {
    width: 4416, height: 4300,
  },
  calexp: {
    width: 4096, height: 4176,
  }
}


export default defineComponent({
  setup() {
    const inspector = inspectorContext.inject()
    const $ = $reactive({
      scale: 0.08,
      showPreview: true,
      previewType: 'raw' as 'raw' | 'calexp',
      get visit() {
        return inspector.$.visit!
      },
      get visitId() {
        return $.visit.id
      },
      get sps() {
        return $.visit.sps!
      },
      get previewPath() {
        return (e: SpsExposure, params: { [key: string]: any } = {}) => {
          const qs = object2qs(params)
          return {
            raw: `./api/fits_preview/${$.visitId}/${e.camera_id}?${qs}`,
            calexp: `./api/imagepreview/calexp/${$.visitId}/${e.camera_id}?${qs}`,
          }[$.previewType]
        }
      }
    })
    return () =>
      <>
        <Folder title="Exposures" opened={true} key="sps_exposures_compact">
          <div style={{ display: 'flex', marginBottom: '0.5em' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginRight: '1em' }}>
              <input type="checkbox" v-model={$.showPreview} />
              <MI data-tooltip="Preview" icon="visibility" />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', marginRight: '0.5em' }}>
              <input type="radio" name="previewType" v-model={$.previewType} value='raw' />
              Raw
            </label>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input type="radio" name="previewType" v-model={$.previewType} value='calexp' />
              ISR
            </label>
          </div>
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
                      data-tooltip="Download Raw FITS"
                      onClick={async () => {
                        location.href = await apiUrl(c => c.fitsDownload($.visitId, e.camera_id, FitsType.Raw))
                      }}
                    >
                      <MI icon="file_download" />
                    </button>
                    <button
                      data-tooltip="Download ISR FITS"
                      onClick={async () => {
                        location.href = await apiUrl(c => c.fitsDownload($.visitId, e.camera_id, FitsType.Calexp))
                      }}
                    >
                      <MI icon="file_download" />
                    </button>
                    <button
                      data-tooltip="Show"
                      onClick={_ => location.href = $.previewPath(e)}
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
                        src={$.previewPath(e, {
                          width: Math.floor($.scale * imageSize[$.previewType].width),
                          height: Math.floor($.scale * imageSize[$.previewType].height),
                        })}
                        scrollTarget={inspector.el}
                        width={Math.floor($.scale * imageSize[$.previewType].width)}
                        height={Math.floor($.scale * imageSize[$.previewType].height)}
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

function object2qs(params: { [key: string]: any }) {
  return Object.keys(params).map(key => key + '=' + params[key]).join('&')
}
