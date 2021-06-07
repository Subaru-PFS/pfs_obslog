import { keyboardShortcutsContext } from "~/contexts/keyboardShortcutsContext"
import { router } from "~/router"
import { safeJsonParse } from "~/utils/safejson"
import { makeContext } from "~/vue-utils/context"
import { $reactive } from "~/vue-utils/reactive"
import { buildSql, defaultQuery } from "./query"


type HomeContextOptions = {
  $p: { revision: number },
  notifyRefresh: () => void
}


export const homeContext = makeContext('home', (options: HomeContextOptions) => {
  const keyboardShortcuts = keyboardShortcutsContext.provide()

  const $ = $reactive({
    query: safeJsonParse(router.currentRoute.value.query?.['q'], () => defaultQuery()),
    get sql() {
      return buildSql($.query)
    },
    visitId: undefined as undefined | number,
  })

  const refresh = async () => {
    options.notifyRefresh()
  }

  return {
    $,
    keyboardShortcuts,
    refresh,
  }
})
