import type { IicSequenceDetail } from '../../../store/api/generatedApi'
import {
  useCreateVisitSetNoteApiVisitSetsVisitSetIdNotesPostMutation,
  useUpdateVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdPutMutation,
  useDeleteVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdDeleteMutation,
} from '../../../store/api/enhancedApi'
import { NoteList } from '../../../components/NoteList'
import styles from './Inspector.module.scss'

interface IicSequenceInfoProps {
  sequence: IicSequenceDetail
}

/**
 * シーケンスタイプのスタイルを取得
 */
function getSequenceTypeStyle(sequenceType: string | null | undefined): React.CSSProperties {
  if (!sequenceType) return {}

  switch (sequenceType) {
    case 'scienceObject':
    case 'scienceTrace':
      return { backgroundColor: '#e3f2fd', color: '#1565c0' }
    case 'scienceArc':
    case 'ditheredArcs':
      return { backgroundColor: '#fff3e0', color: '#ef6c00' }
    case 'flat':
      return { backgroundColor: '#e8f5e9', color: '#2e7d32' }
    default:
      return { backgroundColor: '#f5f5f5', color: '#616161' }
  }
}

/**
 * ステータスのスタイルを取得
 */
function getStatusStyle(cmdOutput: string | null | undefined): React.CSSProperties {
  if (!cmdOutput) return {}

  switch (cmdOutput.toLowerCase()) {
    case 'finished':
      return { backgroundColor: '#e8f5e9', color: '#2e7d32' }
    case 'running':
      return { backgroundColor: '#e3f2fd', color: '#1565c0' }
    case 'failed':
    case 'error':
      return { backgroundColor: '#ffebee', color: '#c62828' }
    default:
      return { backgroundColor: '#f5f5f5', color: '#616161' }
  }
}

export function IicSequenceInfo({ sequence }: IicSequenceInfoProps) {
  const [createNote] = useCreateVisitSetNoteApiVisitSetsVisitSetIdNotesPostMutation()
  const [updateNote] = useUpdateVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdPutMutation()
  const [deleteNote] = useDeleteVisitSetNoteApiVisitSetsVisitSetIdNotesNoteIdDeleteMutation()

  const handleCreateNote = async (body: string) => {
    await createNote({
      visitSetId: sequence.iic_sequence_id,
      noteCreateRequest: { body },
    }).unwrap()
  }

  const handleUpdateNote = async (noteId: number, body: string) => {
    await updateNote({
      visitSetId: sequence.iic_sequence_id,
      noteId,
      noteUpdateRequest: { body },
    }).unwrap()
  }

  const handleDeleteNote = async (noteId: number) => {
    await deleteNote({
      visitSetId: sequence.iic_sequence_id,
      noteId,
    }).unwrap()
  }

  return (
    <div className={styles.inspector}>
      <div className={styles.infoGrid}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Sequence ID:</span>
          <span className={styles.infoValue}>{sequence.iic_sequence_id}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Name:</span>
          <span className={styles.infoValue}>{sequence.name || '-'}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Type:</span>
          <span className={styles.infoValue}>
            <span
              className={styles.badge}
              style={getSequenceTypeStyle(sequence.sequence_type)}
            >
              {sequence.sequence_type || '-'}
            </span>
          </span>
        </div>
        {sequence.status && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Status:</span>
            <span className={styles.infoValue}>
              <span
                className={styles.badge}
                style={getStatusStyle(sequence.status.cmd_output)}
              >
                {sequence.status.cmd_output || '-'}
              </span>
            </span>
          </div>
        )}
      </div>

      {sequence.cmd_str && (
        <div className={styles.commandSection}>
          <div className={styles.commandLabel}>Command:</div>
          <code className={styles.commandCode}>{sequence.cmd_str}</code>
        </div>
      )}

      {sequence.comments && (
        <div className={styles.commentsSection}>
          <div className={styles.commentsLabel}>Comments:</div>
          <div className={styles.commentsText}>{sequence.comments}</div>
        </div>
      )}

      <div className={styles.notesSection}>
        <NoteList
          notes={sequence.notes ?? []}
          createNote={handleCreateNote}
          updateNote={handleUpdateNote}
          deleteNote={handleDeleteNote}
        />
      </div>
    </div>
  )
}
