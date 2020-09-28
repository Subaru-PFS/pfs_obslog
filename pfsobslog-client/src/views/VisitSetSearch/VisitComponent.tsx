import { defineComponent, inject, PropType, reactive } from "vue"
import { $control } from "."
import { Badge } from "./Badge"
import { McsExposureListComponent } from './McsExposureListComponent'
import { SpsExposureListComponent } from './SpsExposureListComponent'
import style from './style.module.scss'
import { api } from '/src/api'
import { Visit, VisitNote } from "/src/api-client/api"
import Accordion from "/src/components/Accordion"
import { go } from "/src/router"
import { $g } from "/src/store"

export const VisitComponent = defineComponent({
  props: {
    visit: { type: Object as PropType<Visit>, required: true },
  },
  setup($p) {
    const $ = reactive({
      opened: false,
    })

    const addNote = async () => {
      const body = prompt(`Note for #${$p.visit.id} ?`)
      if (body !== null) {
        await api.createVisitNote($p.visit.id, { body })
      }
    }

    return () => (
      <div class={style.visit}>
        <button onClick={() => $.opened = !$.opened}>
          {$.opened ? '🔽' : '▶️'}
          #{$p.visit.id}
          {$p.visit.description && ` (${$p.visit.description})`}
        </button>&nbsp;
        {$p.visit.mcs_exposures.length > 0 &&
          <Badge class={style['mcs-visit']}>{() => `${$p.visit.mcs_exposures.length} Mcs Exposures`}</Badge>
        }
        {$p.visit.sps_visit &&
          <>
            <Badge>{() => `${$p.visit.sps_visit?.exposures.length} SpS Exposures`}</Badge>
            <Badge class={style[`exp-type-${$p.visit.sps_visit.exp_type}`]} name="Type">{() => $p.visit.sps_visit?.exp_type}</Badge>
          </>
        }
        {$p.visit.notes.map(n => (
          <Note note={n} />
        ))}
        <button onClick={addNote}>🖌 Add Note</button>
        <button onClick={() => go(`/visits/${$p.visit.id}`, 'slideLeft')}>🔎</button>
        <hr />
        <Accordion opened={$.opened}>
          {() => (
            <div class={style.exposureGroup}>
              {$p.visit.mcs_exposures.length > 0 && <McsExposureListComponent es={$p.visit.mcs_exposures} />}
              {$p.visit.sps_visit && (<SpsExposureListComponent visit={$p.visit} />)}
            </div>
          )}
        </Accordion>
      </div>
    )
  }
})


const Note = defineComponent({
  props: {
    note: { type: Object as PropType<VisitNote>, required: true },
  },
  setup($p) {
    const deleteNote = async () => {
      if (confirm(`Are you sure to delete this note?:\n${$p.note.body}`)) {
        await api.deleteVisitNote(-1, $p.note.id)
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
