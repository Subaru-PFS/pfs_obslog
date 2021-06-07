import { defineComponent, PropType, reactive, Ref, ref, watch } from 'vue'
import { useElementVisibility } from '@vueuse/core'
import Loading from '../Loading'


export default defineComponent({
  setup($p) {
    const el = ref<HTMLDivElement>()
    const elIsVisible = useElementVisibility(el, { scrollTarget: $p.scrollTarget })

    const $ = reactive({
      loading: true,
    })

    const onLoad = () => {
      $.loading = false
    }

    watch(() => $p.src, () => $.loading = true)

    const dimensions = {
      width: `${$p.width}px`,
      height: `${$p.height}px`,
    }

    const render = () =>
      <div class="lazy-image" ref={el} style={{ display: 'inline-block' }}>
        {elIsVisible.value ? <>
          <img
            src={$p.src}
            alt={$p.alt}
            onLoad={onLoad}
            style={{ display: $.loading ? 'none' : 'inline', ...dimensions, verticalAlign: 'bottom' }}
          />
          {$.loading &&
            <Loading style={dimensions} />
          }
        </> :
          <div style={dimensions} />
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

