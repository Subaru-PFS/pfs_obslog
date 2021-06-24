import { useIntervalFn } from "@vueuse/core"
import { watch } from "vue"
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
    get autoRefresh() {
      return $.query.date.end === null && $.query.searchBox === ''
    }
  })

  const refresh = () => {
    $.revision += 1
  }

  const autoRefresh = useIntervalFn(() => {
    refresh()
  }, 30 * 1000, { immediate: false })

  watch(() => $.autoRefresh, () => {
    if ($.autoRefresh) {
      autoRefresh.resume()
    } else {
      autoRefresh.pause()
    }
  }, { immediate: true })

  return {
    $,
    keyboardShortcuts,
    refresh,
  }
})
