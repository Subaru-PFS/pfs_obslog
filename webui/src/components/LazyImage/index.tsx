import { defineComponent, PropType, reactive, Ref, ref, watch } from '@vue/runtime-core'
import { useElementVisibility } from '@vueuse/core'
import style from './style.module.scss'


export default defineComponent({
  setup($$) {
    const el = ref<HTMLDivElement | undefined>()
    const elIsVisible = useElementVisibility(el, { scrollTarget: $$.scrollTarget })

    const $ = reactive({
      loading: true,
    })

    const onLoad = () => {
      $.loading = false
    }

    watch(() => $$.src, () => $.loading = true)

    const dimensions = {
      width: `${$$.width}px`,
      height: `${$$.height}px`,
    }

    const render = () =>
      <div class="lazy-image" ref={el} style={{ display: 'inline-block' }}>
        {elIsVisible.value ? <>
          <img
            src={$$.src}
            alt={$$.alt}
            onLoad={onLoad}
            style={{ display: $.loading ? 'none' : 'inline', ...dimensions, verticalAlign: 'bottom' }}
          />
          {$.loading &&
            <div class={style.box} style={dimensions}>
              <div class={style.loader}></div>
            </div>
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

