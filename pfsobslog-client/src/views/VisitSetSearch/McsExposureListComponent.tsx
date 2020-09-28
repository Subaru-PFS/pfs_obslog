import moment from 'moment'
import { defineComponent, inject, onMounted, PropType, reactive, ref } from "vue"
import { $control } from '.'
import style from './style.module.scss'
import { api } from '/src/api'
import { McsExposure, McsExposureNote } from "/src/api-client/api"
import { openDialog } from '/src/components/Dialog'
import { $g } from '/src/store'
import { vModel } from '/src/utils/vModel'

export const McsExposureListComponent = defineComponent({
  props: {
    es: { type: Array as PropType<McsExposure[]>, required: true },
  },
  setup($p) {
    const $ = reactive({
      columns: {
        frame_id: true,
        exptime: true,
        altitude: true,
        azimuth: true,
        insrot: true,
        adc_pa: true,
        dome_temperature: true,
        dome_pressure: true,
        dome_humidity: true,
        outside_temperature: true,
        outside_pressure: true,
        outside_humidity: true,
        mcs_cover_temperature: true,
        mcs_m1_temperature: true,
        taken_at: true,
      } as { [key: string]: boolean },
    })
    const { refresh } = inject($control)!
    return () => (
      <div class={style.mcsExposureList}>
        <div class={style.columns}>
          {mcs_exposure_keys.map(k => (
            <label>
              <input type="checkbox" checked={$.columns[k]} onChange={(e: any) => $.columns[k] = e.target.checked} />{k}
            </label>
          ))}
        </div>
        <table>
          <thead>
            {mcs_exposure_keys.map(k => (
              $.columns[k] && <th>{k.replace(/_/g, ' ')}</th>
            ))}
            <th />
          </thead>
          <tbody>
            {$p.es.map(e => (
              <tr>
                {mcs_exposure_keys.map(k => (
                  $.columns[k] && // @ts-ignore
                  <td>{format(e[k], k)}</td>
                ))}
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div>
                    {e.notes.map(n => (
                      <div key={n.id}>
                        <McsExposureNote note={n} />
                      </div>
                    ))}
                  </div>
                  <div class="end-h">
                    <button onClick={() => alert('Look exposure:\n Not implemented yet.')}>👀</button>
                    <button title="🖌 Add Note" onClick={() => addMcsExposureNote(e, refresh)}>🖌</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
})
const AddMcsExposureNoteComponent = defineComponent({
  props: {
    e: { type: Object as PropType<McsExposure>, required: true },
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
        Note for #{$p.e.frame_id}
        <hr />
        <form onSubmit={submit}>
          <input type="text" {...vModel($.value, _ => $.value = _)} ref={inputElement} size={60} />
          <div class="end-h">
            <input type="submit" value="Save" />
          </div>
        </form>
      </div>
    )
  }
})


async function addMcsExposureNote(e: McsExposure, refresh: () => void) {
  const body = await openDialog<string | undefined>(AddMcsExposureNoteComponent, { props: { e }, throwOnClose: false })
  if (body !== undefined) {
    await api.createMcsExposureNote(e.frame_id, { body })
  }
}
const mcs_exposure_keys = [
  'frame_id',
  'exptime',
  'altitude',
  'azimuth',
  'insrot',
  'adc_pa',
  'dome_temperature',
  'dome_pressure',
  'dome_humidity',
  'outside_temperature',
  'outside_pressure',
  'outside_humidity',
  'mcs_cover_temperature',
  'mcs_m1_temperature',
  'taken_at',
]
function format(v: any, k: keyof typeof mcs_exposure_keys) {
  switch (k) {
    case 'taken_at': {
      return moment(v).format('HH:mm:ss')
    }
  }
  return v
}
const McsExposureNote = defineComponent({
  props: {
    note: { type: Object as PropType<McsExposureNote>, required: true }
  },
  setup($p) {
    const deleteNote = async () => {
      if (confirm(`Are you sure to delete this note?:\n${$p.note.body}`)) {
        await api.deleteMcsExposureNote(-1, $p.note.id)
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
