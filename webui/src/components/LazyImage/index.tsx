import { defineComponent, PropType, reactive, Ref, ref, watch } from 'vue'
import { useElementVisibility } from '@vueuse/core'
import Loading from '../Loading'
import MI from '../MI'


export default defineComponent({
  setup($p) {
    const el = ref<HTMLDivElement>()
    const elIsVisible = useElementVisibility(el, { scrollTarget: $p.scrollTarget })

    const $ = reactive({
      state: 'inactive' as 'inactive' | 'loading' | 'ready' | 'error',
      error: undefined as undefined | string,
    })

    watch(() => elIsVisible.value, visible => {
      if (visible && $.state === 'inactive') {
        $.state = 'loading'
      }
    }, { immediate: true })

    watch(() => $p.src, () => {
      $.state = elIsVisible.value ? 'loading' : 'inactive'
    })

    const onLoad = () => {
      $.state = 'ready'
    }

    const onError = (ev: Event) => {
      $.state = 'error'
      $.error = `Error`
    }

    const dimensions = {
      width: `${$p.width}px`,
      height: `${$p.height}px`,
    }

    const render = () =>
      <div class="lazy-image" ref={el} style={{ display: 'inline-block' }}>
        {$.state === 'inactive' &&
          <div style={dimensions} />
        }
        {($.state === 'loading' || $.state === 'ready') &&
          <>
            <img
              src={$p.src}
              alt={$p.alt}
              onLoad={onLoad}
              onError={onError}
              style={{ display: $.state === 'loading' ? 'none' : 'inline', ...dimensions, verticalAlign: 'bottom' }}
            />
            {$.state === 'loading' && <Loading style={dimensions} />}
          </>
        }
        {$.state === 'error' &&
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...dimensions }}>
            <MI data-tooltip={`Failed to download ${$p.src}`} icon="error" size={48} />
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

