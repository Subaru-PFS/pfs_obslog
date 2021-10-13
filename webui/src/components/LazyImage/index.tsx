import { useElementVisibility } from '@vueuse/core'
import { defineComponent, PropType, Ref, ref, watch } from 'vue'
import { $reactive } from '~/vue-utils/reactive'
import Loading from '../Loading'
import MI from '../MI'


export default defineComponent({
  setup($p) {
    const el = ref<HTMLDivElement>()
    const elIsVisible = useElementVisibility(el, { scrollTarget: $p.scrollTarget })

    const $ = $reactive({
      state: 'inactive' as 'inactive' | 'loading' | 'ready' | 'error',
      error: undefined as undefined | string,
      width: undefined as undefined | number,
      height: undefined as undefined | number,
      get dimentions() {
        return {
          width: `${$.width ?? $p.width}px`,
          height: `${$.height ?? $p.height}px`,
        }
      },
    })

    const imgEl = ref<HTMLImageElement>()

    const refresh = () => {
      $.state = elIsVisible.value ? 'loading' : 'inactive'
      $.width = undefined
      $.height = undefined
    }

    watch(() => elIsVisible.value, visible => {
      if (visible && $.state === 'inactive') {
        $.state = 'loading'
      }
    }, { immediate: true })

    watch(() => $p.src, () => {
      refresh()
    })

    const onLoad = () => {
      $.state = 'ready'
      if (imgEl.value) {
        $.width = imgEl.value.naturalWidth
        $.height = imgEl.value.naturalHeight
      }
    }

    const onError = (ev: Event) => {
      $.state = 'error'
      $.error = `Error`
    }

    const render = () =>
      <div class="lazy-image" ref={el} style={{ display: 'inline-block' }}>
        {$.state === 'inactive' &&
          <div style={$.dimentions} />
        }
        {($.state === 'loading' || $.state === 'ready') &&
          <>
            <img
              ref={imgEl}
              src={$p.src}
              alt={$p.alt}
              onLoad={onLoad}
              onError={onError}
              style={{ display: $.state === 'loading' ? 'none' : 'inline', ...$.dimentions, verticalAlign: 'bottom' }}
            />
            {$.state === 'loading' && <Loading style={$.dimentions} />}
          </>
        }
        {$.state === 'error' &&
          <div style={{ position: 'relative', ...$.dimentions }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <button data-tooltip="Reload" onClick={refresh}>
                <MI icon="refresh" size={48} />
              </button>
            </div>
            <div style={{ position: 'absolute', bottom: '1em', fontSize: 'small' }}>Failed to load {$p.src}</div>
          </div>
        }
      </div>
    return render
  },
  props: {
    scrollTarget: {
      type: Object as PropType<Ref<undefined | HTMLDivElement>>,
    },
    src: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
    },
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
  }
})

