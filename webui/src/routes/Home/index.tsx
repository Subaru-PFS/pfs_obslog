import { defineComponent } from "vue"
import { homeContext } from "./homeContext"
import MainTable from "./MainTable"
import { MenuButtons } from "./MenuButtons"
import SearchBox from './SearchBox'

export default defineComponent({
  setup() {
    homeContext.provide()
    return () =>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex' }}>
          <SearchBox style={{ flexGrow: 1 }} />
          <MenuButtons />
        </div>
        <MainTable style={{ flexGrow: 1 }} />
      </div>
  },
})
