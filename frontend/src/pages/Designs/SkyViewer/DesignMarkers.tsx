/**
 * DesignMarkers - Design位置マーカーとファイバーマーカーを表示するコンポーネント
 */
import { useCallback, useMemo } from 'react'
import {
  PathLayer$,
  ClickableMarkerLayer$,
  useGetGlobe,
} from '@stellar-globe/react-stellar-globe'
import { angle, path, SkyCoord } from '@stellar-globe/stellar-globe'
import { useDesignsContext } from '../DesignsContext'
import { MARKER_FOV, type PfsDesignEntry } from '../types'
import { targetTypeColors } from '../legend'

// 色定義
const MARKER_COLOR: [number, number, number, number] = [0.75, 0.75, 0.5, 1]
const FOCUS_COLOR: [number, number, number, number] = [1, 0, 1, 0.75]
const SELECTED_COLOR: [number, number, number, number] = [0, 1, 1, 1]
const DEFAULT_FIBER_COLOR: [number, number, number, number] = [0.5, 0.5, 0.5, 1]

// マーカーサイズ（ピクセル単位）
const MARKER_SIZE_PX = 24

// ファイバーマーカーのホバー時以外の透明度（0.8 = 80%）
const FIBER_MARKER_DIMM_ALPHA = 0.8

// Design circleのズームでフェードアウトする際の最小アルファ値
const DESIGN_MARKER_MIN_ALPHA = 0.05

/**
 * Design circleのズームによるアルファ計算関数
 * - デザインの視野が画面いっぱい（fovy ≈ MARKER_FOV）→ alpha = 0.05
 * - デザインが視野の1/3ほど（fovy ≈ 3 * MARKER_FOV）→ alpha = 1
 * 線形補間を使用
 */
function calcDesignMarkerAlpha(fovy: number): number {
  const fovyMin = MARKER_FOV // alpha = 0.05
  const fovyMax = 3 * MARKER_FOV // alpha = 1
  
  if (fovy >= fovyMax) return 1
  if (fovy <= fovyMin) return DESIGN_MARKER_MIN_ALPHA
  
  // 線形補間: t=0 at fovyMin, t=1 at fovyMax
  const t = (fovy - fovyMin) / (fovyMax - fovyMin)
  return DESIGN_MARKER_MIN_ALPHA + t * (1 - DESIGN_MARKER_MIN_ALPHA)
}

// CSSカラー名からRGBA配列への変換マップ
const COLOR_TO_RGBA: { [key: string]: [number, number, number, number] } = {
  lightsteelblue: [176 / 255, 196 / 255, 222 / 255, 1],
  yellow: [1, 1, 0, 1],
  magenta: [1, 0, 1, 1],
  gray: [0.5, 0.5, 0.5, 1],
  red: [1, 0, 0, 1],
  olive: [128 / 255, 128 / 255, 0, 1],
  blue: [0, 0, 1, 1],
  orange: [1, 165 / 255, 0, 1],
  purple: [128 / 255, 0, 128 / 255, 1],
}

/**
 * CSSカラー名をRGBA配列に変換
 */
function colorToRgba(color: string): [number, number, number, number] {
  return COLOR_TO_RGBA[color] ?? DEFAULT_FIBER_COLOR
}

