type Query = {
  searchBox: string,
  start: number,
  end: number,
  date: {
    begin: null | string
    end: null | string
    range: boolean
  }
  include_sps: 'any' | 'true' | 'false'
  include_mcs: 'any' | 'true' | 'false'
}

export const perPage = 200

export function defaultQuery(): Query {
  return {
    searchBox: '',
    start: 0,
    end: perPage,
    date: {
      begin: null,
      end: null,
      range: false,
    },
    include_sps: 'any',
    include_mcs: 'any',
  }
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

export function buildSql(query: Query) {
  const { include_mcs, include_sps, date } = query
  const keywords = query.searchBox
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
  terms.push({ true: 'is_sps_visit', false: 'not is_sps_visit', any: 'true' }[include_sps])
  terms.push({ true: 'is_mcs_visit', false: 'not is_mcs_visit', any: 'true' }[include_mcs])
  const cleanTerms = terms.filter(t => t !== 'true')
  return cleanTerms.length > 0 ? 'where ' + cleanTerms.join(' AND ') : ''
}
