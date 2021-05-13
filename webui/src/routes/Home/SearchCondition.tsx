import { defineComponent } from "@vue/runtime-core"
import MI from "~/components/MaterialIcon"
import { DateInput } from "~/components/DateInput"
import { useVisitList } from "./useVisitList"

export default defineComponent({
  setup() {
    const visitList = useVisitList()

    const $ = visitList.q.date

    const render = () => (
      <div class="search-condition" style={{ display: 'flex', alignItems: 'center' }}>
        <div class="type">
          #SpS:
          <select v-model={visitList.q.include_sps}>
            <option value="false">==0</option>
            <option value="any">&gt;=0</option>
            <option value="true">&gt;=1</option>
          </select>
          &nbsp;
          #MCS:
          <select v-model={visitList.q.include_mcs}>
            <option value="false">==0</option>
            <option value="any">&gt;=0</option>
            <option value="true">&gt;=1</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <MI icon='date_range' />
          <DateInput v-model={$.begin} />
          <button onClick={e => $.range = !$.range}><MI icon='more_horiz' size={18}  /></button>
          {$.range && <DateInput v-model={$.end} />}
        </div>
      </div>
    )
    return render
  }
})