// 円形パスを生成
function createCirclePath(
  ra: number,
  dec: number,
  color: [number, number, number, number],
  radius: number
): path.Path {
  const center = SkyCoord.fromDeg(ra, dec)
  const n = 72
  const points: path.Point[] = []

  // 中心からの接線方向を計算
  const xyz = center.xyz
  const e1 = [0, 0, 0]
  const e2 = [0, 0, 0]

  // e1 = normalize(xyz × [0,0,1])
  e1[0] = -xyz[1]
  e1[1] = xyz[0]
  e1[2] = 0
  const len1 = Math.sqrt(e1[0] ** 2 + e1[1] ** 2)
  if (len1 > 0) {
    e1[0] /= len1
    e1[1] /= len1
  }

  // e2 = xyz × e1
  e2[0] = xyz[1] * e1[2] - xyz[2] * e1[1]
  e2[1] = xyz[2] * e1[0] - xyz[0] * e1[2]
  e2[2] = xyz[0] * e1[1] - xyz[1] * e1[0]

  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n
    const cosT = Math.cos(t)
    const sinT = Math.sin(t)

    const position: [number, number, number] = [
      xyz[0] + radius * (cosT * e1[0] + sinT * e2[0]),
      xyz[1] + radius * (cosT * e1[1] + sinT * e2[1]),
      xyz[2] + radius * (cosT * e1[2] + sinT * e2[2]),
    ]

    // 正規化
    const len = Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2)
    position[0] /= len
    position[1] /= len
    position[2] /= len

    points.push({
      color,
      position,
      size: 0,
    })
  }

  return {
    points,
    close: true,
    joint: 'MITER',
  }
}

// ポジションからダミーのPfsDesignEntryを作成するヘルパー
function createDummyEntry(position: { id: string; ra: number; dec: number }): PfsDesignEntry {
  return {
    id: position.id,
    frameid: `pfsDesign-0x${position.id}.fits`,
    name: '',
    date_modified: '',
    ra: position.ra,
    dec: position.dec,
    arms: '',
    num_design_rows: 0,
    num_photometry_rows: 0,
    num_guidestar_rows: 0,
    design_rows: {
      science: 0,
      sky: 0,
      fluxstd: 0,
      unassigned: 0,
      engineering: 0,
      sunss_imaging: 0,
      sunss_diffuse: 0,
    },
  }
}

