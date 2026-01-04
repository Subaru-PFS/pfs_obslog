/**
 * Cobra クラス - PFSコブラの位置計算
 *
 * https://github.com/Subaru-PFS/pfs_utils/blob/master/data/fiberids/cobras.pdf
 */
import cobId2fiberId from './cobId2fiberId.json'

const NUM_MODULES_PER_SECTOR = 14
const NUM_COBRAS_PER_MODULE = 57
const NUM_OF_FIELDS = 3
export const NUM_OF_COBRAS = NUM_OF_FIELDS * NUM_MODULES_PER_SECTOR * NUM_COBRAS_PER_MODULE // 2394

/**
 * Cobra（ポジショナー）の情報を管理するクラス
 */
export class Cobra {
  readonly cm0: number // cobra number in module (0 based index)
  readonly m0: number // module number (0 based index)
  readonly mf0: number // module number in field (0 based index)
  readonly f0: number // field number (0 based index)
  readonly x: number
  readonly y: number
  readonly id0: number

  constructor(id0: number) {
    this.id0 = id0
    this.cm0 = id0 % NUM_COBRAS_PER_MODULE // cobra number in module
    this.m0 = Math.floor(id0 / NUM_COBRAS_PER_MODULE) // module number
    this.mf0 = this.m0 % NUM_MODULES_PER_SECTOR // module number in field
    this.f0 = Math.floor(this.m0 / NUM_MODULES_PER_SECTOR) // field number

    const DELX = Math.sqrt(3)
    const DELY = 1
    const x0 = -DELX * ((this.cm0 % 2 == 0 ? 1 : 2) + 2 * this.mf0)
    const y0 = -DELY * (this.cm0 - 1 - 2 * this.mf0)
    const [x, y] = rotation(x0, y0, (this.f0 * 4 * Math.PI) / 3)
    this.x = x
    this.y = y
  }

  /** Cobra ID (1-based) */
  get id(): number {
    return this.id0 + 1
  }

  /** Fiber ID */
  get fiberId(): number {
    return (cobId2fiberId as Record<string, number>)[String(this.id)] ?? -1
  }

  /** Module ID (1-based) */
  get moduleId(): number {
    return this.m0 + 1
  }

  /** Field/Sector ID (1-based) */
  get fieldId(): number {
    return this.f0 + 1
  }
}

/**
 * 2D回転
 */
function rotation(x: number, y: number, rot: number): [number, number] {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  return [c * x - s * y, s * x + c * y]
}

/**
 * 全Cobraのリストを生成
 */
export function getAllCobras(): Cobra[] {
  return Array.from({ length: NUM_OF_COBRAS }, (_, i) => new Cobra(i))
}

/**
 * fiberId -> Cobra のマップ（遅延生成）
 */
let fiberId2CobraCache: Map<number, Cobra> | null = null

function getFiberId2CobraMap(): Map<number, Cobra> {
  if (!fiberId2CobraCache) {
    fiberId2CobraCache = new Map()
    for (const cobra of getAllCobras()) {
      fiberId2CobraCache.set(cobra.fiberId, cobra)
    }
  }
  return fiberId2CobraCache
}

/**
 * FiberIDからCobraを取得
 */
export function getCobraByFiberId(fiberId: number): Cobra | undefined {
  return getFiberId2CobraMap().get(fiberId)
}
