import { useEventListener } from '@vueuse/core'
import 'highlight.js/styles/monokai.css'
import { CSSProperties, defineComponent, PropType, ref } from "vue"
// @ts-ignore
import VueMarkdownIt from "vue3-markdown-it"
import style from './style.module.scss'


export default defineComponent({
  setup($$) {
    const root = ref<HTMLDivElement>()
    useEventListener(root, 'click', e => {
      if ((e.target as HTMLElement).matches('img')) {
        window.open((e.target as HTMLImageElement).src)
      }
    })
    return () =>
      <div class={style.preview} ref={root} style={$$.style}>
        <VueMarkdownIt style={{ width: '100%', height: '100%' }} ref={root} source={$$.source} />
      </div>
  },
  props: {
    source: {
      type: String,
      default: '',
    },
    style: {
      type: Object as PropType<CSSProperties>,
      default: {},
    }
  },
})
