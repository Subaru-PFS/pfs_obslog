/**
 * Visit関連の型定義
 * docs/list-visits-endpoint.md に基づく
 */

/**
 * Visitに紐づくメモ
 */
export interface VisitNote {
  id: number
  body: string
  user_id?: string
  created_at: string
}

/**
 * IicSequenceのステータス情報
 */
export interface IicSequenceStatus {
  status_id: number
  status_name: string
  status_flag: boolean
}

/**
 * シーケンスグループ情報
 */
export interface SequenceGroup {
  group_id: number
  group_name: string
}

/**
 * IicSequence（シーケンス）に紐づくメモ
 */
export interface VisitSetNote {
  id: number
  body: string
  user_id?: string
  created_at: string
}

/**
 * IicSequence（シーケンス）情報
 */
export interface IicSequence {
  visit_set_id: number
  sequence_type?: string
  name?: string
  comments?: string
  cmd_str?: string
  status?: IicSequenceStatus
  notes: VisitSetNote[]
  group?: SequenceGroup
}

/**
 * Visit一覧のエントリ
 */
export interface VisitListEntry {
  // 基本情報
  id: number
  description?: string
  issued_at?: string
  visit_set_id?: number

  // 露出数（集計値）
  n_sps_exposures: number
  n_mcs_exposures: number
  n_agc_exposures: number

  // 平均値
  avg_exptime?: number
  avg_azimuth?: number
  avg_altitude?: number
  avg_ra?: number
  avg_dec?: number
  avg_insrot?: number

  // メモ
  notes: VisitNote[]

  // QA情報
  seeing_median?: number
  transparency_median?: number
  effective_exposure_time_b?: number
  effective_exposure_time_r?: number
  effective_exposure_time_n?: number
  effective_exposure_time_m?: number

  // 設計ID
  pfs_design_id?: string
}

/**
 * Visit一覧レスポンス
 */
export interface VisitList {
  visits: VisitListEntry[]
  iic_sequence: IicSequence[]
  count: number
}

/**
 * IicSequenceでグループ化されたVisit
 */
export interface VisitGroup {
  iicSequence?: IicSequence
  visits: VisitListEntry[]
}

/**
 * 表示カラムの設定
 */
export type VisitColumn =
  | 'id'
  | 'description'
  | 'issuedDate'
  | 'issuedTime'
  | 'numberOfExposures'
  | 'avgExptime'
  | 'effectiveExptime'
  | 'designId'
  | 'seeing'
  | 'transparency'
  | 'raDec'
  | 'azEl'
  | 'insrot'
  | 'notes'

/**
 * Visit一覧APIのクエリパラメータ
 */
export interface VisitListQueryParams {
  sql?: string
  offset?: number
  limit?: number
}
