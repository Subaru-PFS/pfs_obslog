import { usePreferredDark } from "@vueuse/core"
import { defineComponent } from "vue"
import { $reactive } from "~/vue-utils/reactive"
import { inspectorContext } from "./"
import LazyImage from '~/components/LazyImage'
import { apiUrl } from "~/api"
import { range } from "~/utils/range"

export default defineComponent({
  setup() {
    const isDark = usePreferredDark()
    const $c = inspectorContext.inject()
    const $ = $reactive({
      get agc() {
        return $c.$.visit!.agc!
      },
    })

    return () =>
      <>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {$.agc.exposures.map(exposure => (
            range(6).map(camera_i => (
              <div style={{ margin: '4px' }}>
                <div style={{ marginTop: '0.2em', fontFamily: 'monospace', display: 'flex', justifyContent: 'center' }}>{exposure.id}[{camera_i + 1}]</div>
                <LazyImage
                  src={apiUrl(c => c.showAgcFitsPreview($c.$.visit?.id!, exposure.id, camera_i + 1, 358, 345))}
                  scrollTarget={$c.el}
                  width={358}
                  height={345}
                />
              </div>
            ))
          ))}
        </div>
        <pre>{JSON.stringify($.agc, null, 2)}</pre>
      </>
  }
})
