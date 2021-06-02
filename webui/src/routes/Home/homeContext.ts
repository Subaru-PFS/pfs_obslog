import { keyboardShortcutsContext } from "~/contexts/keyboardShortcutsContext"
import { router } from "~/router"
import { safeJsonParse } from "~/utils/safejson"
import { makeContext } from "~/vue-utils/context"
import { $reactive } from "~/vue-utils/reactive"
import { buildSql, defaultQuery } from "./query"

export const homeContext = makeContext('home', () => {
  const keyboardShortcuts = keyboardShortcutsContext.provide()

  const $ = $reactive({
    query: safeJsonParse(router.currentRoute.value.query?.['q'], () => defaultQuery()),
    get sql() {
      return buildSql($.query)
    }
  })

  const refresh = async () => {
  }

  return {
    $,
    keyboardShortcuts,
    refresh,
  }
})
