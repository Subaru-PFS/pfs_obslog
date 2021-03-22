import Color from 'color'


type LegendEntry = {
  name: string
  color: Color
  doc: string
}


// https://github.com/Subaru-PFS/datamodel/blob/ff50d7460ad63f7283b6188da851c52af76d5e7d/datamodel.txt#L336
export const targetTypeColors: (undefined | LegendEntry)[] = [
  undefined,
  { name: 'SCIENCE', color: Color('lightsteelblue'), doc: 'the fiber is intended to be on a science target.' },
  { name: 'SKY', color: Color('yellow'), doc: 'the fiber is intended to be on blank sky, and used for sky subtraction.' },
  { name: 'FLUXSTD', color: Color('magenta'), doc: 'the fiber is intended to be on a flux standard, annd used for flux calibration.' },
  { name: 'UNASSIGNED', color: Color('gray'), doc: 'the fiber is not targeted on anything in particular.' },
  { name: 'ENGINEERING', color: Color('red'), doc: 'the fiber is an engineering fiber.' },
  { name: 'SUNSS_IMAGING', color: Color('olive'), doc: 'the fiber goes to the SuNSS imaging leg' },
  { name: 'SUNSS_DIFFUSE', color: Color('blue'), doc: 'the fiber goes to the SuNSS diffuse leg' },
]
// https://github.com/Subaru-PFS/datamodel/blob/ff50d7460ad63f7283b6188da851c52af76d5e7d/datamodel.txt#L345
export const fiberStatusColors: (undefined | LegendEntry)[] = [
  undefined,
  { name: 'GOOD', color: Color('lightsteelblue'), doc: 'the fiber is working normally.' },
  { name: 'BROKENFIBER', color: Color('red'), doc: 'the fiber is broken, and any flux should be ignored.' },
  { name: 'BLOCKED', color: Color('orange'), doc: 'the transmission through the fiber is temporarily blocked. Any flux should be ignored.' },
  { name: 'BLACKSPOT', color: Color('purple'), doc: 'the fiber is hidden behind its spot, and any flux should be ignored.' },
  { name: 'UNILLUMINATED', color: Color('blue'), doc: 'the fiber is not being illuminated.' },
]
