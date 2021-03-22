import { createMemo, createSignal, For, Show } from 'solid-js'
import { IconButton } from '~/components/Icon'
import { useLoading } from '~/components/Loading'
import { useCurrentUser } from '~/session'
import { useClickOutside } from '~/utils/useClickOutside'
import { stopEvent } from '../../../utils/stopPropagation'
import styles from './styles.module.scss'


type NoteLike = {
  id: number
  body: string
  user: User
}

type User = {
  id: number
  account_name: string
}

type NoteListProps = {
  notes: NoteLike[]
  createNote: (body: string) => Promise<unknown>
  updateNote: (noteId: number, body: string) => Promise<unknown>
  deleteNote: (noteId: number) => Promise<unknown>
  class?: string
}


export function NoteList(props: NoteListProps) {
  const notes = createMemo(() => props.notes.slice().sort((a, b) => a.id - b.id))

  return (
    <ul class={`${styles.notes} ${props.class}`}>
      <For each={notes()}>
        {
          note => <Note
            note={note}
            updateNote={async body => await props.updateNote(note.id, body)}
            deleteNote={async () => await props.deleteNote(note.id)}
          />
        }
      </For>
      <NewNote createNote={props.createNote} />
    </ul>
  )
}


function Note(props: {
  note: NoteLike
  updateNote: (body: string) => Promise<unknown>
  deleteNote: () => Promise<unknown>
}) {
  const [opened, setOpened] = createSignal(false)
  const clickOutside = useClickOutside()
  let input: HTMLInputElement | undefined
  let root: HTMLLIElement | undefined
  const [body, setBody] = createSignal(props.note.body)
  const [isLoading, startLoading] = useLoading()

  const open = () => {
    setOpened(true)
    input?.focus()
    clickOutside(root!, reset)
  }

  const reset = () => {
    setBody(props.note.body)
    setOpened(false)
    clickOutside.clear()
  }

  const submit = async () => {
    if (props.note.body !== body()) {
      // on Safari 15, unexpected scroll will happen when submit with body unchanged.
      await startLoading(async () => await props.updateNote(body()))
    }
    reset()
  }

  const currentUser = useCurrentUser()
  const editable = createMemo(() => currentUser.id === props.note.user.id)

  return (
    <li ref={root}>
      <Show when={opened()} fallback={(
        <>
          <div class={styles.body}>{props.note.body}</div>
          <Show
            when={editable()}
            fallback={
              <div class={styles.user}>
                {props.note.user.account_name}
              </div>
            }
          >
            <IconButton icon="edit" disabled={isLoading()} onClick={open} />
            <IconButton icon='delete_forever' disabled={isLoading()} onClick={stopEvent(async () => {
              if (confirm(`Are you sure to delete this note?\n${props.note.body}`)) {
                await startLoading(props.deleteNote)
              }
            })} />
          </Show>
        </>
      )}>
        <form onSubmit={stopEvent(submit)}>
          <input
            value={body()} onChange={e => setBody(e.currentTarget.value)}
            type="text" style={{ "flex-grow": 1 }} ref={input} disabled={isLoading()} />
        </form>
        <IconButton icon="close" onClick={stopEvent(reset)} disabled={isLoading()} />
        <IconButton icon="check" onClick={stopEvent(submit)} disabled={isLoading()} />
      </Show>
    </li>
  )
}


function NewNote(props: {
  createNote: (body: string) => Promise<unknown>
}) {
  const [opened, setOpened] = createSignal(false)
  const clickOutside = useClickOutside()
  let input: HTMLInputElement | undefined
  let root: HTMLLIElement | undefined
  const [body, setBody] = createSignal('')
  const [isLoading, startLoading] = useLoading()

  const open = () => {
    setOpened(true)
    input?.focus()
    clickOutside(root!, reset)
  }

  const reset = () => {
    setBody('')
    setOpened(false)
    clickOutside.clear()
  }

  const submit = async () => {
    await startLoading(async () => await props.createNote(body()))
    reset()
  }

  return (
    <li ref={root}>
      <Show when={opened()} fallback={(
        <>
          <div />
          <IconButton icon="add_comment" onClick={open} />
        </>
      )}>
        <form
          onSubmit={stopEvent(submit)}>
          <input
            value={body()} onChange={e => setBody(e.currentTarget.value)}
            type="text" ref={input} disabled={isLoading()} />
        </form>
        <IconButton icon="close" onClick={stopEvent(reset)} disabled={isLoading()} />
        <IconButton icon="check" onClick={stopEvent(submit)} disabled={isLoading()} />
      </Show>
    </li>
  )
}
