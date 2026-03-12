import type {
  IicSequence,
  VisitList as VisitListType,
  VisitListEntry,
} from '../../../store/api/generatedApi'

export interface VisitGroup {
  key: string
  iicSequence?: IicSequence
  visits: VisitListEntry[]
}

function buildVisitGroupKey(iicSequenceId: number | null | undefined, firstVisitId: number): string {
  const sequenceKey =
    iicSequenceId === undefined || iicSequenceId === null
      ? 'no-seq'
      : `seq-${iicSequenceId}`

  return `${sequenceKey}-${firstVisitId}`
}

/**
 * VisitListをIicSequenceの連続区間ごとにグループ化
 */
export function compileVisitGroups(data: VisitListType): VisitGroup[] {
  const groups: VisitGroup[] = []
  const iicSequences = new Map<number, IicSequence>(
    data.iic_sequences.map((iicSequence) => [iicSequence.iic_sequence_id, iicSequence])
  )

  for (const visit of data.visits) {
    const iicSequenceId = visit.iic_sequence_id ?? null
    const iicSequence = iicSequenceId !== null ? iicSequences.get(iicSequenceId) : undefined
    const lastGroup = groups[groups.length - 1]
    const lastGroupSequenceId = lastGroup?.visits[0]?.iic_sequence_id ?? null

    if (!lastGroup || lastGroupSequenceId !== iicSequenceId) {
      groups.push({
        key: buildVisitGroupKey(iicSequenceId, visit.id),
        iicSequence,
        visits: [visit],
      })
      continue
    }

    lastGroup.visits.push(visit)
  }

  return groups
}
