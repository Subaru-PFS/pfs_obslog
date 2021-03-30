import { defineComponent, onMounted, reactive } from "vue"
import { api } from "~/api"
import { VisitDetail } from "~/api-client"

export default defineComponent({
  setup($$) {
    const $ = reactive({
      m: null as null | VisitDetail,
    })

    const refresh = async () => {
      $.m = (await api.pfsVisitShow($$.id)).data
    }

    onMounted(async () => {
      await refresh()
    })

    const render = () => {
      return (
        <div>
          id={$$.id}
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