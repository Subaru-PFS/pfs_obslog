import { watch, watchEffect } from "@vue/runtime-core"
import { pushQuery, router } from "~/router"
import { safeJsonParse } from "~/utils/safejson"
import { makeContext } from "~/vue-utils/context"
import { $reactive } from "~/vue-utils/reactive"
import { keyboardShortcutsContext } from "~/contexts/keyboardShortcutsContext"

type ExposureSelector = 'any' | 'true' | 'false'

const defaultQuery = {
  id: 0,
  start: 0,
  end: 100,
  keywords: '',
  date: {
    begin: null as null | string,
    end: null as null | string,
    range: false,
  },
  include_sps: 'any' as ExposureSelector,
  include_mcs: 'any' as ExposureSelector,
}

export const homeContext = makeContext('home', () => {
  const keyboardShortcuts = keyboardShortcutsContext.provide()
  const $ = $reactive({
    selectedVisitId: safeJsonParse(router.currentRoute.value.query?.['visit'], () => undefined) as undefined | number,
    query: safeJsonParse(router.currentRoute.value.query?.['q'], () => defaultQuery),
    get sql() {
      const { include_mcs, include_sps, keywords, date } = $.query
      return buildSql(keywords, date, { include_mcs, include_sps })
    },
  })
  watch(() => $.sql, () => {
    $.query.start = 0
    $.query.end = 100
  })
  watchEffect(() => {
    pushQuery({ q: JSON.stringify($.query) })
  })
  watchEffect(() => {
    pushQuery({ visit: JSON.stringify($.selectedVisitId) })
  })
  return {
    $,
    refresh() {
      ++$.query.id
    },
    keyboardShortcuts,
  }
})

type DateQuery = {
  begin: string | null
  end: string | null
  range: boolean
}

type VisitType = {
  include_sps: ExposureSelector,
  include_mcs: ExposureSelector,
}

function filterToSqlTerms(s: string) {
  const isSql = s.match(/where\s+(.*)/i)
  if (isSql) {
    return [isSql[1]]
  }
  else {
    const terms = s
      .replace(/'/g, '')
      .replace(/\-\s*/g, '-').split(/\s+/)
      .filter(c => c.length > 0)
      .map(c =>
        c.charAt(0) == '-' ?
          `any_column NOT LIKE '%${c.substring(1)}%'` :
          `any_column LIKE '%${c}%'`
      )
    return terms
  }
}

function buildSql(keywords: string, date: DateQuery, type: VisitType) {
  const terms = filterToSqlTerms(keywords)
  if (date.range) {
    if (date.begin) {
      terms.push(`'${date.begin}' <= issued_at::date`)
    }
    if (date.end) {
      terms.push(`issued_at::date <= '${date.end}'`)
    }
  }
  else {
    if (date.begin) { // day selection
      terms.push(`issued_at::date = '${date.begin}'`)
    }
  }
  terms.push({ true: 'is_sps_visit', false: 'not is_sps_visit', any: 'true' }[type.include_sps])
  terms.push({ true: 'is_mcs_visit', false: 'not is_mcs_visit', any: 'true' }[type.include_mcs])
  const cleanTerms = terms.filter(t => t !== 'true')
  return cleanTerms.length > 0 ? 'where ' + cleanTerms.join(' AND ') : ''
}