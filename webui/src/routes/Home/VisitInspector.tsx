import { defineComponent, onMounted, reactive } from "vue"
import { api } from "~/api"
import { VisitDetail } from "~/api-client"

export default defineComponent({
  setup($p) {
    const $ = reactive({
      m: null as null | VisitDetail,
    })

    const refresh = async () => {
      $.m = (await api.pfsVisitShow($p.id)).data
    }

    onMounted(async () => {
      await refresh()
    })

    const render = () => {
      return (
        <div>
          id={$p.id}
          <pre>{JSON.stringify($.m, null, 2)}</pre>
          <hr />
        </div>
      )
    }
    return render
  },
  props: {
    id: {
      type: Number,
      required: true,
    }
  }
})