/**
 * PFS Design関連の型定義
 */
import type {
  PfsDesignEntry as ApiPfsDesignEntry,
  PfsDesignDetail as ApiPfsDesignDetail,
} from '../../store/api/generatedApi'

// APIから取得する型を再エクスポート
export type PfsDesignEntry = ApiPfsDesignEntry
export type PfsDesignDetail = ApiPfsDesignDetail

// 色分けモード
export type ColorMode = 'targetType' | 'fiberStatus'

// 凡例エントリ
export interface LegendEntry {
  name: string
  color: string
  doc: string
}

// ID表示形式
export type IdFormat = 'hex' | 'decimal'

// ソート順
export type SortOrder = 'altitude' | 'date_modified'

// タイムゾーンオフセット（分単位）HST = UTC-10:00
export const HST_TZ_OFFSET = 600

// すばる望遠鏡の位置
export const SUBARU_TELESCOPE_LOCATION = {
  lat: 19.825556, // 19°49'32"
  lon: -155.4766667, // -155°28'36"
}

// Design同士のクロスマッチ判定用コサイン値（0.001度以内）
export const DESIGN_CROSS_MATCH_COSINE = Math.cos((0.001 * Math.PI) / 180)

// マーカーサイズ（PFS視野に相当、約1.4度）
export const MARKER_FOV = (1.4 * Math.PI) / 180
