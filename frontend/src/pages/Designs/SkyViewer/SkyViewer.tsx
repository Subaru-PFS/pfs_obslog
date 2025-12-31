/**
 * SkyViewer - WebGLベースの天球表示コンポーネント
 */
import { useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Globe$,
  HipparcosCatalogLayer$,
  ConstellationLayer$,
  HipsSimpleLayer$,
  GridLayer$,
  PanLayer$,
  ZoomLayer$,
  TouchLayer$,
  PathLayer$,
  ClickableMarkerLayer$,
  useGetGlobe,
  type GlobeHandle,
} from '@stellar-globe/react-stellar-globe'
import { angle, path, SkyCoord } from '@stellar-globe/stellar-globe'
import { useDesignsContext, inTimeZone } from '../DesignsContext'
import { HST_TZ_OFFSET, MARKER_FOV } from '../types'
import { Clock } from './Clock'
import styles from './SkyViewer.module.scss'

// 色定義
const MARKER_COLOR: [number, number, number, number] = [0.75, 0.75, 0.5, 1]
const FOCUS_COLOR: [number, number, number, number] = [1, 0, 1, 0.75]
const SELECTED_COLOR: [number, number, number, number] = [0, 1, 1, 1]

// 日付フォーマット
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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

// Designマーカーコンポーネント
function DesignMarkers() {
  const { designs, focusedDesign, selectedDesign, setFocusedDesign, setSelectedDesign, jumpTo } =
    useDesignsContext()
  const getGlobe = useGetGlobe()

  // マーカーデータを生成
  const markers = useMemo(() => {
    return designs.map((d) => {
      const coord = SkyCoord.fromDeg(d.ra, d.dec)
      return {
        position: coord.xyz as [number, number, number],
        color: MARKER_COLOR,
        type: 'circle' as const,
      }
    })
  }, [designs])

  // クリックハンドラ
  const handleClick = useCallback(
    (e: { index: number }) => {
      const design = designs[e.index]
      if (design) {
        setSelectedDesign(design)
        const globe = getGlobe()
        if (globe.camera.fovy >= angle.deg2rad(4)) {
          jumpTo({
            fovy: angle.deg2rad(0.8),
            coord: { ra: design.ra, dec: design.dec },
            duration: 1000,
          })
        }
      }
    },
    [designs, setSelectedDesign, getGlobe, jumpTo]
  )

  // ホバーハンドラ
  const handleHoverChange = useCallback(
    (e: { index: number | null }) => {
      const design = e.index !== null ? designs[e.index] : undefined
      setFocusedDesign(design)
    },
    [designs, setFocusedDesign]
  )

  // フォーカス・選択のパス
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
      paths.push(
        createCirclePath(selectedDesign.ra, selectedDesign.dec, SELECTED_COLOR, MARKER_FOV / 2)
      )
    }
    return paths
  }, [focusedDesign, selectedDesign])

  return (
    <>
      <ClickableMarkerLayer$
        markers={markers}
        markerSize={MARKER_FOV / 2}
        defaultColor={MARKER_COLOR}
        defaultType="circle"
        dimmAlpha={0.5}
        onClick={handleClick}
        onHoverChange={handleHoverChange}
      />
      <PathLayer$
        paths={focusPaths}
        blendMode="NORMAL"
        darkenNarrowLine={false}
      />
    </>
  )
}

// グリッドレイヤー（AltAzグリッド）
function AltAzGrid() {
  // AltAzグリッドは天頂を基準にした座標系で表示
  // 実装の簡略化のため、通常のグリッドを表示
  return (
    <GridLayer$
      optionsManipulate={(draft) => {
        draft.defaultGridColor = [0, 0.25, 1, 1]
        draft.thetaLine.gridColors = { 9: [1, 0.5, 0, 1] }
        draft.phiLine.gridColors = { 12: [1, 0, 0, 1] }
      }}
    />
  )
}

