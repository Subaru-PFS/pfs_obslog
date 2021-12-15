import { defineComponent, watchEffect, onMounted, PropType } from 'vue'
import { api, apiUrl } from '~/api'
import { FitsMeta } from '~/api-client'
import AsyncButton from '~/components/AsyncButton'
import AsyncSrcLazyImage from '~/components/LazyImage'
import MI from '~/components/MI'
import { router } from '~/router'
import { $reactive } from '~/vue-utils/reactive'
import style from './style.module.scss'


export default defineComponent({
  setup() {
    const $ = $reactive({
      fits: [] as FitsMeta[],
      selected: [] as string[],
      plotUrl: undefined as undefined | string,
    })

    watchEffect(async () => {
      if ($.selected.length == 0) {
        $.plotUrl = undefined
      }
      else {
        $.plotUrl = await apiUrl(c => c.pfsDesignChart(
          $.selected.map(framied => extractId(framied))
        ))
      }
    })

    const reload = async () => {
      $.fits = (await api.listPfsDesign()).data
    }

    const toggle = (frameid: string) => {
      const i = $.selected.indexOf(frameid)
      if (i >= 0) {
        $.selected.splice(i, 1)
      } else {
        $.selected.push(frameid)
      }
    }

    onMounted(reload)

    return () =>
      <div>
        <div class="header">
          <button onClick={_ => router.push('/')}>
            <MI icon="home" />
          </button>
          <AsyncButton onClick={reload}>
            <MI icon="refresh" />
          </AsyncButton>
        </div>
        <div class={style.designList} style={{ display: 'flex' }}>
          <div>
            {$.fits.map(f => <DesignEntry fits={f} onChange={() => toggle(f.frameid)} checked={$.selected.includes(f.frameid)} />)}
          </div>
          <div style={{ flexGrow: 1 }}>
            {$.plotUrl && <img src={$.plotUrl} />}
          </div>
        </div>
      </div>
  }
})

const DesignEntry = defineComponent({
  setup($p) {
    const $ = $reactive({
      get name() {
        return extractId($p.fits.frameid)
      }
    })

    return () =>
      <div class={style.designEntry}>
        <label>
          <input type="checkbox" onChange={$p.onChange} checked={$p.checked} />
          {$.name}
        </label>
      </div>
  },
  props: {
    fits: {
      type: Object as PropType<FitsMeta>,
      required: true,
    },
    onChange: {
      type: Function as PropType<() => void>,
      required: true,
    },
    checked: {
      type: Boolean,
      required: true,
    },
  }
})


function extractId(frameid: string) {
  return frameid.split(/[\-\.]/)[1]
}