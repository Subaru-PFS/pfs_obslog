// @ts-ignore
import { Pane, Splitpanes } from 'splitpanes'
import { defineComponent } from "vue"
import { homeContext } from "./homeContext"
import VisitTable from "./VisitTable"
import { MenuButtons } from "./MenuButtons"
import SearchBox from './SearchBox'
import SearchCondition from "./SearchCondition"
import VisitInspector from "./VisitInspector"

export default defineComponent({
  setup() {
    const $c = homeContext.provide()

    return () =>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex' }}>
          <SearchBox style={{ flexGrow: 1 }} />
          <MenuButtons />
        </div>
        <SearchCondition />
        <hr />
        <Splitpanes
          dblClickSplitter={false}
          class="pfs_obslog_splitpanes" style={{ flexGrow: 1 }}
        >
          <Pane minSize={5}>
            <VisitTable
              v-models={[
                [$c.$.query, 'query'],
                [$c.$.revision, 'revision'],
                [$c.$.visitId, 'visitId'],
              ]}
            />
          </Pane>
          <Pane minSize={5}>
            <VisitInspector visitId={$c.$.visitId} v-model={[$c.$.revision, 'revision']} />
          </Pane>
        </Splitpanes>
      </div>
  },
})
