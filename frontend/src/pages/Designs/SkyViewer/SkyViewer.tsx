/**
 * SkyViewer - WebGLベースの天球表示コンポーネント
 */
import { useRef, useEffect, useCallback } from 'react'
import {
  Globe$,
  HipparcosCatalogLayer$,
  ConstellationLayer$,
  HipsSimpleLayer$,
  GridLayer$,
  PanLayer$,
  ZoomLayer$,
  TouchLayer$,
  type GlobeHandle,
} from '@stellar-globe/react-stellar-globe'
import { GridLayer, matrixUtils, SkyCoord, type Globe } from '@stellar-globe/stellar-globe'
import { useDesignsContext, inTimeZone } from '../DesignsContext'
import { HST_TZ_OFFSET } from '../types'
import { Clock } from './Clock'
import { DesignMarkers } from './DesignMarkers'
import styles from './SkyViewer.module.scss'

// カメラ初期パラメータ（オブジェクト参照を安定させるためコンポーネント外で定義）
const INITIAL_CAMERA_PARAMS = {
  fovy: 4, // 初期視野を広めに設定
  theta: 0,
  phi: 0,
  za: 0,
  zd: Math.PI / 2,
  zp: 0,
  roll: 0,
}

// 天頂からの傾き（グリッド表示用）
const TILT = Math.PI / 2

// 日付フォーマット
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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
  const altAzGridRef = useRef<GridLayer | null>(null)
  const isInitializedRef = useRef(false)
  const {
    jumpToSignal,
    setNow,
    hst,
    zenithSkyCoord,
    zenithZaZd,
    showFibers,
    setShowFibers,
    setDraggingClock,
  } = useDesignsContext()
  
  // 最新のzenithZaZdをRefで保持（初期化コールバック内から参照するため）
  const zenithZaZdRef = useRef(zenithZaZd)
  zenithZaZdRef.current = zenithZaZd

  // ジャンプシグナルを監視
  useEffect(() => {
    if (jumpToSignal && globeRef.current) {
      const globe = globeRef.current()
      // za, zd, zp が指定されている場合は天頂パラメータを更新
      const params: Record<string, number> = {}
      if (jumpToSignal.fovy !== undefined) params.fovy = jumpToSignal.fovy
      if (jumpToSignal.za !== undefined) params.za = jumpToSignal.za
      if (jumpToSignal.zd !== undefined) params.zd = jumpToSignal.zd
      if (jumpToSignal.zp !== undefined) params.zp = jumpToSignal.zp

      if (jumpToSignal.coord) {
        const coord = SkyCoord.fromDeg(jumpToSignal.coord.ra, jumpToSignal.coord.dec)
        globe.camera.jumpTo(
          { ...params, fovy: params.fovy ?? globe.camera.fovy },
          { coord, duration: jumpToSignal.duration ?? 1000 }
        )
      } else if (Object.keys(params).length > 0) {
        globe.camera.jumpTo(params, { duration: jumpToSignal.duration ?? 0 })
      }
    }
  }, [jumpToSignal])

  // Globe初期化時のコールバック - AltAzグリッドを追加
  const handleGlobeInit = useCallback((globe: Globe) => {
    // AltAzグリッドを追加
    // 既存プロジェクトと同様に、カメラのza, zdを参照してモデル行列を計算
    // これによりカメラの天頂パラメータが変わるとグリッドも追従する
    const altAzGrid = new GridLayer(globe, (draft) => {
      draft.modelMatrix = () => {
        const { za, zd, zp } = globe.camera
        return matrixUtils.izenith4(za, zd - TILT, zp)
      }
      draft.defaultGridColor = [0, 0.25, 1, 1]
      draft.thetaLine.gridColors = { 9: [1, 0.5, 0, 1] }
      draft.phiLine.gridColors = { 12: [1, 0, 0, 1] }
    })
    globe.addLayer(altAzGrid)
    altAzGridRef.current = altAzGrid
    
    // 初期カメラ位置を設定（zenithZaZd.zd + TILTで天頂から90度傾いた位置＝地平線付近を向く）
    // useRefを使って最新の値を取得
    const { za, zd, zp } = zenithZaZdRef.current
    globe.camera.jumpTo(
      { za, zd: zd + TILT, zp },
      { duration: 0 }
    )
    isInitializedRef.current = true
  }, [])

  // Globe解放時のコールバック
  const handleGlobeRelease = useCallback(() => {
    if (altAzGridRef.current) {
      altAzGridRef.current.release()
      altAzGridRef.current = null
    }
    isInitializedRef.current = false
  }, [])

  // 時刻変更時にカメラの天頂パラメータを更新
  // 既存プロジェクトと同様に、za, zd を更新（theta, phi は維持される）
  // これにより、カメラの仰角・方位角は固定され、星空が動く（青グリッドは固定）
  useEffect(() => {
    // 初期化前は何もしない
    if (!isInitializedRef.current || !globeRef.current) return
    
    const globe = globeRef.current()
    // カメラの天頂パラメータを更新（zd + TILTで地平線付近を基準に）
    globe.camera.jumpTo(
      { za: zenithZaZd.za, zd: zenithZaZd.zd + TILT, zp: zenithZaZd.zp },
      { duration: 0 }
    )
    globe.requestRefresh()
  }, [zenithZaZd])

  // 天頂を中心に表示
  // coordオプションで天頂の赤道座標を指定し、カメラがその方向を向く
  const centerZenith = useCallback(() => {
    if (globeRef.current) {
      const globe = globeRef.current()
      const coord = SkyCoord.fromDeg(zenithSkyCoord.ra, zenithSkyCoord.dec)
      globe.camera.jumpTo(
        { fovy: 4 }, // 初期視野と同じ広さ
        { coord, duration: 500 }
      )
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
      setDraggingClock(true)
      setNow((prev) => new Date(prev.getTime() + (12 * 3600_000 * dt) / (2 * Math.PI)))
    },
    [setNow, setDraggingClock]
  )

  // 時計のドラッグ終了
  const handleClockScrewEnd = useCallback(() => {
    setDraggingClock(false)
  }, [setDraggingClock])

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
          cameraParams={INITIAL_CAMERA_PARAMS}
          onInit={handleGlobeInit}
          onRelease={handleGlobeRelease}
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
          onScrewEnd={handleClockScrewEnd}
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
