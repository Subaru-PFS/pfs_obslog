import { useState, useEffect } from 'react'
import {
  useGetVisitApiVisitsVisitIdGetQuery,
  type VisitDetail as VisitDetailType,
} from '../../../store/api/generatedApi'
import {
  useCreateVisitNoteApiVisitsVisitIdNotesPostMutation,
  useUpdateVisitNoteApiVisitsVisitIdNotesNoteIdPutMutation,
  useDeleteVisitNoteApiVisitsVisitIdNotesNoteIdDeleteMutation,
} from '../../../store/api/enhancedApi'
import { useHomeContext } from '../context'
import { Tabs, TabPanel, type TabItem } from '../../../components/Tabs'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { LoadingOverlay } from '../../../components/LoadingOverlay'
import { NoteList } from '../../../components/NoteList'
import { SpsInspector } from './SpsInspector'
import { McsInspector } from './McsInspector'
import { AgcInspector } from './AgcInspector'
import { IicSequenceInfo } from './IicSequenceInfo'
import { SequenceGroupInfo } from './SequenceGroupInfo'
import { getExposureColorStyle } from '../../../utils/exposureColors'
import styles from './VisitDetail.module.scss'

/**
 * 露出数のスタイルを取得
 */
function getExposureCountStyle(sps: number, mcs: number, agc: number): React.CSSProperties {
  const { backgroundColor, color } = getExposureColorStyle(sps, mcs, agc)
  return {
    backgroundColor,
    color,
    padding: '2px 6px',
    borderRadius: '4px',
  }
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

interface SummaryProps {
  visit: VisitDetailType
}

function Summary({ visit }: SummaryProps) {
  const spsCount = visit.sps?.exposures?.length ?? 0
  const mcsCount = visit.mcs?.exposures?.length ?? 0
  const agcCount = visit.agc?.exposures?.length ?? 0

  const [createNote] = useCreateVisitNoteApiVisitsVisitIdNotesPostMutation()
  const [updateNote] = useUpdateVisitNoteApiVisitsVisitIdNotesNoteIdPutMutation()
  const [deleteNote] = useDeleteVisitNoteApiVisitsVisitIdNotesNoteIdDeleteMutation()

  const handleCreateNote = async (body: string) => {
    await createNote({ visitId: visit.id, noteCreateRequest: { body } }).unwrap()
  }

  const handleUpdateNote = async (noteId: number, body: string) => {
    await updateNote({
      visitId: visit.id,
      noteId,
      noteUpdateRequest: { body },
    }).unwrap()
  }

  const handleDeleteNote = async (noteId: number) => {
    await deleteNote({ visitId: visit.id, noteId }).unwrap()
  }

  return (
    <div className={styles.summary}>
      <div className={styles.summaryRow}>
        <div className={styles.summaryLabel}>ID</div>
        <div className={styles.summaryValue}>{visit.id}</div>
      </div>
      <div className={styles.summaryRow}>
        <div className={styles.summaryLabel}>Description</div>
        <div className={styles.summaryValue}>{visit.description || '-'}</div>
      </div>
      <div className={styles.summaryRow}>
        <div className={styles.summaryLabel}>Issued at</div>
        <div className={styles.summaryValue}>{formatDateTime(visit.issued_at)}</div>
      </div>
      <div className={styles.summaryRow}>
        <div className={styles.summaryLabel}>Exposures (S/M/A)</div>
        <div className={styles.summaryValue}>
          <span style={getExposureCountStyle(spsCount, mcsCount, agcCount)}>
            {spsCount}/{mcsCount}/{agcCount}
          </span>
        </div>
      </div>
      <div className={styles.summaryRow}>
        <div className={styles.summaryLabel}>Notes</div>
        <div className={styles.summaryValue}>
          <NoteList
            notes={visit.notes ?? []}
            createNote={handleCreateNote}
            updateNote={handleUpdateNote}
            deleteNote={handleDeleteNote}
          />
        </div>
      </div>
    </div>
  )
}

interface VisitInspectorProps {
  visit: VisitDetailType
}

/** 固定タブのラベル（常に同じ順序で表示） */
const TAB_LABELS = ['SpS', 'MCS', 'AGC', 'IIC Sequence', 'Sequence Group', 'FITS Header'] as const

function VisitInspector({ visit }: VisitInspectorProps) {
  const [activeTabIndex, setActiveTabIndex] = useState(0)

  // 各タブが利用可能かどうかを判定
  const hasSps = (visit.sps?.exposures?.length ?? 0) > 0
  const hasMcs = (visit.mcs?.exposures?.length ?? 0) > 0
  const hasAgc = (visit.agc?.exposures?.length ?? 0) > 0
  const hasIicSequence = !!visit.iic_sequence
  const hasSequenceGroup = !!visit.iic_sequence?.group
  // FITS Header tab is always available when there are any exposures
  const hasFitsHeader = hasSps || hasMcs || hasAgc

  const tabAvailability = [hasSps, hasMcs, hasAgc, hasIicSequence, hasSequenceGroup, hasFitsHeader]

  // 選択されたタブが利用不可の場合、最初の利用可能なタブに切り替え
  // すべてのタブが利用不可の場合は-1（選択なし）にする
  useEffect(() => {
    if (activeTabIndex < 0 || !tabAvailability[activeTabIndex]) {
      const firstAvailable = tabAvailability.findIndex((available) => available)
      // firstAvailable is -1 if no tabs are available, which means no tab is selected
      if (firstAvailable !== activeTabIndex) {
        setActiveTabIndex(firstAvailable)
      }
    }
  }, [visit, activeTabIndex, tabAvailability])

  // タブ定義（disabled プロパティ付き）
  const tabs: TabItem[] = TAB_LABELS.map((label, index) => ({
    label,
    disabled: !tabAvailability[index],
  }))

  return (
    <Tabs
      activeIndex={activeTabIndex}
      onChange={setActiveTabIndex}
      tabs={tabs}
    >
      <TabPanel active={activeTabIndex === 0}>
        {hasSps && visit.sps ? <SpsInspector sps={visit.sps} /> : null}
      </TabPanel>
      <TabPanel active={activeTabIndex === 1}>
        {hasMcs && visit.mcs ? <McsInspector mcs={visit.mcs} /> : null}
      </TabPanel>
      <TabPanel active={activeTabIndex === 2}>
        {hasAgc && visit.agc ? <AgcInspector agc={visit.agc} /> : null}
      </TabPanel>
      <TabPanel active={activeTabIndex === 3}>
        {hasIicSequence && visit.iic_sequence ? (
          <IicSequenceInfo sequence={visit.iic_sequence} />
        ) : null}
      </TabPanel>
      <TabPanel active={activeTabIndex === 4}>
        {hasSequenceGroup && visit.iic_sequence?.group ? (
          <SequenceGroupInfo group={visit.iic_sequence.group} />
        ) : null}
      </TabPanel>
      <TabPanel active={activeTabIndex === 5}>
        {hasFitsHeader ? <FitsHeaderPanel /> : null}
      </TabPanel>
    </Tabs>
  )
}

export function VisitDetail() {
  const { selectedVisitId } = useHomeContext()

  const {
    data: visit,
    isLoading,
    isFetching,
    error,
  } = useGetVisitApiVisitsVisitIdGetQuery(
    { visitId: selectedVisitId! },
    { skip: selectedVisitId === null }
  )

  if (selectedVisitId === null) {
    return (
      <div className={styles.placeholder}>
        Select a visit from the list
      </div>
    )
  }

  // 初回ロード中（データがまだない）
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.error}>
        Failed to load visit details
      </div>
    )
  }

  if (!visit) {
    return (
      <div className={styles.error}>
        Visit not found
      </div>
    )
  }

  return (
    <VisitDetailProvider>
      <div className={styles.visitDetail}>
        {/* 再取得中（前のデータを表示しながら）はオーバーレイ表示 */}
        <LoadingOverlay isLoading={isFetching} />
        <Summary visit={visit} />
        <div className={styles.inspector}>
          <VisitInspector visit={visit} />
        </div>
      </div>
    </VisitDetailProvider>
  )
}
