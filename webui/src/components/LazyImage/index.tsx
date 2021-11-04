import { useElementVisibility } from '@vueuse/core'
import { defineComponent, PropType, Ref, ref, watch } from 'vue'
import { $reactive } from '~/vue-utils/reactive'
import Loading from '../Loading'
import MI from '../MI'


const SyncSrcLazyImage = defineComponent({
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
          <Loading style={$.dimentions} />
        }
        {$.state === 'loading' &&
          <>
            <img
              src={$p.src}
              onLoad={onLoad}
              onError={onError}
              style={{ display: 'none' }}
            />
            <Loading style={$.dimentions} />
          </>
        }
        {$.state === 'ready' &&
          <img
            ref={imgEl}
            src={$p.src}
            alt={$p.alt}
            onLoad={onLoad}
            onError={onError}
            style={{ display: 'inline', ...$.dimentions, verticalAlign: 'bottom' }}
          />
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


const AsyncSrcLazyImage = defineComponent({
  setup($p) {
    const $ = $reactive({
      resolvedSrc: undefined as undefined | string,
      width: undefined as undefined | number,
      height: undefined as undefined | number,
      get dimentions() {
        return {
          width: `${$.width ?? $p.width}px`,
          height: `${$.height ?? $p.height}px`,
        }
      }
    })
    let srcChange = 0
    watch(() => $p.src, () => {
      if ($p.src instanceof Promise) {
        ++srcChange
        const srcChange2 = srcChange
        $.resolvedSrc = undefined
        $p.src.then(newSrc => {
          if (srcChange2 == srcChange) {
            $.resolvedSrc = newSrc
          }
        })
      }
      else {
        $.resolvedSrc = $p.src
      }
    }, { immediate: true })
    return () =>
      !!$.resolvedSrc ?
        <SyncSrcLazyImage
          src={$.resolvedSrc!}
          alt={$p.alt}
          width={$p.width}
          height={$p.height}
        /> :
        <Loading style={$.dimentions} />
  },
  props: {
    scrollTarget: {
      type: Object as PropType<Ref<undefined | HTMLDivElement>>,
    },
    src: {
      type: [String, Object] as PropType<string | Promise<string>>,
      required: true,
    },
    alt: {
      type: String,
    },
    width: {
      type: Number,
      default: 120,
    },
    height: {
      type: Number,
      default: 120,
    },
  }
})


export default AsyncSrcLazyImage
