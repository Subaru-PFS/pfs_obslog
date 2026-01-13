/**
 * HSC PDR3 Wide タイルレイヤー関連コンポーネント
 * 
 * 使用方法:
 * - HscPdr3Section.Provider で囲む
 * - Globe 内に HscPdr3Section.Layer を配置
 * - UI部分に HscPdr3Section.Control を配置
 */
import { createContext, useContext, useState, useCallback, useMemo, Suspense, useEffect, type ReactNode } from 'react'
import {
  TractTileLayer as ReactTractTileLayer,
  LogScaleRange,
} from '@stellar-globe/react-stellar-globe'
import { TractTileLayer, type V3 } from '@stellar-globe/stellar-globe'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useDismiss,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react'
import styles from './SkyViewer.module.scss'

// HSC PDR3 Wide のベースURL
const HSC_PDR3_WIDE_BASE_URL = '//hscmap.mtk.nao.ac.jp/hscMap4/data/pdr3_wide'

// HSC PDR3 のフィルター候補（commonName）
const HSC_FILTERS = ['g', 'r', 'i', 'z', 'y', 'N816', 'N921']

// フィルター定義の型
interface FilterDef {
  commonName: string
  intrinsicName: string
}

// カラーパラメータの型（TractTileLayerのcolorParams）
type ColorParams = NonNullable<Parameters<typeof ReactTractTileLayer>[0]['colorParams']>
type MixerType = ColorParams['type']

// ミキサーパラメータの型
type ScalarParams = {
  beta: number
  a: number
  bias: number
  b0: number
}

// フィルターマップのキャッシュ
const filterMapCache = new Map<
  string,
  {
    promise: Promise<FilterDef[]>
    result?: FilterDef[]
    error?: unknown
  }
>()

// フィルターマップを取得（Suspense用）
function deferredFilterMap(baseUrl: string) {
  if (!filterMapCache.has(baseUrl)) {
    const promise = (async () => {
      const res = await fetch(`${baseUrl}/filter.json`)
      const data = (await res.json()) as Array<{ fullName?: string; value?: string; shortName?: string }>
      return data
        .map((f) => {
          const intrinsicName = f.fullName ?? f.value ?? ''
          let commonName = f.shortName
          if (!commonName) {
            if (intrinsicName.startsWith('HSC-')) {
              commonName = intrinsicName.substring(4).toLowerCase()
            } else if (intrinsicName.match(/^NB(\d+)/)) {
              const m = intrinsicName.match(/^NB(\d+)/)
              commonName = m ? String(Number(m[1])) : intrinsicName
            } else {
              commonName = intrinsicName
            }
          }
          return { commonName, intrinsicName }
        })
        .filter((f) => f.commonName && !f.commonName.startsWith('.'))
    })()
    filterMapCache.set(baseUrl, { promise })
    promise
      .then((result) => {
        filterMapCache.get(baseUrl)!.result = result
      })
      .catch((error) => {
        filterMapCache.get(baseUrl)!.error = error
      })
  }
  return filterMapCache.get(baseUrl)!
}

// フィルターマップを使用するフック（Suspense対応）
function useFilterMap(baseUrl: string): FilterDef[] {
  const { promise, error, result } = deferredFilterMap(baseUrl)
  if (result) {
    return result
  }
  throw error ?? promise
}

// 各Mixerタイプのパラメータを取得
function getMixerParams(params: ColorParams): ScalarParams {
  switch (params.type) {
    case 'sdssTrueColor':
      return params.sdssTrueColor
    case 'sdssTrueColorMatrix':
      return params.sdssTrueColorMatrix
    case 'simpleRgb':
      return params.simpleRgb
    case 'simpleColorMatrix':
      return params.simpleColorMatrix
  }
}

// 各Mixerタイプのパラメータを更新
function setMixerParams(params: ColorParams, newScalarParams: Partial<ScalarParams>): ColorParams {
  switch (params.type) {
    case 'sdssTrueColor':
      return { ...params, sdssTrueColor: { ...params.sdssTrueColor, ...newScalarParams } }
    case 'sdssTrueColorMatrix':
      return { ...params, sdssTrueColorMatrix: { ...params.sdssTrueColorMatrix, ...newScalarParams } }
    case 'simpleRgb':
      return { ...params, simpleRgb: { ...params.simpleRgb, ...newScalarParams } }
    case 'simpleColorMatrix':
      return { ...params, simpleColorMatrix: { ...params.simpleColorMatrix, ...newScalarParams } }
  }
}

// matrix系かどうかを判定
function isMatrixType(type: MixerType): type is 'sdssTrueColorMatrix' | 'simpleColorMatrix' {
  return type === 'sdssTrueColorMatrix' || type === 'simpleColorMatrix'
}

