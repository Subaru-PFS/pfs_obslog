import moment from "moment"
import { defineComponent, inject, onMounted, PropType, reactive, ref } from "vue"
import { Badge } from "./Badge"
import { $control, Control } from "./index"
import style from './style.module.scss'
import { VisitComponent } from "./VisitComponent"
import { api } from "/src/api"
import { SpsSequence, VisitSet, VisitSetNote } from "/src/api-client/api"
import Accordion from "/src/components/Accordion"
import { openDialog } from "/src/components/Dialog"
import { $g } from "/src/store"


export const VisitSetComponent = defineComponent({
  props: {
    visitSet: { type: Object as PropType<VisitSet>, required: true },
  },
  setup($p) {
    const $ = reactive({
      visitsOpened: false, // true || !$p.visitSet.sps_sequence,
      debug: false,
    })
    const control = inject($control)!
    return () => {
      const { visitSet: vs } = $p
      const ss = vs.sps_sequence
      const minVisit = Math.min(...vs.visits.map(v => v.id))
      const maxVisit = Math.max(...vs.visits.map(v => v.id))
      return (
        <div class={[style.visitSet, vs.sps_sequence ? style.spsVisitSet : style.mcsVisitSet]}>
          {!ss && Math.max(...vs.visits.map(v => v.mcs_exposures.length)) === 0 && <Badge class={style.error}>No Exposure!</Badge>}
          <Badge name="Time">{() => period(vs)}</Badge>
          {ss && (<>
            <Badge name="Name">{() => ss.name}</Badge>
            <Badge name="Type" class={style[`type-${ss.sequence_type}`]}>{() => ss.sequence_type}</Badge>
            <Badge name="Status" class={style[`status-${ss.status}`]}>{() => ss.status}</Badge>
            {ss.comments && <Badge name="Comment">{() => ss.comments}</Badge>}
            <hr />
            <Badge class={style.code}>{() => (<code>{ss.cmd_str}</code>)}</Badge>
          </>)}
          <hr />
          <button onClick={() => $.visitsOpened = !$.visitsOpened}>
            {$.visitsOpened ? '🔽' : '▶️'} {$p.visitSet.visits.length} visits ({minVisit === maxVisit ? minVisit : `${minVisit} - ${maxVisit}`})
          </button>
          <hr />
          <Accordion opened={$.visitsOpened}>
            {() => (
              <div class={style.visitGroup}>
                {vs.visits.map(v => (
                  <VisitComponent key={v.id} visit={v} />
                ))}
              </div>
            )}
          </Accordion>
          {ss && (
            <>
              <hr />
              {ss.notes.map(n => (
                <Note visitSet={vs} key={n.id} note={n} />
              ))}
              <button onClick={() => addNote(ss, control)}>🖌 Add Note</button>
            </>
          )}
          <button onClick={() => $.debug = !$.debug}>
            {$.debug ? '🔽' : '▶️'} 🐞
          </button>
          <Accordion opened={$.debug}>
            {() => (
              <code style={{ boxSizing: 'border-box' }} class="json">{JSON.stringify(vs, null, 2)}</code>
            )}
          </Accordion>
        </div>
      )
    }
  }
})


const Note = defineComponent({
  props: {
    note: { type: Object as PropType<VisitSetNote>, required: true },
    visitSet: { type: Object as PropType<VisitSet>, required: true },
  },
  setup($p) {
    const { refresh } = inject($control)!

    const deleteNote = async () => {
      if (confirm(`Are you sure to delete this note?:\n${$p.note.body}`)) {
        await api.deleteVisitSetNote($p.visitSet.id, $p.note.id)
        await refresh()
      }
    }

    return () => {
      const me = $p.note.user?.id === $g.session?.current_user.id
      return (
        <div class={style.note}>
          {$p.note?.body}<span class={style.by}>by {$p.note.user?.name}</span>
          {me && (
            <button onClick={deleteNote} class="small">❌</button>
          )}
        </div>
      )
    }
  }
})


const AddNoteComponent = defineComponent({
  props: {
    ss: { type: Object as PropType<SpsSequence>, required: true },
  },
  setup($p, { emit }) {
    const $ = reactive({
      value: '',
    })
    const inputElement = ref<HTMLInputElement>()
    onMounted(() => inputElement.value?.focus())
    const submit = (e: Event) => {
      e.preventDefault()
      emit('resolve', $.value)
    }
    return () => (
      <div>
        Note for {$p.ss.name} (#{$p.ss.id})
        <hr />
        <form onSubmit={submit}>
          <input type="text" v-model={$.value} ref={inputElement} size={60} />
          {/* <textarea cols={80} rows={12} v-model={$.value} ref={inputElement} /> */}
          <div class="end-h">
            <input type="submit" value="Save" />
          </div>
        </form>
      </div>
    )
  }
})


async function addNote(ss: SpsSequence, root: Control) {
  const body = await openDialog<string | undefined>(AddNoteComponent, { props: { ss }, throwOnClose: false })
  if (body !== undefined) {
    await api.createVisitSetNote(ss.id, { body })
    root.refresh()
  }
}


function period(vs: VisitSet) {
  const start = moment(new Date(Math.min(...vs.visits.map(v => {
    const sps = v.sps_visit && Math.min(...v.sps_visit.exposures.map(e => Number(new Date(e.exp_start)))) || Infinity
    const mcs = Math.min(...v.mcs_exposures.map(e => Number(new Date(e.taken_at))))
    return Math.min(sps, mcs)
  }))))
  const end = moment(new Date(Math.max(...vs.visits.map(v => {
    const sps = v.sps_visit && Math.max(...v.sps_visit.exposures.map(e => Number(new Date(e.exp_end)))) || -Infinity
    const mcs = Math.max(...v.mcs_exposures.map(e => Number(new Date(e.taken_at)) + (e.exptime ?? 1) * 1000))
    return Math.max(sps, mcs)
  }))))
  return `${start.format('YYYY/MM/DD HH:mm:ss')} - ${end.format('HH:mm:ss')}`
}
