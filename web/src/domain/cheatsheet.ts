import type { OptionGroup, Stage, TemplateFile } from '@/domain/types'

export type StageMove = 'prev' | 'next' | 'first' | 'last'

export function documentNames(
  templateIds: readonly string[],
  templates: readonly Pick<TemplateFile, 'id' | 'name'>[],
): string[] {
  return templateIds.map((id) => templates.find((template) => template.id === id)?.name ?? id)
}

export function optionGroupGlance(group: Pick<OptionGroup, 'label' | 'required' | 'presentation'>): string {
  const flags = [group.required ? 'required' : 'skippable']
  if (group.presentation === 'visual') flags.push('visual')
  return `${group.label} (${flags.join(', ')})`
}

export function stageCardText(
  stage: Pick<Stage, 'name' | 'oneLiner' | 'keyArtifact' | 'goal' | 'optionGroups'>,
  documents: readonly string[],
): string {
  const docs = documents.length > 0 ? documents.join(', ') : 'None'
  const groups =
    stage.optionGroups.length > 0 ? stage.optionGroups.map((group) => optionGroupGlance(group)).join(', ') : 'None'
  return `${stage.name}\n\n${stage.oneLiner}\n\nKey artifact: ${stage.keyArtifact}\n\nPurpose: ${stage.goal}\n\nDocuments: ${docs}\n\nOption groups: ${groups}`
}

/** Move among stage cards. Arrows stop at the ends. -1 means nothing is selected yet. */
export function moveStageIndex(index: number, count: number, direction: StageMove): number {
  if (count <= 0) return -1
  if (direction === 'first') return 0
  if (direction === 'last') return count - 1
  if (index < 0) return direction === 'next' ? 0 : count - 1
  const next = index + (direction === 'next' ? 1 : -1)
  if (next < 0) return 0
  if (next >= count) return count - 1
  return next
}
