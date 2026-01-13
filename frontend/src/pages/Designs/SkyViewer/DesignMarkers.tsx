/**
 * DesignMarkers - Design位置マーカーとファイバーマーカーを表示するコンポーネント
 */
import { useCallback, useMemo, useState } from 'react'
import {
  PathLayer,
  ClickableMarkerLayer,
  MarkerLayer,
  GlobeEventLayer,
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

// マーカーサイズの最小・最大制限（ピクセル単位）
const MARKER_SIZE_MIN_PX = 8
const MARKER_SIZE_MAX_PX = 64

// ファイバーマーカーのホバー時以外の透明度（0.8 = 80%）
const FIBER_MARKER_DIMM_ALPHA = 0.5

// 以下は将来的にカスタムフェードアウトを実装する場合に使用する予定
// // Design circleのズームでフェードアウトする際の最小アルファ値
// const DESIGN_MARKER_MIN_ALPHA = 0.05
// 
// /**
//  * Design circleのズームによるアルファ計算関数
//  * - デザインの視野が画面いっぱい（fovy ≈ MARKER_FOV）→ alpha = 0.05
//  * - デザインが視野の1/3ほど（fovy ≈ 3 * MARKER_FOV）→ alpha = 1
//  * 線形補間を使用
//  */
// function calcDesignMarkerAlpha(fovy: number): number {
//   const fovyMin = MARKER_FOV // alpha = 0.05
//   const fovyMax = 3 * MARKER_FOV // alpha = 1
//   
//   if (fovy >= fovyMax) return 1
//   if (fovy <= fovyMin) return DESIGN_MARKER_MIN_ALPHA
//   
//   // 線形補間: t=0 at fovyMin, t=1 at fovyMax
//   const t = (fovy - fovyMin) / (fovyMax - fovyMin)
//   return DESIGN_MARKER_MIN_ALPHA + t * (1 - DESIGN_MARKER_MIN_ALPHA)
// }


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
  teal: [0, 128 / 255, 128 / 255, 1],
  silver: [192 / 255, 192 / 255, 192 / 255, 1],
  black: [0, 0, 0, 1],
  lime: [0, 1, 0, 1],
  lightgray: [211 / 255, 211 / 255, 211 / 255, 1],
  darkred: [139 / 255, 0, 0, 1],
  gold: [1, 215 / 255, 0, 1],
  maroon: [128 / 255, 0, 0, 1],
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
    selectDesignAndJump,
    showFibers,
    designDetail,
    focusedFiber,
    setFocusedFiber,
  } = useDesignsContext()
  const getGlobe = useGetGlobe()

  // マーカーの当たり判定サイズ（ピクセル単位、fovyに応じて動的に計算）
  // hitRadius = fovy * markerSize / h を MARKER_FOV/2 に等しくするためには:
  // markerSize = (MARKER_FOV / 2) * h / fovy
  // 初期値はデフォルト値（最初のカメライベントで更新される）
  const [markerSizePx, setMarkerSizePx] = useState(24)

  // カメラ移動時にマーカーサイズを更新
  const handleCameraMove = useCallback(() => {
    try {
      const globe = getGlobe()
      const h = globe.canvas.domElement.height
      const fovy = globe.camera.fovy
      const computed = (MARKER_FOV / 2) * h / fovy
      setMarkerSizePx(Math.max(MARKER_SIZE_MIN_PX, Math.min(MARKER_SIZE_MAX_PX, computed)))
    } catch {
      // エラー時は前の値を維持
    }
  }, [getGlobe])

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
        const globe = getGlobe()
        const shouldZoom = globe.camera.fovy >= angle.deg2rad(4)
        
        // selectDesignAndJumpを使用してリスト内でのスクロールも行う
        // カメラが既にズームインしている場合はカメラ移動をスキップ
        if (shouldZoom) {
          // ズームイン＋アニメーション＋リストスクロール
          selectDesignAndJump(position.id, { animate: true })
        } else {
          // カメラはそのまま、リストスクロールのみ
          selectDesignAndJump(position.id, { skipCameraJump: true })
        }
      }
    },
    [allPositions, getGlobe, selectDesignAndJump]
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
      type: 'circle' | 'triangle'
    }[] = []

    for (let i = 0; i < ra.length; i++) {
      // NaN/null座標をスキップ（FITSデータに座標が無いファイバー）
      if (ra[i] == null || dec[i] == null) {
        continue
      }
      const coord = SkyCoord.fromDeg(ra[i], dec[i])
      const colorEntry = targetTypeColors[targetType[i]]
      const color = colorEntry ? colorToRgba(colorEntry.color) : DEFAULT_FIBER_COLOR
      markers.push({
        position: coord.xyz as [number, number, number],
        color,
        fiberId: fiberId[i],
        type: 'circle',
      })
    }

    // Guide Stars（赤色で三角形表示）
    const guideRa = designDetail.guidestar_data.ra
    const guideDec = designDetail.guidestar_data.dec
    for (let i = 0; i < guideRa.length; i++) {
      // NaN/null座標をスキップ
      if (guideRa[i] == null || guideDec[i] == null) {
        continue
      }
      const coord = SkyCoord.fromDeg(guideRa[i], guideDec[i])
      markers.push({
        position: coord.xyz as [number, number, number],
        color: [1, 0, 0, 1],
        fiberId: -1, // ガイドスターにはfiberIdがない
        type: 'triangle',
      })
    }

    return markers
  }, [showFibers, designDetail])

  // focalPlaneからフォーカスされたファイバーをハイライトするマーカー
  const highlightedFiberMarker = useMemo(() => {
    // focalPlaneからのフォーカスでなければハイライトしない
    if (!focusedFiber || focusedFiber.source !== 'focalPlane' || !designDetail) {
      return null
    }
    
    const { ra, dec, fiberId } = designDetail.design_data
    const index = fiberId.indexOf(focusedFiber.fiberId)
    if (index < 0) {
      return null
    }
    
    // NaN/null座標の場合はハイライトしない
    if (ra[index] == null || dec[index] == null) {
      return null
    }
    
    const coord = SkyCoord.fromDeg(ra[index], dec[index])
    return {
      position: coord.xyz as [number, number, number],
      // ハイライト色：シアン
      color: [0, 1, 1, 1] as [number, number, number, number],
    }
  }, [focusedFiber, designDetail])

  // ファイバーマーカーのホバーハンドラ
  const handleFiberHoverChange = useCallback(
    (e: { index: number | null }) => {
      if (e.index !== null && fiberMarkers.length > 0) {
        const marker = fiberMarkers[e.index]
        // ガイドスター（fiberId: -1）の場合はクリア
        if (marker && marker.fiberId >= 0) {
          setFocusedFiber({
            fiberId: marker.fiberId,
            source: 'skyViewer',
          })
        } else {
          setFocusedFiber(undefined)
        }
      } else {
        setFocusedFiber(undefined)
      }
    },
    [fiberMarkers, setFocusedFiber]
  )

  return (
    <>
      {/* カメラ移動イベント監視（マーカーサイズ動的計算用） */}
      <GlobeEventLayer onCameraMove={handleCameraMove} />
      {/* 全デザインマーカー（円） */}
      <PathLayer
        paths={markerPaths}
        blendMode="NORMAL"
        darkenNarrowLine={false}
        dimOnZoom={true}
      />
      {/* クリック/ホバー検出用レイヤー（透明） */}
      <ClickableMarkerLayer
        markers={markers}
        markerSize={markerSizePx}
        defaultColor={[0, 0, 0, 0]}
        defaultType="circle"
        dimmAlpha={0}
        onClick={handleClick}
        onHoverChange={handleHoverChange}
      />
      {/* ファイバーマーカー（ポイント）- ホバー検出対応 */}
      {fiberMarkers.length > 0 && (
        <ClickableMarkerLayer
          markers={fiberMarkers}
          defaultColor={DEFAULT_FIBER_COLOR}
          defaultType="circle"
          dimmAlpha={FIBER_MARKER_DIMM_ALPHA}
          onHoverChange={handleFiberHoverChange}
        />
      )}
      {/* focalPlaneからフォーカスされたファイバーのハイライト */}
      {highlightedFiberMarker && (
        <MarkerLayer
          markers={[highlightedFiberMarker]}
          defaultColor={highlightedFiberMarker.color}
          defaultType="circle"
          markerSize={48}
        />
      )}
      {/* フォーカス/選択マーカー */}
      <PathLayer
        paths={focusPaths}
        blendMode="NORMAL"
        darkenNarrowLine={false}
      />
    </>
  )
}
