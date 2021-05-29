import Color from "color"
import { CSSProperties, defineComponent, ref } from "vue"
import { fgColor } from "~/utils/colors"
import { $reactive } from "~/vue-utils/reactive"
import { homeContext } from "./homeContext"

export default defineComponent({
  setup() {
    const home = homeContext.inject()
    const searchRef = ref<HTMLInputElement>()
    const $ = $reactive({
      keywords: home.$.query.keywords,
      get isSql() {
        return $.keywords.match(/where\s/i)
      }
    })
    home.keyboardShortcuts.add({
      '/': () => searchRef.value?.focus(),
    })
    const onSubmit = (e: Event) => {
      e.preventDefault()
      home.$.query.keywords = $.keywords
    }
    const render = () =>
      <form onSubmit={onSubmit} style={formStyle}>
        <input
          type="text"
          ref={searchRef}
          v-model={$.keywords}
          placeholder='Search'
          style={{
            ...inputStyle,
            ...($.isSql ? sqlStyle : {})
          }}
        />
      </form>
    return render
  }
})

const formStyle: CSSProperties = {
  margin: 0,
  padding: '2px',
}

const inputStyle: CSSProperties = {
  boxSizing: 'border-box',
  borderRadius: '8px',
  width: '100%',
  height: '100%',
  padding: '2px 4px',
  margin: 0,
}

const sqlStyle: CSSProperties = {
  fontFamily: 'monospace',
  color: fgColor(Color('cyan')).string(),
}
