/**
 * DesignDetail - 焦点面ビューとファイバー詳細パネル
 */
import { useState, useMemo, useCallback } from 'react'
import { FocalPlane, type Cobra, getCobraByFiberId } from '../../../components/FocalPlane'
import { LoadingOverlay } from '../../../components/LoadingOverlay'
import { Tooltip } from '../../../components/Tooltip'
import { useDesignsContext } from '../DesignsContext'
import { targetTypeColors, fiberStatusColors } from '../legend'
import type { ColorMode, PfsDesignDetail } from '../types'
import styles from './DesignDetail.module.scss'

const BLANK_COLOR = '#555'

/**
 * FiberId -> インデックスのマップを作成
 */
function makeId2IndexMap(idList: number[]): Map<number, number[]> {
  const m = new Map<number, number[]>()
  idList.forEach((id, index) => {
    const existing = m.get(id)
    if (existing) {
      existing.push(index)
    } else {
      m.set(id, [index])
    }
  })
  return m
}

/**
 * 色関数を生成（ハイライト対応）
 */
function createColorFunc(
  colorMode: ColorMode,
  detail: PfsDesignDetail | undefined,
  id2index: Map<number, number[]>,
  highlightFiberId?: number
): (cobra: Cobra) => string {
  return (cobra: Cobra) => {
    if (!detail) return BLANK_COLOR

    const indices = id2index.get(cobra.fiberId)
    if (indices === undefined || indices.length === 0) return BLANK_COLOR

    // SkyViewerからのホバーでハイライト
    if (highlightFiberId !== undefined && cobra.fiberId === highlightFiberId) {
      return '#ffffff' // 白でハイライト
    }

    const index = indices[0]

    if (colorMode === 'targetType') {
      const typeValue = detail.design_data.targetType[index]
      return targetTypeColors[typeValue]?.color ?? '#000'
    } else {
      const statusValue = detail.design_data.fiberStatus[index]
      return fiberStatusColors[statusValue]?.color ?? '#000'
    }
  }
}

export function DesignDetail() {
  const { designDetail, isLoadingDetail, selectedDesign, focusedFiber, setFocusedFiber } = useDesignsContext()
  const [focusedCobra, setFocusedCobra] = useState<Cobra | undefined>()
  const [colorMode, setColorMode] = useState<ColorMode>('targetType')

  // ID -> インデックスマップ
  const id2index = useMemo(
    () => makeId2IndexMap(designDetail?.design_data.fiberId ?? []),
    [designDetail]
  )

  // SkyViewerからのホバー時にハイライトするfiberId
  const highlightFiberId = focusedFiber?.source === 'skyViewer' ? focusedFiber.fiberId : undefined

  // 色関数
  const colorFunc = useMemo(
    () => createColorFunc(colorMode, designDetail, id2index, highlightFiberId),
    [colorMode, designDetail, id2index, highlightFiberId]
  )

  // SkyViewerからのホバーでFocalPlaneのCobraをハイライト
  const externalFocusFiberId = focusedFiber?.source === 'skyViewer' ? focusedFiber.fiberId : undefined

  // Cobraのホバーハンドラ（FocalPlane → SkyViewer連携）
  const handlePointerEnter = useCallback((cobra: Cobra | undefined) => {
    setFocusedCobra(cobra)
    // Contextに通知（SkyViewerに連携）
    if (cobra) {
      setFocusedFiber({
        fiberId: cobra.fiberId,
        source: 'focalPlane',
      })
    } else {
      setFocusedFiber(undefined)
    }
  }, [setFocusedFiber])

  // SkyViewerからのホバーでFocalPlane上のCobraを取得
  const externalFocusCobra = useMemo(() => {
    if (externalFocusFiberId === undefined) return undefined
    return getCobraByFiberId(externalFocusFiberId)
  }, [externalFocusFiberId])

  if (!selectedDesign) {
    return (
      <div className={styles.designDetailContainer}>
        <div style={{ color: '#888', fontStyle: 'italic' }}>
          Select a design from the list to view details
        </div>
      </div>
    )
  }

  return (
    <div className={styles.designDetailContainer}>
      <LoadingOverlay isLoading={isLoadingDetail} />
      <div className={styles.focalPlaneSection}>
        <FocalPlane
          size={250}
          colorFunc={colorFunc}
          onPointerEnter={handlePointerEnter}
          externalFocusCobra={externalFocusCobra}
          refreshDeps={[colorMode, designDetail, highlightFiberId]}
        />
        <div>
          <select
            className={styles.colorModeSelect}
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as ColorMode)}
          >
            <option value="targetType">Target Type</option>
            <option value="fiberStatus">Fiber Status</option>
          </select>
        </div>
        <Legend colorMode={colorMode} />
      </div>

      {/* 3カラムレイアウト: Design詳細 + Fiber詳細 */}
      {designDetail && (
        <FiberDetail
          design={designDetail}
          fiberId={focusedFiber?.fiberId ?? null}
          cobra={focusedCobra}
        />
      )}
    </div>
  )
}

interface LegendProps {
  colorMode: ColorMode
}

