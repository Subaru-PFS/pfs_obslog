import { useState, useEffect } from 'react'
import {
  useGetVisitApiVisitsVisitIdGetQuery,
  type VisitDetail as VisitDetailType,
} from '../../../store/api/generatedApi'
import { useHomeContext } from '../context'
import { Tabs, TabPanel, type TabItem } from '../../../components/Tabs'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { SpsInspector } from './SpsInspector'
import { McsInspector } from './McsInspector'
import { AgcInspector } from './AgcInspector'
import { IicSequenceInfo } from './IicSequenceInfo'
import { SequenceGroupInfo } from './SequenceGroupInfo'
import styles from './VisitDetail.module.scss'

/**
 * Exposure color definitions matching VisitList
 * Based on old-project colors.ts int2color() using HSV color wheel
 * bit pattern: (SPS > 0) << 2 | (MCS > 0) << 1 | (AGC > 0) << 0
 */
const exposureColors = {
  // No exposures (000): gray
  none: { backgroundColor: 'rgba(119, 119, 119, 0.3)', color: '#777' },
  // AGC only (001): cyan/teal
  agc: { backgroundColor: '#aaffdd', color: '#006644' },
  // MCS only (010): yellow-green
  mcs: { backgroundColor: '#ffffaa', color: '#666600' },
  // MCS + AGC (011): chartreuse
  mcsAgc: { backgroundColor: '#ddffaa', color: '#446600' },
  // SPS only (100): red
  sps: { backgroundColor: '#ffaaaa', color: '#660000' },
  // SPS + AGC (101): orange
  spsAgc: { backgroundColor: '#ffddaa', color: '#664400' },
  // SPS + MCS (110): blue-cyan
  spsMcs: { backgroundColor: '#aaddff', color: '#003366' },
  // All three (111): magenta-ish
  mixed: { backgroundColor: '#ffaadd', color: '#660044' },
} as const

/**
 * 露出数のスタイルを取得
 */
function getExposureCountStyle(sps: number, mcs: number, agc: number): React.CSSProperties {
  const bits = (sps > 0 ? 4 : 0) | (mcs > 0 ? 2 : 0) | (agc > 0 ? 1 : 0)
  const colorMap: { [key: number]: typeof exposureColors[keyof typeof exposureColors] } = {
    0: exposureColors.none,
    1: exposureColors.agc,
    2: exposureColors.mcs,
    3: exposureColors.mcsAgc,
    4: exposureColors.sps,
    5: exposureColors.spsAgc,
    6: exposureColors.spsMcs,
    7: exposureColors.mixed,
  }
  const { backgroundColor, color } = colorMap[bits] || exposureColors.none
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
      {visit.notes && visit.notes.length > 0 && (
        <div className={styles.summaryRow}>
          <div className={styles.summaryLabel}>Notes</div>
          <div className={styles.summaryValue}>
            {visit.notes.map((note) => (
              <div key={note.id} className={styles.note}>
                <span className={styles.noteUser}>{note.user.account_name}:</span>
                <span className={styles.noteBody}>{note.body}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface VisitInspectorProps {
  visit: VisitDetailType
}

/** 固定タブのラベル（常に同じ順序で表示） */
const TAB_LABELS = ['SpS', 'MCS', 'AGC', 'IIC Sequence', 'Sequence Group'] as const

function VisitInspector({ visit }: VisitInspectorProps) {
  const [activeTabIndex, setActiveTabIndex] = useState(0)

  // 各タブが利用可能かどうかを判定
  const hasSps = (visit.sps?.exposures?.length ?? 0) > 0
  const hasMcs = (visit.mcs?.exposures?.length ?? 0) > 0
  const hasAgc = (visit.agc?.exposures?.length ?? 0) > 0
  const hasIicSequence = !!visit.iic_sequence
  const hasSequenceGroup = !!visit.iic_sequence?.group

  const tabAvailability = [hasSps, hasMcs, hasAgc, hasIicSequence, hasSequenceGroup]

  // 選択されたタブが利用不可の場合、最初の利用可能なタブに切り替え
  useEffect(() => {
    if (!tabAvailability[activeTabIndex]) {
      const firstAvailable = tabAvailability.findIndex((available) => available)
      if (firstAvailable !== -1 && firstAvailable !== activeTabIndex) {
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
    </Tabs>
  )
}

export function VisitDetail() {
  const { selectedVisitId } = useHomeContext()

  const {
    data: visit,
    isLoading,
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
    <div className={styles.visitDetail}>
      <Summary visit={visit} />
      <div className={styles.inspector}>
        <VisitInspector visit={visit} />
      </div>
    </div>
  )
}
