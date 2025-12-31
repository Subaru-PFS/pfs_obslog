import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import { IconButton } from '../Icon'
import { useGetStatusApiAuthStatusGetQuery } from '../../store/api/enhancedApi'
import styles from './NoteList.module.scss'

export interface NoteLike {
  id: number
  body: string
  user: {
    id: number
    account_name: string
  }
}

interface NoteListProps {
  /** List of notes to display */
  notes: NoteLike[]
  /** Create a new note */
  createNote: (body: string) => Promise<void>
  /** Update an existing note */
  updateNote: (noteId: number, body: string) => Promise<void>
  /** Delete a note */
  deleteNote: (noteId: number) => Promise<void>
  /** Additional CSS class */
  className?: string
}

/**
 * NoteList component for displaying and managing notes
 * 
 * @example
 * <NoteList
 *   notes={visit.notes}
 *   createNote={(body) => createVisitNote({ visitId, body })}
 *   updateNote={(id, body) => updateVisitNote({ visitId, noteId: id, body })}
 *   deleteNote={(id) => deleteVisitNote({ visitId, noteId: id })}
 * />
 */
export function NoteList({
  notes,
  createNote,
  updateNote,
  deleteNote,
  className = '',
}: NoteListProps) {
  // Sort notes by ID (ascending order)
  const sortedNotes = [...notes].sort((a, b) => a.id - b.id)

  return (
    <ul className={`${styles.noteList} ${className}`}>
      {sortedNotes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          onUpdate={(body) => updateNote(note.id, body)}
          onDelete={() => deleteNote(note.id)}
        />
      ))}
      <NewNote onCreate={createNote} />
    </ul>
  )
}

interface NoteItemProps {
  note: NoteLike
  onUpdate: (body: string) => Promise<void>
  onDelete: () => Promise<void>
}

function NoteItem({ note, onUpdate, onDelete }: NoteItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [body, setBody] = useState(note.body)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRef = useRef<HTMLLIElement>(null)
  const { data: authStatus } = useGetStatusApiAuthStatusGetQuery()

  // Reset body when note changes externally
  useEffect(() => {
    setBody(note.body)
  }, [note.body])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
    }
  }, [isEditing])

  // Click outside to cancel
  useEffect(() => {
    if (!isEditing) return

    const handleClickOutside = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        handleCancel()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditing])

  const currentUserId = authStatus?.user?.id
  const isEditable = currentUserId === note.user.id

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setBody(note.body)
    setIsEditing(false)
  }

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (body === note.body) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    try {
      await onUpdate(body)
      setIsEditing(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this note?\n${note.body}`)) {
      return
    }

    setIsLoading(true)
    try {
      await onDelete()
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <li ref={itemRef} className={styles.noteItem}>
        <form className={styles.noteForm} onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className={styles.noteInput}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
        </form>
        <IconButton
          icon="close"
          onClick={handleCancel}
          disabled={isLoading}
          tooltip="Cancel"
        />
        <IconButton
          icon="check"
          onClick={() => handleSubmit()}
          disabled={isLoading}
          tooltip="Save"
        />
      </li>
    )
  }

  return (
    <li ref={itemRef} className={styles.noteItem}>
      <div className={styles.noteBody}>{note.body}</div>
      {isEditable ? (
        <>
          <IconButton
            icon="edit"
            onClick={handleEdit}
            disabled={isLoading}
            tooltip="Edit"
          />
          <IconButton
            icon="delete_forever"
            onClick={handleDelete}
            disabled={isLoading}
            tooltip="Delete"
          />
        </>
      ) : (
        <div className={styles.noteUser}>{note.user.account_name}</div>
      )}
    </li>
  )
}

interface NewNoteProps {
  onCreate: (body: string) => Promise<void>
}

function NewNote({ onCreate }: NewNoteProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [body, setBody] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRef = useRef<HTMLLIElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
    }
  }, [isEditing])

  // Click outside to cancel
  useEffect(() => {
    if (!isEditing) return

    const handleClickOutside = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        handleCancel()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditing])

  const handleOpen = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setBody('')
    setIsEditing(false)
  }

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!body.trim()) {
      handleCancel()
      return
    }

    setIsLoading(true)
    try {
      await onCreate(body)
      setBody('')
      setIsEditing(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <li ref={itemRef} className={styles.noteItem}>
        <form className={styles.noteForm} onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className={styles.noteInput}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Enter note..."
          />
        </form>
        <IconButton
          icon="close"
          onClick={handleCancel}
          disabled={isLoading}
          tooltip="Cancel"
        />
        <IconButton
          icon="check"
          onClick={() => handleSubmit()}
          disabled={isLoading}
          tooltip="Add"
        />
      </li>
    )
  }

  return (
    <li ref={itemRef} className={styles.noteItem}>
      <div className={styles.addButton}>
        <IconButton icon="add_comment" onClick={handleOpen} tooltip="Add note" />
      </div>
    </li>
  )
}
