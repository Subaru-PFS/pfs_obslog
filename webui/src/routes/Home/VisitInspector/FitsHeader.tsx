import { defineComponent, PropType } from "vue"
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

export const Hdu = defineComponent({
  setup($p) {
    const $ = $reactive({
      keywordSearch: '',
      valueSearch: '',
      commentSearch: '',
      get cards() {
        return $p.header.cards.filter(([keyword, value, comment]: [string, any, string]) =>
          keyword.toLowerCase().search($.keywordSearch.toLowerCase()) >= 0 &&
          String(value).toLocaleLowerCase().search($.valueSearch.toLowerCase()) >= 0 &&
          comment.toLowerCase().search($.commentSearch.toLowerCase()) >= 0
        )
      },
    })
    return () =>
      <table class="fits-header">
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
            <th>Comment</th>
          </tr>
          <tr>
            <th><input style={{ width: '100%' }} placeholder="Search" type="search" v-model={$.keywordSearch} /></th>
            <th><input style={{ width: '100%' }} type="search" v-model={$.valueSearch} /></th>
            <th><input style={{ width: '100%' }} type="search" v-model={$.commentSearch} /></th>
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
    }
  }
})


function stringify(v: any) {
  switch (typeof v) {
    case 'boolean':
      return v ? 'T' : 'F'
  }
  return String(v)
}