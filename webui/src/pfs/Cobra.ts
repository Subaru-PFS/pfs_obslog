export const NUM_MODULES_PER_SECTOR = 14
export const NUM_COBRAS_PER_MODULE = 57
export const NUM_OF_FIELDS = 3
export const NUM_OF_MODULES = NUM_MODULES_PER_SECTOR * NUM_OF_FIELDS
export const NUM_OF_COBRAS = NUM_OF_FIELDS * NUM_MODULES_PER_SECTOR * NUM_COBRAS_PER_MODULE

export class Cobra {
  readonly cm: number
  readonly m: number
  readonly mf: number
  readonly f: number
  readonly x: number
  readonly y: number

  constructor(readonly id: number) {
    this.cm = id % NUM_COBRAS_PER_MODULE // cobra number in module
    this.m = Math.floor(id / NUM_COBRAS_PER_MODULE) // module number
    this.mf = this.m % NUM_MODULES_PER_SECTOR // module number in field
    this.f = Math.floor(this.m / NUM_MODULES_PER_SECTOR) // field number
    const DELX = Math.sqrt(3)
    const DELY = 1
    const x0 = -DELX * ((this.cm % 2 == 0 ? 1 : 2) + 2 * this.mf)
    const y0 = -DELY * ((this.cm - 1) - 2 * this.mf)
    const [x, y] = rotation(x0, y0, this.f * 4 * Math.PI / 3)
    this.x = x
    this.y = y
  }
}

function rotation(x: number, y: number, rot: number) {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  return [
    c * x - s * y,
    s * x + c * y,
  ]
}
