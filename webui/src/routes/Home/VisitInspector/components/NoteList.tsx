import { defineComponent, PropType } from "vue"
import { int } from "~/types"
import { inspectorContext } from "../inspectorContext"
import style from '../style.module.scss'
import NewNote from "./NewNote"
import Note from "./Note"

type NoteLike = {
  id: int
  body: string
  user: User
}

type User = {
  id: int
  account_name: string
}

export default defineComponent({
  setup($p) {
    const inspector = inspectorContext.inject()

    const createNote = async (body: string) => {
      await $p.createNote(body)
      inspector.refresh()
    }

    const updateNote = async (note_id: int, body: string) => {
      if (body !== null) {
        await $p.updateNote(note_id, body)
        inspector.refresh()
      }
    }

    const deleteNote = async (note_id: int) => {
      if (confirm(`Are you sure to delete this note?`)) {
        await $p.deleteNote(note_id)
        inspector.refresh()
      }
    }

    return () =>
      <ul class={style.notes}>
        {$p.notes.slice().sort((a, b) => a.id - b.id).map(n =>
          <li key={n.id}>
            <Note
              body={n.body}
              user={n.user}
              onSubmit={body => updateNote(n.id, body)}
              onDelete={() => deleteNote(n.id)}
            />
          </li>
        )}
        <li>
          <NewNote onSubmit={createNote} />
        </li>
      </ul>
  },
  props: {
    notes: {
      type: Array as PropType<NoteLike[]>,
      required: true,
    },
    createNote: {
      type: Function as PropType<(body: string) => Promise<any>>,
      required: true,
    },
    updateNote: {
      type: Function as PropType<(note_id: int, body: string) => Promise<any>>,
      required: true,
    },
    deleteNote: {
      type: Function as PropType<(note_id: int) => Promise<any>>,
      required: true,
    },
  },
})
