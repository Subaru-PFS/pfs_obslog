import { defineComponent } from "vue"
import { homeContext } from "./homeContext"
import MainTable from "./MainTable"
import { MenuButtons } from "./MenuButtons"
import SearchBox from './SearchBox'
// @ts-ignore
import { Splitpanes, Pane } from 'splitpanes'
import SearchCondition from "./SearchCondition"
import VisitInspector from "./VisitInspector"

export default defineComponent({
  setup($p, { emit }) {
    const notifyRefresh = () => {
      emit('update:revision', $p.revision + 1)
    }

    const $c = homeContext.provide({ $p, notifyRefresh })
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
            <MainTable />
          </Pane>
          <Pane minSize={5}>
            <VisitInspector visitId={$c.$.visitId} />
          </Pane>
        </Splitpanes>
      </div>
  },
  props: {
    revision: {
      Type: Number,
      default: 0,
    },
  },
  emits: {
    'update:revision'(revision: number) {
      return true
    },
  }
})
