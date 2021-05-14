import { defineComponent, watch } from "@vue/runtime-core"
import { api } from "~/api"
import { VisitDetail } from "~/api-client"
import Folder from "~/components/Folder"
import { async_debounce } from "~/utils/functools"
import { makeContext } from "~/vue-utils/context"
import { $reactive } from "~/vue-utils/reactive"
import BaseDetail from "./BaseDetail"
import style from './style.module.scss'


export const inspectorContext = makeContext(($$: { visitId?: number }) => {
  const $ = $reactive({
    visit: undefined as VisitDetail | undefined,
  })

  const refresh = async_debounce(400, async () => {
    const visitId = $$.visitId
    $.visit = visitId ? (await api.visitDetail(visitId)).data : undefined
  })

  watch(() => $$.visitId, () => refresh(), { immediate: true })

  return {
    $,
    refresh,
  }
})


export default defineComponent({
  setup($$) {
    const inspector = inspectorContext.provide($$)
    const { $ } = inspector

    return () =>
      <div class={style.main} style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ flexGrow: 1, height: 0, overflowY: 'auto' }}>
          {$.visit &&
            <>
              <Folder title={`pfs_visit(id=${$.visit.id})`} opened={true}>
                <BaseDetail />
              </Folder>
              <pre>{JSON.stringify($.visit, undefined, 2)}</pre>
            </>
          }
        </div>
      </div>
  },
  props: {
    visitId: {
      type: Number,
    },
  },
})
