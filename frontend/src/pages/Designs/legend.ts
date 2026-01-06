/**
 * Design Viewerの色凡例定義
 *
 * https://github.com/Subaru-PFS/datamodel/blob/master/datamodel.txt
 */
import type { LegendEntry } from './types'

// Target Type色定義
// https://github.com/Subaru-PFS/datamodel/blob/master/datamodel.txt#L489
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
  {
    name: 'DCB',
    color: 'teal',
    doc: 'the fiber is fed by DCB/DCB2.',
  },
  {
    name: 'HOME',
    color: 'silver',
    doc: 'cobra is going to its home position.',
  },
  {
    name: 'BLACKSPOT',
    color: 'black',
    doc: 'cobra is going behind the black spot.',
  },
  {
    name: 'AFL',
    color: 'lime',
    doc: 'the fiber is fed by all fiber lamp cable.',
  },
  {
    name: 'SCIENCE_MASKED',
    color: 'lightgray',
    doc: 'the fiber is on a science target redacted for privacy.',
  },
]

// Fiber Status色定義
// https://github.com/Subaru-PFS/datamodel/blob/master/datamodel.txt#L503
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
  {
    name: 'BROKENCOBRA',
    color: 'darkred',
    doc: 'the cobra cannot move, but the fiber still carries flux.',
  },
  {
    name: 'NOTCONVERGED',
    color: 'gold',
    doc: 'the cobra did not converge to the target.',
  },
  {
    name: 'BAD_PSF',
    color: 'maroon',
    doc: 'the fiber is known to have a bad PSF.',
  },
]
