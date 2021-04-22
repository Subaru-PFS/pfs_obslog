import { defineComponent, PropType } from "@vue/runtime-core"
import { FitsMeta } from "~/api-client"
import "./fits-header.scss"

export default defineComponent({
  setup($$) {
    const render = () => (
      <>
        <h3>{$$.meta.frameid}</h3>
        {$$.meta.hdul.map((hdu, hduIndex) => (
          <>
            <h4>{$$.meta.frameid}[{hduIndex}]</h4>
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
                        <td colspan={3} class="comment">{value}</td>
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
          </>
        ))}
      </>
    )
    return render
  },
  props: {
    meta: {
      type: Object as PropType<FitsMeta>,
      required: true,
    }
  }
})