export function DesignMarkers() {
  const {
    allPositions,
    focusedDesign,
    selectedDesign,
    setFocusedDesign,
    setSelectedDesign,
    jumpTo,
    showFibers,
    designDetail,
    setFocusedFiber,
  } = useDesignsContext()
  const getGlobe = useGetGlobe()

  // allPositionsからエントリのマップを作成（オブジェクトの参照を安定させる）
  const positionEntryMap = useMemo(() => {
    const map = new Map<string, PfsDesignEntry>()
    for (const position of allPositions) {
      map.set(position.id, createDummyEntry(position))
    }
    return map
  }, [allPositions])

  // 全マーカーのパス（円）を生成 - 選択状態に関わらず同じスタイル
  const markerPaths = useMemo(() => {
    return allPositions.map((d) => {
      return createCirclePath(d.ra, d.dec, MARKER_COLOR, MARKER_FOV / 2)
    })
  }, [allPositions])

  // マーカーデータを生成（クリック/ホバー検出用、透明）
  const markers = useMemo(() => {
    return allPositions.map((d) => {
      const coord = SkyCoord.fromDeg(d.ra, d.dec)
      return {
        position: coord.xyz as [number, number, number],
        color: [0, 0, 0, 0] as [number, number, number, number], // 透明
        type: 'circle' as const,
      }
    })
  }, [allPositions])

  // クリックハンドラ
  const handleClick = useCallback(
    (e: { index: number }) => {
      const position = allPositions[e.index]
      if (position) {
        const entry = positionEntryMap.get(position.id)
        if (entry) {
          setSelectedDesign(entry)
        }
        const globe = getGlobe()
        if (globe.camera.fovy >= angle.deg2rad(4)) {
          jumpTo({
            fovy: angle.deg2rad(0.8),
            coord: { ra: position.ra, dec: position.dec },
            duration: 1000,
          })
        }
      }
    },
    [allPositions, positionEntryMap, setSelectedDesign, getGlobe, jumpTo]
  )

  // ホバーハンドラ - キャッシュされたエントリを使用して不要な再レンダリングを防ぐ
  const handleHoverChange = useCallback(
    (e: { index: number | null }) => {
      if (e.index !== null) {
        const position = allPositions[e.index]
        if (position) {
          const entry = positionEntryMap.get(position.id)
          if (entry) {
            setFocusedDesign(entry)
          }
        }
      } else {
        setFocusedDesign(undefined)
      }
    },
    [allPositions, positionEntryMap, setFocusedDesign]
  )

  // フォーカス・選択のパス（ハイライト表示のみ）
  const focusPaths = useMemo(() => {
    const paths: path.Path[] = []
    if (focusedDesign) {
      paths.push(
        createCirclePath(
          focusedDesign.ra,
          focusedDesign.dec,
          FOCUS_COLOR,
          (1.05 * MARKER_FOV) / 2
        )
      )
    }
    if (selectedDesign) {
      // 選択されたDesignにハイライト色を重ねる
      paths.push(
        createCirclePath(selectedDesign.ra, selectedDesign.dec, SELECTED_COLOR, MARKER_FOV / 2)
      )
    }
    return paths
  }, [focusedDesign, selectedDesign])

  // ファイバーマーカー - showFibersが有効でdesignDetailがある場合のみ表示
  const fiberMarkers = useMemo(() => {
    if (!showFibers || !designDetail) {
      return []
    }

    const { ra, dec, targetType, fiberId } = designDetail.design_data
    const markers: {
      position: [number, number, number]
      color: [number, number, number, number]
      fiberId: number
    }[] = []

    for (let i = 0; i < ra.length; i++) {
      const coord = SkyCoord.fromDeg(ra[i], dec[i])
      const colorEntry = targetTypeColors[targetType[i]]
      const color = colorEntry ? colorToRgba(colorEntry.color) : DEFAULT_FIBER_COLOR
      markers.push({
        position: coord.xyz as [number, number, number],
        color,
        fiberId: fiberId[i],
      })
    }

    // Guide Stars（赤色で表示）
    const guideRa = designDetail.guidestar_data.ra
    const guideDec = designDetail.guidestar_data.dec
    for (let i = 0; i < guideRa.length; i++) {
      const coord = SkyCoord.fromDeg(guideRa[i], guideDec[i])
      markers.push({
        position: coord.xyz as [number, number, number],
        color: [1, 0, 0, 1],
        fiberId: -1, // ガイドスターにはfiberIdがない
      })
    }

    return markers
  }, [showFibers, designDetail])

  // ファイバーマーカーのホバーハンドラ
  const handleFiberHoverChange = useCallback(
    (e: { index: number | null }) => {
      if (e.index !== null && designDetail) {
        const { fiberId } = designDetail.design_data
        // ガイドスターはfiberIdを持たないので、design_data範囲内のみ対象
        if (e.index < fiberId.length) {
          setFocusedFiber({
            fiberId: fiberId[e.index],
            source: 'skyViewer',
          })
        } else {
          // ガイドスターの場合はクリア
          setFocusedFiber(undefined)
        }
      } else {
        setFocusedFiber(undefined)
      }
    },
    [designDetail, setFocusedFiber]
  )

  return (
    <>
      {/* 全デザインマーカー（円） */}
      <PathLayer$
        paths={markerPaths}
        blendMode="NORMAL"
        darkenNarrowLine={false}
        dimOnZoom={calcDesignMarkerAlpha}
      />
      {/* クリック/ホバー検出用レイヤー（透明） */}
      <ClickableMarkerLayer$
        markers={markers}
        markerSize={MARKER_SIZE_PX}
        defaultColor={[0, 0, 0, 0]}
        defaultType="circle"
        dimmAlpha={0}
        onClick={handleClick}
        onHoverChange={handleHoverChange}
      />
      {/* ファイバーマーカー（ポイント）- ホバー検出対応 */}
      {fiberMarkers.length > 0 && (
        <ClickableMarkerLayer$
          markers={fiberMarkers}
          defaultColor={DEFAULT_FIBER_COLOR}
          defaultType="circle"
          dimmAlpha={FIBER_MARKER_DIMM_ALPHA}
          onHoverChange={handleFiberHoverChange}
        />
      )}
      {/* フォーカス/選択マーカー */}
      <PathLayer$
        paths={focusPaths}
        blendMode="NORMAL"
        darkenNarrowLine={false}
      />
    </>
  )
}
