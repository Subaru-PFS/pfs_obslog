/* eslint-disable react-hooks/set-state-in-effect -- Tab sync requires setState in effect */
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  useGetVisitApiVisitsVisitIdGetQuery,
  type VisitDetail as VisitDetailType,
} from '../../../store/api/generatedApi'
import {
  useCreateVisitNoteApiVisitsVisitIdNotesPostMutation,
  useUpdateVisitNoteApiVisitsVisitIdNotesNoteIdPutMutation,
  useDeleteVisitNoteApiVisitsVisitIdNotesNoteIdDeleteMutation,
} from '../../../store/api/enhancedApi'
import { useVisitsBrowserContext } from '../context'
import { VisitDetailProvider, useVisitDetailContext, type TabName } from './context'
import { Tabs, TabPanel, type TabItem } from '../../../components/Tabs'
import { Icon } from '../../../components/Icon'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { LoadingOverlay } from '../../../components/LoadingOverlay'
import { NoteList } from '../../../components/NoteList'
import { Tooltip } from '../../../components/Tooltip'
import { SpsInspector } from './SpsInspector'
import { McsInspector } from './McsInspector'
import { AgcInspector } from './AgcInspector'
import { IicSequenceInfo } from './IicSequenceInfo'
import { SequenceGroupInfo } from './SequenceGroupInfo'
import { FitsHeaderPanel } from './FitsHeaderInfo'
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
  const { scrollToVisit, setIsScrollingToVisit } = useVisitsBrowserContext()
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

  const handleShowInList = async () => {
    if (scrollToVisit) {
      setIsScrollingToVisit(true)
      try {
        await scrollToVisit(visit.id)
      } finally {
        setIsScrollingToVisit(false)
      }
    }
  }

  return (
    <div className={styles.summary}>
      <div className={styles.summaryContent}>
        <Tooltip content="Show this visit in the left list">
          <button
            className={styles.showInListButton}
            onClick={handleShowInList}
          >
            <span style={{ display: 'inline-flex', transform: 'scale(-1, 1)' }}>
              <Icon name="switch_access_shortcut" size={16} />
            </span>
          </button>
        </Tooltip>
        <table className={styles.summaryTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Description</th>
              <th>Issued at</th>
              <th>Exposures (S/M/A)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{visit.id}</td>
              <td>{visit.description || '-'}</td>
              <td>{formatDateTime(visit.issued_at)}</td>
              <td>
                <span style={getExposureCountStyle(spsCount, mcsCount, agcCount)}>
                  {spsCount}/{mcsCount}/{agcCount}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className={styles.notesSection}>
        <NoteList
          notes={visit.notes ?? []}
          createNote={handleCreateNote}
          updateNote={handleUpdateNote}
          deleteNote={handleDeleteNote}
        />
      </div>
    </div>
  )
}

interface VisitInspectorProps {
  visit: VisitDetailType
}

/** 固定タブのラベル（常に同じ順序で表示） */
const TAB_LABELS = ['SpS', 'MCS', 'AGC', 'IIC Sequence', 'Sequence Group'] as const
/** タブインデックスからタブ名へのマッピング */
const TAB_NAMES: TabName[] = ['sps', 'mcs', 'agc', 'iic_sequence', 'sequence_group']

function VisitInspector({ visit }: VisitInspectorProps) {
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const { selectFirstExposure } = useVisitDetailContext()
  const prevVisitIdRef = useRef<number | null>(null)

  // 各タブが利用可能かどうかを判定
  const hasSps = (visit.sps?.exposures?.length ?? 0) > 0
  const hasMcs = (visit.mcs?.exposures?.length ?? 0) > 0
  const hasAgc = (visit.agc?.exposures?.length ?? 0) > 0
  const hasIicSequence = !!visit.iic_sequence
  const hasSequenceGroup = !!visit.iic_sequence?.group

  const tabAvailability = useMemo(
    () => [hasSps, hasMcs, hasAgc, hasIicSequence, hasSequenceGroup],
    [hasSps, hasMcs, hasAgc, hasIicSequence, hasSequenceGroup]
  )

  // 選択されたタブが利用不可の場合、最初の利用可能なタブに切り替え
  // すべてのタブが利用不可の場合は-1（選択なし）にする
  const targetTabIndex = useMemo(() => {
    if (activeTabIndex < 0 || !tabAvailability[activeTabIndex]) {
      return tabAvailability.findIndex((available) => available)
    }
    return activeTabIndex
  }, [activeTabIndex, tabAvailability])

  useEffect(() => {
    if (targetTabIndex !== activeTabIndex) {
      setActiveTabIndex(targetTabIndex)
    }
  }, [targetTabIndex, activeTabIndex])

  // visit IDが変わった時、またはタブが変わった時に最初のExposureを選択
  useEffect(() => {
    prevVisitIdRef.current = visit.id

    if (activeTabIndex >= 0) {
      const tabName = TAB_NAMES[activeTabIndex]
      // Visit変更時またはタブ変更時に最初のExposureを自動選択
      selectFirstExposure(visit, tabName)
    }
  }, [visit.id, activeTabIndex, visit, selectFirstExposure])

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
    </Tabs>
  )
}

export function VisitDetail() {
  const { selectedVisitId } = useVisitsBrowserContext()

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
        <VisitDetailContent visit={visit} />
      </div>
    </VisitDetailProvider>
  )
}

interface VisitDetailContentProps {
  visit: VisitDetailType
}

function VisitDetailContent({ visit }: VisitDetailContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const [topHeight, setTopHeight] = useState<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const topHeightRef = useRef<number | null>(null)
  
  // topHeightRef を topHeight と同期
  useEffect(() => {
    topHeightRef.current = topHeight
  }, [topHeight])

  // リサイズ可能なスプリットパネルの実装
  useEffect(() => {
    const container = containerRef.current
    const gutter = gutterRef.current
    if (!container || !gutter) return

    let isDragging = false
    let startY = 0
    let startHeight = 0

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true
      setIsResizing(true)
      startY = e.clientY
      startHeight = topHeightRef.current ?? container.offsetHeight * 0.6
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const delta = e.clientY - startY
      const containerHeight = container.offsetHeight
      const newHeight = Math.max(100, Math.min(containerHeight - 100, startHeight + delta))
      setTopHeight(newHeight)
    }

    const handleMouseUp = () => {
      isDragging = false
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    gutter.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      gutter.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // 初期高さを設定（コンテナの60%）
  useEffect(() => {
    if (topHeight === null && containerRef.current) {
      setTopHeight(containerRef.current.offsetHeight * 0.65)
    }
  }, [topHeight])

  return (
    <div className={styles.splitContainer} ref={containerRef}>
      <div
        className={styles.topPane}
        style={topHeight ? { height: `${topHeight}px` } : { flex: '1 1 65%' }}
      >
        <Summary visit={visit} />
        <div className={styles.inspector}>
          <VisitInspector visit={visit} />
        </div>
      </div>
      <div className={`${styles.gutter} ${isResizing ? styles.gutterActive : ''}`} ref={gutterRef} />
      <div className={styles.bottomPane}>
        <FitsHeaderPanel />
      </div>
    </div>
  )
}