// 赤道座標グリッドレイヤー
function EquatorialGrid() {
  return (
    <GridLayer$
      optionsManipulate={(draft) => {
        draft.defaultGridColor = [1, 1, 1, 0.125]
        draft.phiLine.gridColors = {}
      }}
    />
  )
}

export function SkyViewer() {
  const globeRef = useRef<GlobeHandle | null>(null)
  const {
    jumpToSignal,
    setNow,
    hst,
    zenithSkyCoord,
    showFibers,
    setShowFibers,
  } = useDesignsContext()

  // ジャンプシグナルを監視
  useEffect(() => {
    if (jumpToSignal && globeRef.current) {
      const globe = globeRef.current()
      if (jumpToSignal.coord) {
        const coord = SkyCoord.fromDeg(jumpToSignal.coord.ra, jumpToSignal.coord.dec)
        globe.camera.jumpTo(
          { fovy: jumpToSignal.fovy ?? globe.camera.fovy },
          { coord, duration: jumpToSignal.duration ?? 1000 }
        )
      } else if (jumpToSignal.fovy) {
        globe.camera.jumpTo({ fovy: jumpToSignal.fovy }, { duration: jumpToSignal.duration ?? 0 })
      }
    }
  }, [jumpToSignal])

  // 天頂を中心に表示
  const centerZenith = useCallback(() => {
    if (globeRef.current) {
      const globe = globeRef.current()
      const coord = SkyCoord.fromDeg(zenithSkyCoord.ra, zenithSkyCoord.dec)
      globe.camera.jumpTo({ fovy: 2 }, { coord, duration: 500 })
    }
  }, [zenithSkyCoord])

  // 現在時刻に設定
  const setToNow = useCallback(() => {
    setNow(new Date())
    requestAnimationFrame(() => centerZenith())
  }, [setNow, centerZenith])

  // 時計のドラッグで時刻変更
  const handleClockScrew = useCallback(
    (dt: number) => {
      setNow((prev) => new Date(prev.getTime() + (12 * 3600_000 * dt) / (2 * Math.PI)))
    },
    [setNow]
  )

  // 日付変更
  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const dateStr = e.target.value
      if (dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number)
        setNow((prev) => {
          const date = new Date(inTimeZone(prev, HST_TZ_OFFSET))
          date.setFullYear(y, m - 1, d)
          return inTimeZone(date, HST_TZ_OFFSET, -1)
        })
      }
    },
    [setNow]
  )

  return (
    <div className={styles.skyViewerContainer}>
      <div className={styles.globeWrapper}>
        <Globe$
          ref={globeRef}
          retina
          cameraParams={{ fovy: 2, theta: 0, phi: 0, za: 0, zd: Math.PI / 2, zp: 0, roll: 0 }}
        >
          <PanLayer$ />
          <ZoomLayer$ />
          <TouchLayer$ />
          <HipparcosCatalogLayer$ />
          <ConstellationLayer$ />
          <HipsSimpleLayer$
            baseUrl="//alasky.cds.unistra.fr/Pan-STARRS/DR1/color-i-r-g"
            animationLod={-0.25}
          />
          <AltAzGrid />
          <EquatorialGrid />
          <DesignMarkers />
        </Globe$>
      </div>

      <div className={styles.timeSection}>
        <input
          type="date"
          className={styles.datepicker}
          value={formatDate(hst)}
          onChange={handleDateChange}
        />
        <Clock
          hour={hst.getHours()}
          minute={hst.getMinutes()}
          second={hst.getSeconds()}
          onScrew={handleClockScrew}
        />
        <button onClick={setToNow}>Set time to now</button>
        <button onClick={centerZenith}>Center Zenith</button>
        <label>
          <input
            type="checkbox"
            checked={showFibers}
            onChange={(e) => setShowFibers(e.target.checked)}
          />
          Fiber Markers
        </label>
      </div>
    </div>
  )
}
