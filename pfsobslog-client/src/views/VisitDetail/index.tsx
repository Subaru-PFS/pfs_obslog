import { defineComponent } from "vue"
import { go } from "/src/router"


export default defineComponent({
  props: {
    id: { type: Number, required: true },
  },
  setup($p) {
    return () => (
      <div class="visitDetail">
        <h1>Jsx Component {$p.id}</h1>
        <button onClick={() => go('/', 'slideRight')}>↩️</button>
      </div>
    )
  },
  __hmrId: process.env.NODE_ENV === 'development' && import.meta.url,
})


declare var __VUE_HMR_RUNTIME__: any
// @ts-ignore
if (import.meta.hot) {
  __VUE_HMR_RUNTIME__.createRecord(import.meta.url)
  // @ts-ignore
  import.meta.hot.accept(newModule => {
    __VUE_HMR_RUNTIME__.reload(import.meta.url, newModule.default)
  })
}