import { describe, expect, it } from 'vitest'

import type { VisitList } from '../../../store/api/generatedApi'
import { compileVisitGroups } from './visitGrouping'

describe('compileVisitGroups', () => {
  it('keeps repeated sequence runs separate and gives each group a unique key', () => {
    const data: VisitList = {
      visits: [
        { id: 104, iic_sequence_id: 10 },
        { id: 103, iic_sequence_id: 10 },
        { id: 102, iic_sequence_id: 20 },
        { id: 101, iic_sequence_id: 10 },
      ],
      iic_sequences: [
        { iic_sequence_id: 10, name: 'Sequence A' },
        { iic_sequence_id: 20, name: 'Sequence B' },
      ],
      count: 4,
    }

    const groups = compileVisitGroups(data)

    expect(groups).toHaveLength(3)
    expect(groups.map((group) => group.visits.map((visit) => visit.id))).toEqual([
      [104, 103],
      [102],
      [101],
    ])
    expect(groups.map((group) => group.iicSequence?.iic_sequence_id)).toEqual([10, 20, 10])
    expect(new Set(groups.map((group) => group.key)).size).toBe(groups.length)
    expect(groups[0].key).not.toBe(groups[2].key)
  })
})
