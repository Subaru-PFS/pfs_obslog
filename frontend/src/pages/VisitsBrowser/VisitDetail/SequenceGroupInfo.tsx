import type { SequenceGroup } from '../../../store/api/generatedApi'
import styles from './Inspector.module.scss'

interface SequenceGroupInfoProps {
  group: SequenceGroup
}

/**
 * 日時をフォーマット
 */
function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SequenceGroupInfo({ group }: SequenceGroupInfoProps) {
  return (
    <div className={styles.inspector}>
      <div className={styles.infoGrid}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Group ID:</span>
          <span className={styles.infoValue}>{group.group_id}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Name:</span>
          <span className={styles.infoValue}>{group.group_name || '-'}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Created at:</span>
          <span className={styles.infoValue}>{formatDateTime(group.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