// matrix系パラメータのcolorsを取得
function getMatrixColors(params: ColorParams): V3[] | null {
  switch (params.type) {
    case 'sdssTrueColorMatrix':
      return params.sdssTrueColorMatrix.colors
    case 'simpleColorMatrix':
      return params.simpleColorMatrix.colors
    default:
      return null
  }
}

// matrix系パラメータのcolorsを更新
function setMatrixColors(params: ColorParams, colors: V3[]): ColorParams {
  switch (params.type) {
    case 'sdssTrueColorMatrix':
      return { ...params, sdssTrueColorMatrix: { ...params.sdssTrueColorMatrix, colors } }
    case 'simpleColorMatrix':
      return { ...params, simpleColorMatrix: { ...params.simpleColorMatrix, colors } }
    default:
      return params
  }
}

/**
 * 数値入力コンポーネント（Enter/Blurで確定）
 */
function NumericInput({
  value,
  onChange,
  className,
}: {
  value: number
  onChange: (newValue: number) => void
  className?: string
}) {
  const [inputValue, setInputValue] = useState(value.toString())

  useEffect(() => {
    setInputValue(value.toString())
  }, [value])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value)
  }

  const validateAndSubmit = () => {
    const numericValue = Number(inputValue)
    if (Number.isFinite(numericValue)) {
      onChange(numericValue)
    } else {
      setInputValue(value.toString())
    }
  }

  const handleBlur = () => {
    validateAndSubmit()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      validateAndSubmit()
    }
  }

  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
    />
  )
}

/**
 * カラーボックス（RGB値を視覚的に表示）
 */
function ColorBox({ color }: { color: V3 }) {
  const [r, g, b] = color
  // 色値は0-1の範囲なので255倍してRGBに変換
  const toRgb = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255)
  return (
    <div
      className={styles.colorBox}
      style={{ backgroundColor: `rgb(${toRgb(r)}, ${toRgb(g)}, ${toRgb(b)})` }}
    />
  )
}

/**
 * Matrix系のフィルター＆色行列コントロール
 */
