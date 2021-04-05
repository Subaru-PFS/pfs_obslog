import { inject, provide, reactive } from "vue"
import { api } from "~/api"
import { VisitDetail } from "~/api-client"
import { int } from "~/types"
import { async_debounce } from "~/utils/functools"


const KEY = Symbol('visit-inspector')


export function useVisitInspectorProvider() {
  const $ = reactive({
    m: null as null | VisitDetail,
  })

  const reload = async_debounce(400, async (visit_id: int) => {
    $.m = (await api.visitDetail(visit_id)).data
  })

  const refresh = async () => {
    $.m && await reload($.m.id)
  }

  const provider = { reload, refresh, $ }
  provide(KEY, provider)
  return provider
}


export function useVisitInspector() {
  return inject<ReturnType<typeof useVisitInspectorProvider>>(KEY)!
}
