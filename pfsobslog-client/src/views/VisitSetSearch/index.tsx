import { defineComponent, InjectionKey, PropType, provide, reactive, watchEffect } from "vue"
import { Header } from "./Header"
import style from './style.module.scss'
import { VisitSetComponent } from "./VisitSetComponent"
import { api } from "/src/api"
import { VisitSet } from "/src/api-client/api"
import { AccordionList } from "/src/components/Accordion"
import { $g } from "/src/store"


export type Control = {
  refresh: () => Promise<void>,
}


export const $control: InjectionKey<Control> = Symbol()


export type SearchCondition = {
  start?: string
  end?: string
  includeSps: boolean
  includeMcs: boolean
  sql: string
  page: number
}


export default defineComponent({
  setup() {
    const searchCondition: SearchCondition = {
      start: $g.session!.last_day,
      end: undefined,
      includeMcs: true,
      includeSps: true,
      sql: '',
      page: 0,
    }

    const $ = reactive({
      visitSets: [] as VisitSet[],
      opened: true,
      searchCondition,
    })

    const refresh = async () => {
      const ss = $.searchCondition
      const { data: { visit_sets: visitSets } } = await api.indexVisitSets(
        ss.start,
        ss.end,
        ss.includeSps,
        ss.includeMcs,
        ss.page,
        ss.sql.length > 0 ? ss.sql : undefined,
      )
      $.visitSets = visitSets
    }

    watchEffect(refresh)
    provide($control, { refresh })

    return () => (
      <div>
        <Header value={$.searchCondition} onChange={sc => $.searchCondition = sc} />
        <VisitSetListComponent visitSets={$.visitSets} />
      </div>
    )
  }
})


const VisitSetListComponent = defineComponent({
  props: {
    visitSets: { type: Array as PropType<VisitSet[]>, required: true },
  },
  setup($p) {
    const $ = reactive({
      visitsOpened: false,
    })
    return () => (
      <div class={style.visitSetList}>
        <AccordionList>
          {() => (
            $p.visitSets.map(visitSet => <VisitSetComponent visitSet={visitSet} key={visitSet.id} />)
          )}
        </AccordionList>
      </div>
    )
  }
})