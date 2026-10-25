import { templateSummary } from '@/domain/detail'
import type { StageMove } from '@/domain/cheatsheet'
import { moveStageIndex } from '@/domain/cheatsheet'
import type { Stage, TemplateFile } from '@/domain/types'

export type TemplateIndexItem = {
  id: string
  name: string
  file: string
  summary: string
}

export type TemplateIndexGroup = {
  stageId: string
  stageName: string
  order: number
  items: TemplateIndexItem[]
}

export function templateIndex(
  stages: readonly Pick<Stage, 'id' | 'name' | 'order' | 'templates'>[],
  templates: readonly Pick<TemplateFile, 'id' | 'name' | 'file' | 'markdown'>[],
): TemplateIndexGroup[] {
  const groups: TemplateIndexGroup[] = []
  const seen = new Set<string>()
  for (const stage of [...stages].sort((left, right) => left.order - right.order)) {
    const items: TemplateIndexItem[] = []
    for (const id of stage.templates) {
      if (seen.has(id)) continue
      seen.add(id)
      const template = templates.find((item) => item.id === id)
      items.push({
        id,
        name: template?.name ?? id,
        file: template?.file ?? '',
        summary: template ? templateSummary(template.markdown) : '',
      })
    }
    if (items.length > 0) {
      groups.push({ stageId: stage.id, stageName: stage.name, order: stage.order, items })
    }
  }
  return groups
}

export function templateIdsInOrder(groups: readonly TemplateIndexGroup[]): string[] {
  return groups.flatMap((group) => group.items.map((item) => item.id))
}

/** Move through the index. Arrows stop at the ends. A missing id starts from nothing. */
export function neighborTemplateId(
  ids: readonly string[],
  currentId: string | null,
  direction: StageMove,
): string | null {
  if (ids.length === 0) return null
  const index = currentId == null ? -1 : ids.indexOf(currentId)
  const next = moveStageIndex(index, ids.length, direction)
  if (next < 0) return null
  return ids[next] ?? null
}

export type TemplateReturn =
  | { kind: 'index'; stageId: string | null }
  | { kind: 'stage'; stageId: string }
  | { kind: 'close' }

function oneString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

export function templateReturn(input: {
  routeName: string
  from: unknown
  stageQuery: unknown
  templateStageId: string | null
  knownStageIds: readonly string[]
}): TemplateReturn {
  const stageQuery = oneString(input.stageQuery)
  const knownStage = stageQuery != null && input.knownStageIds.includes(stageQuery) ? stageQuery : null
  if (input.routeName === 'templates') {
    return knownStage ? { kind: 'stage', stageId: knownStage } : { kind: 'close' }
  }
  if (input.routeName !== 'template') return { kind: 'close' }
  if (input.from === 'index') return { kind: 'index', stageId: knownStage }
  if (input.templateStageId && input.knownStageIds.includes(input.templateStageId)) {
    return { kind: 'stage', stageId: input.templateStageId }
  }
  return knownStage ? { kind: 'stage', stageId: knownStage } : { kind: 'index', stageId: null }
}