function Legend({ colorMode }: LegendProps) {
  const entries = colorMode === 'targetType' ? targetTypeColors : fiberStatusColors

  return (
    <div className={styles.legendEntries}>
      {entries
        .filter((e) => e !== undefined)
        .map((entry) => (
          <Tooltip key={entry!.name} content={`${entry!.name}: ${entry!.doc}`}>
            <div
              className={styles.legendEntry}
              style={{ backgroundColor: entry!.color }}
            />
          </Tooltip>
        ))}
    </div>
  )
}

interface FiberDetailProps {
  design: PfsDesignDetail
  fiberId: number | null
  cobra: Cobra | undefined  // FocalPlaneからのホバーでのみ設定される
}

function FiberDetail({ design, fiberId, cobra }: FiberDetailProps) {
  const id2designIndex = useMemo(
    () => makeId2IndexMap(design.design_data.fiberId),
    [design]
  )
  const id2photometryIndex = useMemo(
    () => makeId2IndexMap(design.photometry_data.fiberId),
    [design]
  )

  // fiberIdがnullの場合は'-'を返す関数
  const pickDesign = <T,>(list: T[] | undefined, filter?: (item: T) => unknown): unknown => {
    if (fiberId === null) return '-'
    if (!list) return '-'
    const indices = id2designIndex.get(fiberId)
    if (indices === undefined || indices.length === 0) return '-'
    const raw = list[indices[0]]
    if (raw === undefined) return '-'
    const result = filter ? filter(raw) : raw
    return result ?? '-'  // filter結果がundefinedなら'-'
  }

  const pickPhotometry = <T,>(list: T[] | undefined, filter?: (item: T) => unknown): unknown[] => {
    if (fiberId === null) return ['-']
    if (!list) return ['-']
    const indices = id2photometryIndex.get(fiberId)
    if (indices === undefined || indices.length === 0) return ['-']
    const raws = indices.map((index) => list[index])
    return filter ? raws.map(r => filter(r) ?? '-') : raws
  }

  const pickCard = (key: string, hduIndex: number): unknown => {
    return design.fits_meta.hdul[hduIndex]?.header.cards.find(
      (card) => card.key === key
    )?.value
  }

  // key-valueペアの配列を構築（グループごとに見出しを挿入）
  const items: Array<{ key: string; value: string; isHeader?: boolean }> = [
    // Design Detail グループ
    { key: 'Design Detail', value: '', isHeader: true },
    { key: 'Name', value: String(pickCard('DSGN_NAM', 0) ?? '-') },
    { key: 'Modified', value: design.date_modified },
    { key: 'α', value: String(pickCard('RA', 0) ?? '-') },
    { key: 'δ', value: String(pickCard('DEC', 0) ?? '-') },
    { key: 'Position Angle', value: String(pickCard('POSANG', 0) ?? '-') },
    { key: 'Arms', value: String(pickCard('ARMS', 0) ?? '-') },
    // Fiber Detail グループ
    { key: 'Fiber Detail', value: '', isHeader: true },
    { key: 'Fiber Id', value: String(fiberId ?? '-') },
    { key: 'Cobra Id', value: String(cobra?.id ?? '-') },
    { key: 'Module ID', value: String(cobra?.moduleId ?? '-') },
    { key: 'Sector ID', value: String(cobra?.fieldId ?? '-') },
    // Fiber Design グループ - すべてのフィールドを動的に表示
    { key: 'Fiber Design', value: '', isHeader: true },
  ]

  // design_data のすべてのフィールドを動的に追加
  for (const key in design.design_data) {
    const data = (design.design_data as Record<string, unknown>)[key]
    if (Array.isArray(data)) {
      // 特殊な表示処理
      if (key === 'targetType') {
        const value = pickDesign(data, (t) => targetTypeColors[t as number]?.name)
        items.push({ key: 'Target Type', value: String(value) })
      } else if (key === 'fiberStatus') {
        const value = pickDesign(data, (s) => fiberStatusColors[s as number]?.name)
        items.push({ key: 'Fiber Status', value: String(value) })
      } else if (key === 'pfiNominal') {
        const value = pickDesign(data, JSON.stringify)
        items.push({ key, value: String(value) })
      } else {
        const value = pickDesign(data)
        items.push({ key, value: String(value) })
      }
    }
  }

  // Photometry グループ - すべてのフィールドを動的に表示
  items.push({ key: 'Photometry', value: '', isHeader: true })
  
  // photometry_data のフィールド名を取得
  const photometryKeys = Object.keys(design.photometry_data).filter(k => k !== 'fiberId')
  const numPhotometryRecords = design.photometry_data.fiberId?.length ?? 0
  
  // fiberIdごとのphotometryデータを表示
  for (let i = 0; i < numPhotometryRecords; i++) {
    for (const key of photometryKeys) {
      const data = (design.photometry_data as Record<string, unknown>)[key]
      if (Array.isArray(data)) {
        const values = pickPhotometry(data)
        items.push({ key: `${key}[${i}]`, value: String(values[i] ?? '-') })
      }
    }
  }

  return (
    <div className={styles.detailArea}>
      {items.map((item, index) => {
        if (item.isHeader) {
          return <h3 key={index} className={styles.groupHeader}>{item.key}</h3>
        }
        return (
          <div key={index} className={styles.keyValuePair}>
            <span className={styles.key} dangerouslySetInnerHTML={{ __html: item.key }} />
            <span className={styles.value}>{item.value}</span>
          </div>
        )
      })}
    </div>
  )
}

