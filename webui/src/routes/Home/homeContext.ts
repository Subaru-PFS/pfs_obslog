import { keyboardShortcutsContext } from "~/contexts/keyboardShortcutsContext"
import { router } from "~/router"
import { safeJsonParse } from "~/utils/safejson"
import { makeContext } from "~/vue-utils/context"
import { $reactive } from "~/vue-utils/reactive"
import { defaultQuery } from "./query"


export const homeContext = makeContext('home', () => {
  const keyboardShortcuts = keyboardShortcutsContext.provide()

  keyboardShortcuts.add({
    r: () => refresh(),
  })

  const $ = $reactive({
    query: safeJsonParse(router.currentRoute.value.query?.['q'], () => defaultQuery()),
    visitId: undefined as undefined | number,
    revision: 0,
  })

  const refresh = () => {
    $.revision += 1
  }

  return {
    $,
    keyboardShortcuts,
    refresh,
  }
})
