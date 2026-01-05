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

      {/* 両方を常に表示 */}
      {designDetail && (
        <>
          <DesignSummary design={designDetail} />
          <FiberDetail
            design={designDetail}
            fiberId={focusedFiber?.fiberId ?? null}
            cobra={focusedCobra}
          />
        </>
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
  const pickDesign = <T,>(list: T[], filter?: (item: T) => unknown): unknown => {
    if (fiberId === null) return '-'
    const indices = id2designIndex.get(fiberId)
    if (indices === undefined || indices.length === 0) return '-'
    const raw = list[indices[0]]
    const result = filter ? filter(raw) : raw
    return result ?? '-'  // filter結果がundefinedなら'-'
  }

  const pickPhotometry = <T,>(list: T[], filter?: (item: T) => unknown): unknown[] => {
    if (fiberId === null) return ['-']
    const indices = id2photometryIndex.get(fiberId)
    if (indices === undefined || indices.length === 0) return ['-']
    const raws = indices.map((index) => list[index])
    return filter ? raws.map(r => filter(r) ?? '-') : raws
  }

  const Tr = ({ label, values }: { label: string; values: unknown[] }) => (
    <tr>
      <th dangerouslySetInnerHTML={{ __html: label }} />
      {values.map((v, i) => (
        <td key={i}>{String(v)}</td>
      ))}
    </tr>
  )

  return (
    <div className={styles.detailTable}>
      <details open>
        <summary>Fiber {fiberId ?? '-'}</summary>
        <table>
          <tbody>
            <Tr label="Cobra Id" values={[cobra?.id ?? '-']} />
            <Tr label="Fiber Id" values={[fiberId ?? '-']} />
            <Tr label="Module ID" values={[cobra?.moduleId ?? '-']} />
            <Tr label="Sector ID" values={[cobra?.fieldId ?? '-']} />
          </tbody>
        </table>
      </details>
      <details open>
        <summary>Fiber Design</summary>
        <table>
          <tbody>
            <Tr
              label="catId"
              values={[pickDesign(design.design_data.catId)]}
            />
            <Tr
              label="Tract/Patch"
              values={[
                `${pickDesign(design.design_data.tract)}/${pickDesign(design.design_data.patch)}`,
              ]}
            />
            <Tr
              label="objId"
              values={[pickDesign(design.design_data.objId)]}
            />
            <Tr
              label="&alpha;"
              values={[pickDesign(design.design_data.ra)]}
            />
            <Tr
              label="&delta;"
              values={[pickDesign(design.design_data.dec)]}
            />
            <Tr
              label="Target Type"
              values={[
                pickDesign(design.design_data.targetType, (t) =>
                  targetTypeColors[t as number]?.name
                ),
              ]}
            />
            <Tr
              label="Fiber Status"
              values={[
                pickDesign(design.design_data.fiberStatus, (s) =>
                  fiberStatusColors[s as number]?.name
                ),
              ]}
            />
            <Tr
              label="pfiNominal"
              values={[
                pickDesign(design.design_data.pfiNominal, JSON.stringify),
              ]}
            />
          </tbody>
        </table>
      </details>
      <details open>
        <summary>Photometry</summary>
        <table>
          <tbody>
            <Tr
              label="filterName"
              values={pickPhotometry(design.photometry_data.filterName)}
            />
            <Tr
              label="fiberFlux [nJy]"
              values={pickPhotometry(design.photometry_data.fiberFlux)}
            />
            <Tr
              label="fiberFluxErr [nJy]"
              values={pickPhotometry(design.photometry_data.fiberFluxErr)}
            />
            <Tr
              label="psfFlux [nJy]"
              values={pickPhotometry(design.photometry_data.psfFlux)}
            />
            <Tr
              label="psfFluxErr [nJy]"
              values={pickPhotometry(design.photometry_data.psfFluxErr)}
            />
            <Tr
              label="totalFlux [nJy]"
              values={pickPhotometry(design.photometry_data.totalFlux)}
            />
            <Tr
              label="totalFluxErr [nJy]"
              values={pickPhotometry(design.photometry_data.totalFluxErr)}
            />
          </tbody>
        </table>
      </details>
    </div>
  )
}

interface DesignSummaryProps {
  design: PfsDesignDetail
}

function DesignSummary({ design }: DesignSummaryProps) {
  const pickCard = (key: string, hduIndex: number): unknown => {
    return design.fits_meta.hdul[hduIndex]?.header.cards.find(
      (card) => card.key === key
    )?.value
  }

  const Tr = ({ label, value }: { label: string; value: unknown }) => (
    <tr>
      <th dangerouslySetInnerHTML={{ __html: label }} />
      <td>{String(value ?? '-')}</td>
    </tr>
  )

  return (
    <table className={styles.summaryTable}>
      <tbody>
        <Tr label="Name" value={pickCard('DSGN_NAM', 0)} />
        <Tr label="Modified" value={design.date_modified} />
        <Tr label="&alpha;" value={pickCard('RA', 0)} />
        <Tr label="&delta;" value={pickCard('DEC', 0)} />
        <Tr label="Position Angle" value={pickCard('POSANG', 0)} />
        <Tr label="Arms" value={pickCard('ARMS', 0)} />
      </tbody>
    </table>
  )
}
