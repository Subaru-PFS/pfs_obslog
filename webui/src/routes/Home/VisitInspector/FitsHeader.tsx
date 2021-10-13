import { defineComponent, PropType, watchEffect } from "vue"
import { FitsMeta } from "~/api-client"
import Folder from "~/components/Folder"
import { $reactive } from "~/vue-utils/reactive"
import "./fits-header.scss"

export default defineComponent({
  setup($p) {
    return () =>
      <>
        {$p.meta.hdul.map((hdu, hduIndex) =>
          <Folder title={`${$p.meta.frameid}[${hduIndex}]`} opened={false}>
            <Hdu header={hdu.header} />
          </Folder>
        )}
      </>
  },
  props: {
    meta: {
      type: Object as PropType<FitsMeta>,
      required: true,
    }
  }
})

type SafeRegexpError = [number, string]

function safeRegexp(pattern: string, flags: string, index: number) {
  try {
    return new RegExp(pattern, flags)
  }
  catch (e) {
    throw [index, String(e)] as SafeRegexpError
  }
}

export const Hdu = defineComponent({
  setup($p, { emit }) {
    const $ = $reactive({
      keywordSearch: $p.keywordSearch,
      valueSearch: $p.valueSearch,
      commentSearch: $p.commentSearch,
      error: [] as (string | undefined)[],
      get cards() {
        $.error = []
        try {
          return $p.header.cards.filter(([keyword, value, comment]: [string, any, string]) =>
            keyword.search(safeRegexp($.keywordSearch, 'i', 0)) >= 0 &&
            String(value).search(safeRegexp($.valueSearch, 'i', 1)) >= 0 &&
            comment.search(safeRegexp($.commentSearch, 'i', 2)) >= 0
          )
        }
        catch (e) {
          const [index, error] = e as SafeRegexpError
          $.error[index] = error
        }
        return $p.header.cards
      },
    })

    watchEffect(() => emit('update:keywordSearch', $.keywordSearch))
    watchEffect(() => emit('update:valueSearch', $.valueSearch))
    watchEffect(() => emit('update:commentSearch', $.commentSearch))

    return () =>
      <table class="fits-header" style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: '12ch' }}>Name</th>
            <th>Value</th>
            <th>Comment</th>
          </tr>
          <tr>
            <th><input class={{ error: $.error[0] !== undefined }} style={{ width: '100%' }} placeholder="Search" type="search" v-model={$.keywordSearch} /></th>
            <th><input class={{ error: $.error[1] !== undefined }} style={{ width: '100%' }} type="search" v-model={$.valueSearch} /></th>
            <th><input class={{ error: $.error[2] !== undefined }} style={{ width: '100%' }} type="search" v-model={$.commentSearch} /></th>
          </tr>
        </thead>
        <tbody>
          {$.cards.map(([keyword, value, comment]) => (
            <tr>
              {keyword === 'COMMENT' ?
                <>
                  <td class="keyword">{keyword}</td>
                  <td colspan={2} class="comment">{value}</td>
                </>
                :
                <>
                  <td class="keyword">{keyword}</td>
                  <td class="value">{stringify(value)}</td>
                  <td class="comment">{comment}</td>
                </>
              }
            </tr>
          ))}
        </tbody>
      </table>
  },
  props: {
    header: {
      type: Object as PropType<FitsMeta["hdul"][0]["header"]>,
      required: true,
    },
    keywordSearch: {
      type: String,
      default: '',
    },
    valueSearch: {
      type: String,
      default: '',
    },
    commentSearch: {
      type: String,
      default: '',
    },
  },
  emits: ['update:keywordSearch', 'update:valueSearch', 'update:commentSearch'],
})


function stringify(v: any) {
  switch (typeof v) {
    case 'boolean':
      return v ? 'T' : 'F'
  }
  return String(v)
}
