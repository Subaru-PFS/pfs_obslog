/**
 * DesignDetail - 焦点面ビューとファイバー詳細パネル
 */
import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FocalPlane, type Cobra, getCobraByFiberId } from '../../../components/FocalPlane'
import { LoadingOverlay } from '../../../components/LoadingOverlay'
import { Tooltip } from '../../../components/Tooltip'
import { Icon } from '../../../components/Icon'
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
  const { designDetail, isLoadingDetail, selectedDesign, focusedFiber, setFocusedFiber, jumpTo } = useDesignsContext()
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

  // Cobraのクリックハンドラ（FocalPlane → SkyViewerカメラジャンプ）
  const handleCobraClick = useCallback((cobra: Cobra) => {
    if (!designDetail) return
    
    const indices = id2index.get(cobra.fiberId)
    if (!indices || indices.length === 0) return
    
    const index = indices[0]
    const ra = designDetail.design_data.ra[index]
    const dec = designDetail.design_data.dec[index]
    
    // 座標がnullまたはundefinedの場合はカメラ移動をスキップ
    if (ra == null || dec == null) return
    
    jumpTo({
      coord: { ra, dec },
      duration: 500,
    })
  }, [designDetail, id2index, jumpTo])

  // SkyViewerからのホバーでFocalPlane上のCobraを取得
  const externalFocusCobra = useMemo(() => {
    if (externalFocusFiberId === undefined) return undefined
    return getCobraByFiberId(externalFocusFiberId)
  }, [externalFocusFiberId])

  // 常にFocalPlane、select、凡例を表示（Designが選択されていなくても）
  return (
    <div className={styles.designDetailContainer}>
      <LoadingOverlay isLoading={isLoadingDetail} />
      <div className={styles.focalPlaneSection}>
        <FocalPlane
          size={250}
          colorFunc={colorFunc}
          onPointerEnter={selectedDesign ? handlePointerEnter : undefined}
          onClick={selectedDesign ? handleCobraClick : undefined}
          externalFocusCobra={externalFocusCobra}
          refreshDeps={[colorMode, designDetail, highlightFiberId]}
        />
        <select
          className={styles.colorModeSelect}
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value as ColorMode)}
        >
          <option value="targetType">Target Type</option>
          <option value="fiberStatus">Fiber Status</option>
        </select>
        <Legend colorMode={colorMode} />
      </div>

      {/* Design詳細 + Fiber詳細（Designが選択されている場合のみ） */}
      {designDetail && selectedDesign && (
        <div className={styles.detailAreaContainer}>
          <FiberDetail
            design={designDetail}
            designIdHex={selectedDesign.id}
            fiberId={focusedFiber?.fiberId ?? null}
            cobra={focusedCobra}
          />
        </div>
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
  designIdHex: string  // hex形式のdesign ID（0x無し）
  fiberId: number | null
  cobra: Cobra | undefined  // FocalPlaneからのホバーでのみ設定される
}

function FiberDetail({ design, designIdHex, fiberId, cobra }: FiberDetailProps) {
  const navigate = useNavigate()
  const id2designIndex = useMemo(
    () => makeId2IndexMap(design.design_data.fiberId),
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
    // Fiber Design グループ
    { key: 'Fiber Design', value: '', isHeader: true },
    { key: 'catId', value: String(pickDesign(design.design_data.catId)) },
    { key: 'Tract/Patch', value: `${pickDesign(design.design_data.tract)}/${pickDesign(design.design_data.patch)}` },
    { key: 'objId', value: String(pickDesign(design.design_data.objId)) },
    { key: 'α', value: String(pickDesign(design.design_data.ra)) },
    { key: 'δ', value: String(pickDesign(design.design_data.dec)) },
    { 
      key: 'Target Type', 
      value: String(pickDesign(design.design_data.targetType, (t) =>
        targetTypeColors[t as number]?.name
      ))
    },
    { 
      key: 'Fiber Status', 
      value: String(pickDesign(design.design_data.fiberStatus, (s) =>
        fiberStatusColors[s as number]?.name
      ))
    },
    { key: 'pfiNominal', value: String(pickDesign(design.design_data.pfiNominal, JSON.stringify)) },
    { key: 'epoch', value: String(pickDesign(design.design_data.epoch)) },
    { key: 'pmRa [mas/yr]', value: String(pickDesign(design.design_data.pmRa)) },
    { key: 'pmDec [mas/yr]', value: String(pickDesign(design.design_data.pmDec)) },
    { key: 'parallax [mas]', value: String(pickDesign(design.design_data.parallax)) },
    { key: 'proposalId', value: String(pickDesign(design.design_data.proposalId)) },
    { key: 'obCode', value: String(pickDesign(design.design_data.obCode)) },
  ]

  const handleShowVisits = () => {
    // pfs_design_idでフィルターしてvisitsページに遷移
    const sql = `where pfs_design_id = 0x${designIdHex}`
    navigate(`/visits?sql=${encodeURIComponent(sql)}`)
  }

  return (
    <div className={styles.detailArea}>
      <div className={styles.showVisitsButtonContainer}>
        <Tooltip content="Show visits using this design">
          <button className={styles.showVisitsButton} onClick={handleShowVisits}>
            <Icon name="visibility" size={14} />
            Show Visits
          </button>
        </Tooltip>
      </div>
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

