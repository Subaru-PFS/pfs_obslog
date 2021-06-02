import { ref, watch } from "@vue/runtime-core"
import { api } from "~/api"
import { VisitDetail } from "~/api-client"
import { async_debounce } from "~/utils/functools"
import { makeContext } from "~/vue-utils/context"
import { $reactive } from "~/vue-utils/reactive"


export const inspectorContext = makeContext('inspector', ($$: { visitId?: number }) => {
  const $ = $reactive({
    visit: undefined as VisitDetail | undefined,
  })

  const refresh = async_debounce(400, async () => {
    const visitId = $$.visitId
    $.visit = visitId ? (await api.visitDetail(visitId)).data : undefined
  })

  watch(() => $$.visitId, () => refresh(), { immediate: true })

  const el = ref<HTMLDivElement>()

  return {
    $,
    el,
    refresh,
  }
})
