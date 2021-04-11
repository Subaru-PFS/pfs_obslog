import { defineComponent } from "vue"
import { useVisitInspector } from "../useVisitInspector"


export default defineComponent({
  setup() {
    const visitInspector = useVisitInspector()

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
              {sps.exposures.slice().sort((a, b) => a.camera_id - b.camera_id)
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
            </dd>
          </dl>
        </>
      )
    }

    return render
  },
})