function MatrixControl({
  filterCandidates,
  filters,
  colors,
  onChange,
}: {
  filterCandidates: string[]
  filters: string[]
  colors: V3[]
  onChange: (newValue: { colors: V3[]; filters: string[] }) => void
}) {
  // filterCandidates → colors のインデックスの変換
  const indexMap = useMemo(() => {
    return Object.fromEntries(
      filterCandidates.map((f, i) => [i, filters.indexOf(f)])
    )
  }, [filterCandidates, filters])

  return (
    <table className={styles.matrixControl}>
      <tbody>
        {/* フィルター名ボタン行 */}
        <tr>
          {filterCandidates.map((f, i) => (
            <td key={i}>
              <button
                className={styles.filterSwitch}
                onClick={() => {
                  onChange({ colors: [[1, 1, 1]], filters: [f] })
                }}
              >
                {f}
              </button>
            </td>
          ))}
        </tr>
        {/* チェックボックス行 */}
        <tr>
          {filterCandidates.map((f, i) => (
            <td key={i}>
              <input
                type="checkbox"
                checked={filters.includes(f)}
                onChange={(e) => {
                  if (e.currentTarget.checked) {
                    // フィルター追加
                    const newFilters = [...filters, f]
                    const newColors: V3[] = [...colors, [0, 0, 0]]
                    onChange({ filters: newFilters, colors: newColors })
                  } else {
                    // フィルター削除（最低1つは残す）
                    if (filters.length > 1) {
                      const idx = filters.indexOf(f)
                      if (idx >= 0) {
                        const newFilters = filters.filter((_, j) => j !== idx)
                        const newColors = colors.filter((_, j) => j !== idx)
                        onChange({ filters: newFilters, colors: newColors })
                      }
                    }
                  }
                }}
              />
            </td>
          ))}
        </tr>
        {/* カラーボックス行 */}
        <tr>
          {filterCandidates.map((_, i) => (
            <td key={i}>
              {indexMap[i] >= 0 && <ColorBox color={colors[indexMap[i]]} />}
            </td>
          ))}
        </tr>
        {/* RGB数値入力行 */}
        <tr className={styles.colorText}>
          {filterCandidates.map((_, i) => (
            <td key={i}>
              {indexMap[i] >= 0 && (
                <div className={styles.colorInputs}>
                  {[0, 1, 2].map((j) => (
                    <NumericInput
                      key={j}
                      value={colors[indexMap[i]][j]}
                      onChange={(newValue) => {
                        const newColors = colors.map((c, ci) =>
                          ci === indexMap[i]
                            ? (c.map((v, vi) => (vi === j ? newValue : v)) as V3)
                            : c
                        )
                        onChange({ colors: newColors, filters })
                      }}
                      className={styles.colorInput}
                    />
                  ))}
                </div>
              )}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}

// パラメータのメモ化（タイプ切り替え時に以前のパラメータを復元）
const paramsMemo = new Map<MixerType, ColorParams>()

// Context型定義
interface HscPdr3ContextType {
  show: boolean
  setShow: (show: boolean) => void
  showOutline: boolean
  setShowOutline: (show: boolean) => void
  showSettings: boolean
  setShowSettings: (show: boolean) => void
  colorParams: ColorParams
  setColorParams: React.Dispatch<React.SetStateAction<ColorParams>>
  handleMixerTypeChange: (newType: MixerType) => void
}

const HscPdr3Context = createContext<HscPdr3ContextType | null>(null)

function useHscPdr3Context() {
  const ctx = useContext(HscPdr3Context)
  if (!ctx) {
    throw new Error('useHscPdr3Context must be used within HscPdr3Section.Provider')
  }
  return ctx
}

/**
 * HSC PDR3関連の状態を提供するProvider
 */
function HscPdr3Provider({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(true)
  const [showOutline, setShowOutline] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [colorParams, setColorParams] = useState<ColorParams>(() => {
    return TractTileLayer.defaultParams({ type: 'sdssTrueColor', filters: ['i', 'r', 'g'] })
  })

  const handleMixerTypeChange = useCallback((newType: MixerType) => {
    setColorParams((prev) => {
      paramsMemo.set(prev.type, prev)
      const memorized = paramsMemo.get(newType)
      if (memorized) {
        return memorized
      }
      return TractTileLayer.defaultParams({ type: newType, filters: prev.filters })
    })
  }, [])

  const value = useMemo(
    () => ({
      show,
      setShow,
      showOutline,
      setShowOutline,
      showSettings,
      setShowSettings,
      colorParams,
      setColorParams,
      handleMixerTypeChange,
    }),
    [show, showOutline, showSettings, colorParams, handleMixerTypeChange]
  )

  return <HscPdr3Context.Provider value={value}>{children}</HscPdr3Context.Provider>
}

/**
 * TractTileLayerをフィルター名辞書付きでラップ（内部コンポーネント）
 */
function HscPdr3TractTileLayerInner(props: Omit<Parameters<typeof ReactTractTileLayer>[0], 'filterNameDictionary'>) {
  const filterMap = useFilterMap(props.baseUrl ?? '')
  const filterNameDictionary = useMemo(
    () => Object.fromEntries(filterMap.map(({ commonName, intrinsicName }) => [commonName, intrinsicName])),
    [filterMap]
  )
  return <ReactTractTileLayer filterNameDictionary={filterNameDictionary} {...props} />
}

/**
 * Globe内に配置するタイルレイヤー
 */
function HscPdr3Layer() {
  const { show, showOutline, colorParams } = useHscPdr3Context()

  return (
    <Suspense>
      <HscPdr3TractTileLayerInner
        baseUrl={HSC_PDR3_WIDE_BASE_URL}
        outline={showOutline}
        colorParams={colorParams}
        visible={show}
      />
    </Suspense>
  )
}

/**
 * HSC PDR3の設定コントロールUI
 */
function HscPdr3Control() {
  const {
    show,
    setShow,
    showOutline,
    setShowOutline,
    showSettings,
    setShowSettings,
    colorParams,
    setColorParams,
    handleMixerTypeChange,
  } = useHscPdr3Context()

  // スライダーポップアップ用のfloating-ui設定
  const { refs: sliderRefs, floatingStyles: sliderFloatingStyles, context: sliderContext } = useFloating({
    open: showSettings,
    onOpenChange: setShowSettings,
    placement: 'right-start',
    middleware: [
      offset(8),
      flip({ fallbackAxisSideDirection: 'start' }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  })

  const sliderDismiss = useDismiss(sliderContext)
  const { getReferenceProps: getSliderReferenceProps, getFloatingProps: getSliderFloatingProps } = useInteractions([
    sliderDismiss,
  ])

  return (
    <div className={styles.hscSection}>
      <label>
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
        />
        HSC PDR3 Wide
      </label>
      {show && (
        <div className={styles.hscOptions}>
          <label className={styles.inlineOption}>
            <input
              type="checkbox"
              checked={showOutline}
              onChange={(e) => setShowOutline(e.target.checked)}
            />
            Outline
          </label>
          <label
            ref={sliderRefs.setReference}
            className={styles.inlineOption}
            {...getSliderReferenceProps()}
          >
            <input
              type="checkbox"
              checked={showSettings}
              onChange={(e) => setShowSettings(e.target.checked)}
            />
            Settings
          </label>
        </div>
      )}
      {showSettings && (
        <FloatingPortal>
          <div
            ref={sliderRefs.setFloating}
            style={sliderFloatingStyles}
            className={styles.sliderPopup}
            {...getSliderFloatingProps()}
          >
            <div className={styles.typeSection}>
              <select
                value={colorParams.type}
                onChange={(e) => handleMixerTypeChange(e.target.value as MixerType)}
                className={styles.typeSelect}
              >
                <option value="sdssTrueColor">SDSS True Color</option>
                <option value="sdssTrueColorMatrix">SDSS True Color Matrix</option>
                <option value="simpleRgb">Simple RGB</option>
                <option value="simpleColorMatrix">Simple Color Matrix</option>
              </select>
              <button
                className={styles.resetButton}
                onClick={() =>
                  setColorParams(
                    TractTileLayer.defaultParams({
                      type: colorParams.type,
                      filters: ['i', 'r', 'g'],
                    })
                  )
                }
              >
                Reset
              </button>
            </div>
            <div className={styles.filterSection}>
              {isMatrixType(colorParams.type) ? (
                <MatrixControl
                  filterCandidates={HSC_FILTERS}
                  filters={colorParams.filters}
                  colors={getMatrixColors(colorParams) ?? [[1, 1, 1]]}
                  onChange={({ colors, filters }) =>
                    setColorParams((prev) => setMatrixColors({ ...prev, filters }, colors))
                  }
                />
              ) : (
                <table className={styles.filterSelector}>
                  <tbody>
                    <tr>
                      <td />
                      {HSC_FILTERS.map((f) => (
                        <td key={f}>
                          <button
                            className={styles.filterSwitch}
                            onClick={() =>
                              setColorParams((prev) => ({
                                ...prev,
                                filters: [f, f, f],
                              }))
                            }
                          >
                            {f}
                          </button>
                        </td>
                      ))}
                    </tr>
                    {(['r', 'g', 'b'] as const).map((channel, i) => {
                      const channelColors = { r: '#f66', g: '#6f6', b: '#66f' } as const
                      const bgColors = { r: 'rgba(255, 0, 0, 0.15)', g: 'rgba(0, 255, 0, 0.15)', b: 'rgba(0, 0, 255, 0.15)' } as const
                      return (
                        <tr key={channel} style={{ backgroundColor: bgColors[channel] }}>
                          <th style={{ color: channelColors[channel], fontWeight: 'bold', backgroundColor: bgColors[channel] }}>{channel}</th>
                          {HSC_FILTERS.map((f) => (
                            <td key={f}>
                              <input
                                type="radio"
                                name={`hsc-filter-${channel}`}
                                checked={f === colorParams.filters[i]}
                                onChange={() =>
                                  setColorParams((prev) => {
                                    const newFilters = [...prev.filters]
                                    newFilters[i] = f
                                    return { ...prev, filters: newFilters }
                                  })
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className={styles.sliderSection}>
              <div className={styles.paramRow}>
                <label>β</label>
                <LogScaleRange
                  value={getMixerParams(colorParams).beta}
                  min={0}
                  max={1e7}
                  onInput={(beta) =>
                    setColorParams((prev) => setMixerParams(prev, { beta }))
                  }
                  className={styles.slider}
                />
                <span className={styles.value}>
                  {getMixerParams(colorParams).beta.toExponential(2)}
                </span>
              </div>
              <div className={styles.paramRow}>
                <label>
                  b<sub>0</sub>
                </label>
                <LogScaleRange
                  value={getMixerParams(colorParams).b0}
                  min={0}
                  max={5e-5}
                  onInput={(b0) =>
                    setColorParams((prev) => setMixerParams(prev, { b0 }))
                  }
                  className={styles.slider}
                />
                <span className={styles.value}>
                  {getMixerParams(colorParams).b0.toExponential(2)}
                </span>
              </div>
              <div className={styles.paramRow}>
                <label>A</label>
                <LogScaleRange
                  value={getMixerParams(colorParams).a}
                  min={0}
                  max={1e4}
                  onInput={(a) =>
                    setColorParams((prev) => setMixerParams(prev, { a }))
                  }
                  className={styles.slider}
                />
                <span className={styles.value}>
                  {getMixerParams(colorParams).a.toExponential(2)}
                </span>
              </div>
              <div className={styles.paramRow}>
                <label>bias</label>
                <LogScaleRange
                  value={getMixerParams(colorParams).bias}
                  min={-0.5}
                  max={0.5}
                  a={1e-8}
                  onInput={(bias) =>
                    setColorParams((prev) => setMixerParams(prev, { bias }))
                  }
                  className={styles.slider}
                />
                <span className={styles.value}>
                  {getMixerParams(colorParams).bias.toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  )
}

/**
 * HSC PDR3関連コンポーネントをまとめたオブジェクト
 */
export const HscPdr3Section = {
  Provider: HscPdr3Provider,
  Layer: HscPdr3Layer,
  Control: HscPdr3Control,
}
