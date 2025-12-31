/**
 * Design Viewerの色凡例定義
 *
 * https://github.com/Subaru-PFS/datamodel/blob/master/datamodel.txt
 */
import type { LegendEntry } from './types'

// Target Type色定義
// https://github.com/Subaru-PFS/datamodel/blob/master/datamodel.txt#L336
export const targetTypeColors: (LegendEntry | undefined)[] = [
  undefined,
  {
    name: 'SCIENCE',
    color: 'lightsteelblue',
    doc: 'the fiber is intended to be on a science target.',
  },
  {
    name: 'SKY',
    color: 'yellow',
    doc: 'the fiber is intended to be on blank sky, and used for sky subtraction.',
  },
  {
    name: 'FLUXSTD',
    color: 'magenta',
    doc: 'the fiber is intended to be on a flux standard, and used for flux calibration.',
  },
  {
    name: 'UNASSIGNED',
    color: 'gray',
    doc: 'the fiber is not targeted on anything in particular.',
  },
  {
    name: 'ENGINEERING',
    color: 'red',
    doc: 'the fiber is an engineering fiber.',
  },
  {
    name: 'SUNSS_IMAGING',
    color: 'olive',
    doc: 'the fiber goes to the SuNSS imaging leg',
  },
  {
    name: 'SUNSS_DIFFUSE',
    color: 'blue',
    doc: 'the fiber goes to the SuNSS diffuse leg',
  },
]

// Fiber Status色定義
// https://github.com/Subaru-PFS/datamodel/blob/master/datamodel.txt#L345
export const fiberStatusColors: (LegendEntry | undefined)[] = [
  undefined,
  {
    name: 'GOOD',
    color: 'lightsteelblue',
    doc: 'the fiber is working normally.',
  },
  {
    name: 'BROKENFIBER',
    color: 'red',
    doc: 'the fiber is broken, and any flux should be ignored.',
  },
  {
    name: 'BLOCKED',
    color: 'orange',
    doc: 'the transmission through the fiber is temporarily blocked. Any flux should be ignored.',
  },
  {
    name: 'BLACKSPOT',
    color: 'purple',
    doc: 'the fiber is hidden behind its spot, and any flux should be ignored.',
  },
  {
    name: 'UNILLUMINATED',
    color: 'blue',
    doc: 'the fiber is not being illuminated.',
  },
]
