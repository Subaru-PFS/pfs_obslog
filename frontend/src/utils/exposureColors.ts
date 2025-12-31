/**
 * Exposure count colors - shared between VisitList and VisitDetail
 * Based on old-project colors.ts int2color() using HSV color wheel
 * bit pattern: (SPS > 0) << 2 | (MCS > 0) << 1 | (AGC > 0) << 0
 */

export interface ExposureColorStyle {
  backgroundColor: string
  color: string
}

/**
 * Exposure color definitions
 */
export const exposureColors = {
  // No exposures (000): gray
  none: { backgroundColor: '#dddddd', color: '#3c3c3c' },
  // AGC only (001): HSV(150, 100, 100) = cyan-green
  agc: { backgroundColor: '#bfffdf', color: '#107040' },
  // MCS only (010): HSV(300, 100, 100) = magenta
  mcs: { backgroundColor: '#ffbfff', color: '#701070' },
  // MCS + AGC (011): HSV(90, 100, 100) = chartreuse
  mcsAgc: { backgroundColor: '#dfffbf', color: '#407010' },
  // SPS only (100): HSV(240, 100, 100) = blue
  sps: { backgroundColor: '#bfbfff', color: '#101070' },
  // SPS + AGC (101): HSV(30, 100, 100) = orange
  spsAgc: { backgroundColor: '#ffdfbf', color: '#704010' },
  // SPS + MCS (110): HSV(180, 100, 100) = cyan
  spsMcs: { backgroundColor: '#bfffff', color: '#107070' },
  // All three (111): HSV(330, 100, 100) = pink-magenta
  mixed: { backgroundColor: '#ffbfdf', color: '#701040' },
} as const

/**
 * 露出数のスタイルを取得
 */
export function getExposureColorStyle(sps: number, mcs: number, agc: number): ExposureColorStyle {
  const bits = (sps > 0 ? 4 : 0) | (mcs > 0 ? 2 : 0) | (agc > 0 ? 1 : 0)
  const colorMap: { [key: number]: ExposureColorStyle } = {
    0: exposureColors.none,
    1: exposureColors.agc,
    2: exposureColors.mcs,
    3: exposureColors.mcsAgc,
    4: exposureColors.sps,
    5: exposureColors.spsAgc,
    6: exposureColors.spsMcs,
    7: exposureColors.mixed,
  }
  return colorMap[bits] || exposureColors.none
}

/**
 * 選択状態用の暗めの露出色を取得
 */
export const exposureColorsSelected = {
  none: { backgroundColor: '#c5c5c5', color: '#3c3c3c' },
  agc: { backgroundColor: '#9fe0c2', color: '#107040' },
  mcs: { backgroundColor: '#e09fe0', color: '#701070' },
  mcsAgc: { backgroundColor: '#c2e09f', color: '#407010' },
  sps: { backgroundColor: '#9f9fe0', color: '#101070' },
  spsAgc: { backgroundColor: '#e0c29f', color: '#704010' },
  spsMcs: { backgroundColor: '#9fe0e0', color: '#107070' },
  mixed: { backgroundColor: '#e09fc2', color: '#701040' },
} as const
