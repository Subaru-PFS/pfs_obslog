import { ref, watch } from "vue"
import { api } from "~/api"
import { VisitDetail } from "~/api-client"
import { async_debounce } from "~/utils/functools"
import { makeContext } from "~/vue-utils/context"
import { $reactive } from "~/vue-utils/reactive"


export const inspectorContext = makeContext('inspector', ($p: { visitId?: number }) => {
  const $ = $reactive({
    visit: undefined as VisitDetail | undefined,
  })

  const refresh = async_debounce(400, async () => {
    const visitId = $p.visitId
    $.visit = visitId ? (await api.visitDetail(visitId)).data : undefined
  })

  watch(() => $p.visitId, () => refresh(), { immediate: true })

  const el = ref<HTMLDivElement>()

  return {
    $,
    el,
    refresh,
  }
})

