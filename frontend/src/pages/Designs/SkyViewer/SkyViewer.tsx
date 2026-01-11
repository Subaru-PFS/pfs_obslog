/**
 * SkyViewer - WebGLベースの天球表示コンポーネント
 */
import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import {
  Globe$,
  HipparcosCatalogLayer$,
  ConstellationLayer$,
  HipsSimpleLayer$,
  GridLayer$,
  PanLayer$,
  ZoomLayer$,
  TouchLayer$,
  GlobeEventLayer$,
  MarkerLayer$,
  type GlobeHandle,
} from '@stellar-globe/react-stellar-globe'
import { angle, easing, GridLayer, matrixUtils, SkyCoord, type Globe } from '@stellar-globe/stellar-globe'
import { useDesignsContext, inTimeZone } from '../DesignsContext'
import { HST_TZ_OFFSET } from '../types'
import { Clock } from './Clock'
import { DesignMarkers } from './DesignMarkers'
import { HscPdr3Section } from './HscPdr3Layer'
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

// 赤道座標グリッドのオプション設定（コンポーネント外で定義して参照を安定させる）
const equatorialGridOptions = (draft: Parameters<NonNullable<Parameters<typeof GridLayer$>[0]['optionsManipulate']>>[0]) => {
  draft.defaultGridColor = [1, 1, 1, 0.125]
  draft.phiLine.gridColors = {}
}

// 赤道座標グリッドレイヤー
function EquatorialGrid() {
  return (
    <GridLayer$
      optionsManipulate={equatorialGridOptions}
    />
  )
}

export function SkyViewer() {
  const globeRef = useRef<GlobeHandle | null>(null)
  const altAzGridRef = useRef<GridLayer | null>(null)
  // Globe初期化完了フラグ
  const [isGlobeReady, setIsGlobeReady] = useState(false)

  const {
    registerJumpTo,
    setNow,
    hst,
    zenithSkyCoord,
    zenithZaZd,
    showFibers,
    setShowFibers,
    setDraggingClock,
    setCameraCenter,
    cameraCenter,
    sortBy,
  } = useDesignsContext()

  // sortBy === 'distance' の場合にcameraCenterを天球上に表示するマーカー
  const cameraCenterMarkers = useMemo(() => {
    if (sortBy !== 'distance' || !cameraCenter) {
      return []
    }
    const coord = SkyCoord.fromDeg(cameraCenter.ra, cameraCenter.dec)
    return [{
      position: coord.xyz as [number, number, number],
      color: [1, 1, 0, 1] as [number, number, number, number], // Yellow
      type: 'cross' as const,
    }]
  }, [sortBy, cameraCenter])
  
  // 最新のzenithZaZdをRefで保持（初期化コールバック内から参照するため）
  const zenithZaZdRef = useRef(zenithZaZd)
  useEffect(() => {
    zenithZaZdRef.current = zenithZaZd
  }, [zenithZaZd])

  // Globe初期化時のコールバック - AltAzグリッドを追加し、jumpTo関数を登録
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
    const { za, zd, zp } = zenithZaZdRef.current
    globe.camera.jumpTo(
      { za, zd: zd + TILT, zp },
      { duration: 0 }
    )

    // jumpTo関数をContextに登録（これ以降、他のコンポーネントからカメラを操作可能）
    registerJumpTo((options) => {
      const params: Record<string, number> = {}
      if (options.fovy !== undefined) params.fovy = options.fovy
      if (options.za !== undefined) params.za = options.za
      if (options.zd !== undefined) params.zd = options.zd
      if (options.zp !== undefined) params.zp = options.zp

      if (options.coord) {
        const coord = SkyCoord.fromDeg(options.coord.ra, options.coord.dec)
        globe.camera.jumpTo(
          { ...params, fovy: params.fovy ?? globe.camera.fovy },
          { coord, duration: options.duration, easingFunction: easing.slowStartStop4 }
        )
      } else if (Object.keys(params).length > 0) {
        globe.camera.jumpTo(params, { duration: options.duration ?? 0 })
      }
    })

    // Globe初期化完了をマーク
    setIsGlobeReady(true)
  }, [registerJumpTo])

  // Globe解放時のコールバック
  const handleGlobeRelease = useCallback(() => {
    if (altAzGridRef.current) {
      altAzGridRef.current.release()
      altAzGridRef.current = null
    }
    // jumpTo関数をno-opに戻す
    registerJumpTo(() => {})
    setIsGlobeReady(false)
  }, [registerJumpTo])

  // 時刻変更時にカメラの天頂パラメータを更新
  // 既存プロジェクトと同様に、za, zd を更新（theta, phi は維持される）
  // これにより、カメラの仰角・方位角は固定され、星空が動く（青グリッドは固定）
  useEffect(() => {
    // 初期化前は何もしない
    if (!isGlobeReady || !globeRef.current) return
    
    const globe = globeRef.current()
    // カメラの天頂パラメータを更新（zd + TILTで地平線付近を基準に）
    // duration を 300ms に設定して滑らかに動かす
    globe.camera.jumpTo(
      { za: zenithZaZd.za, zd: zenithZaZd.zd + TILT, zp: zenithZaZd.zp },
      { duration: 300 }
    )
  }, [zenithZaZd, isGlobeReady])

  // カメラ移動終了時のハンドラ - カメラ中心座標を更新（distanceソート用）
  const handleCameraMoveEnd = useCallback(() => {
    if (!globeRef.current) return
    const globe = globeRef.current()
    const { theta, phi } = globe.camera
    // カメラの向き（theta, phi）を赤道座標に変換
    // theta: 赤経（ラジアン）, phi: 赤緯+π/2（ラジアン）
    const ra = angle.rad2deg(theta)
    const dec = angle.rad2deg(phi - Math.PI / 2)
    setCameraCenter({ ra, dec })
  }, [setCameraCenter])

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
    // カメラの移動は行わない（時刻変更のみ）
  }, [setNow])

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
    <HscPdr3Section.Provider>
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
            <GlobeEventLayer$ onCameraMoveEnd={handleCameraMoveEnd} />
            <HipparcosCatalogLayer$ />
            <ConstellationLayer$ />
            <HipsSimpleLayer$
              baseUrl="//alasky.cds.unistra.fr/Pan-STARRS/DR1/color-i-r-g"
              animationLod={-0.25}
            />
            <HscPdr3Section.Layer />
            <EquatorialGrid />
            <DesignMarkers />
            {/* Debug: カメラ中心マーカー（distanceソート時のみ表示） */}
            {cameraCenterMarkers.length > 0 && (
              <MarkerLayer$
                markers={cameraCenterMarkers}
                defaultColor={[1, 1, 0, 1]}
                defaultType="cross"
                markerSize={48}
              />
            )}
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
          <HscPdr3Section.Control />
        </div>
      </div>
    </HscPdr3Section.Provider>
  )
}
