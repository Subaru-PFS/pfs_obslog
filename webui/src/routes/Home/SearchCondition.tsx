import { defineComponent } from "vue"
import { api, apiUrl } from "~/api"
import { DateInput } from "~/components/DateInput"
import MI from "~/components/MI"
import { $reactive } from "~/vue-utils/reactive"
import { homeContext } from "./homeContext"
import { buildSql } from "./query"
import style from './style.module.scss'

export default defineComponent({
  setup() {
    const home = homeContext.inject()
    const $ = $reactive({
      get q() {
        return home.$.query
      },
    })

    const downloadCsv = async () => {
      location.href = await apiUrl(c => c.listVisitCsv(buildSql(home.$.query)))
    }

    return () =>
      <div class={style.SearchCondition} style={{ display: 'flex', alignItems: 'center' }}>
        <div>
          <span data-tooltip="Number of SpS Exposures">#SpS:</span>
          <select v-model={$.q.include_sps}>
            <option value="false">==0</option>
            <option value="any">&gt;=0</option>
            <option value="true">&gt;=1</option>
          </select>
          {' '}
          <span data-tooltip="Number of MCS Exposures" >#MCS:</span>
          <select v-model={$.q.include_mcs}>
            <option value="false">==0</option>
            <option value="any">&gt;=0</option>
            <option value="true">&gt;=1</option>
          </select>
          {' '}
          <span data-tooltip="Number of AGC Exposures" >#AGC:</span>
          <select v-model={$.q.include_agc}>
            <option value="false">==0</option>
            <option value="any">&gt;=0</option>
            <option value="true">&gt;=1</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <MI data-tooltip="Date" icon='date_range' />
          <DateInput v-model={$.q.date.begin} />
          <button onClick={() => $.q.date.range = !$.q.date.range} ><MI icon='more_horiz' size={18} data-tooltip="Range" /></button>
          {$.q.date.range && <DateInput v-model={$.q.date.end} />}
        </div>
        <div style={{ flexGrow: 1 }}></div>
        <div>
          <button onClick={() => downloadCsv()}>CSV</button>
        </div>
      </div >
  }
})
