import { defineComponent } from "vue"
import MI from "~/components/MI"
import { router } from "~/router"

export default defineComponent({
  setup() {
    const render = () => (
      <div class="page">
        <button onClick={e => router.push('/')}><MI icon='home' /></button>
        <h2>Search Syntax</h2>

        <dl>
          <dt>Select visits whoes any columns (including user's notes) contain string `science`. </dt>
          <dd><code>science</code></dd>

          <dt>
            Select visits whoes any columns (including user's notes) contain string `science`
            and don't contain string `object`.
          </dt>
          <dd><code>science - object</code></dd>

          <dt>
            Select visits in error status.
            (It looks that `sps_sequence.status` keeps error message.)
          </dt>
          <dd><code>error</code></dd>
        </dl>

        <h2>Keyboard shortcuts</h2>
        <table>
          <tr>
            <th>/</th>
            <td>Focus on search box.</td>
          </tr>
          <tr>
            <th>R</th>
            <td>Refresh</td>
          </tr>
        </table>
      </div >
    )
    return render
  }
})