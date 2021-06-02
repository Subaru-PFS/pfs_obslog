import { defineComponent, PropType } from "@vue/runtime-core"
import { FitsMeta } from "~/api-client"
import Folder from "~/components/Folder"
import "./fits-header.scss"

export default defineComponent({
  setup($$) {
    return () =>
      <>
        {$$.meta.hdul.map((hdu, hduIndex) => (
          <Folder title={`${$$.meta.frameid}[${hduIndex}]`} opened={false}>
            <table class="fits-header">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Value</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {hdu.header.cards.map(([keyword, value, comment]) => (
                  <tr>
                    {keyword === 'COMMENT' ?
                      <>
                        <td class="keyword">{keyword}</td>
                        <td colspan={2} class="comment">{value}</td>
                      </>
                      :
                      <>
                        <td class="keyword">{keyword}</td>
                        <td class="value">{value}</td>
                        <td class="comment">{comment}</td>
                      </>
                    }
                  </tr>
                ))}
              </tbody>
            </table>
          </Folder>
        ))}
      </>
  },
  props: {
    meta: {
      type: Object as PropType<FitsMeta>,
      required: true,
    }
  }
})