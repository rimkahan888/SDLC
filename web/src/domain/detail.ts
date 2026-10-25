import type { OptionGroup, Stage, TemplateFile } from '@/domain/types'

export type DetailTab = 'steps' | 'done' | 'pitfalls' | 'documents' | 'options'

export const detailTabLabels: Record<DetailTab, string> = {
  steps: 'Steps',
  done: 'Done-checks',
  pitfalls: 'Pitfalls',
  documents: 'Documents',
  options: 'Options',
}

export function detailTabs(stage: {
  steps: readonly unknown[]
  doneChecks: readonly unknown[]
  pitfalls: readonly unknown[]
  optionGroups: readonly unknown[]
}): DetailTab[] {
  const tabs: DetailTab[] = []
  if (stage.steps.length > 0) tabs.push('steps')
  if (stage.doneChecks.length > 0) tabs.push('done')
  if (stage.pitfalls.length > 0) tabs.push('pitfalls')
  tabs.push('documents')
  if (stage.optionGroups.length > 0) tabs.push('options')
  return tabs
}

export function activeDetailTab(current: DetailTab, tabs: readonly DetailTab[], prefer?: DetailTab): DetailTab {
  if (prefer && tabs.includes(prefer)) return prefer
  if (tabs.includes(current)) return current
  return tabs[0] ?? 'documents'
}

/** First sentence of the template's leading note. Filenames keep their dots. */
export function templateSummary(markdown: string): string {
  const comment = /<!--([\s\S]*?)-->/.exec(markdown)
  const source = (comment?.[1] ?? markdown).replace(/\r\n/g, '\n')
  const paragraph = source
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && !entry.startsWith('#') && !entry.startsWith('**') && !entry.startsWith('['))
    .join(' ')
  if (!paragraph) return ''
  const sentence = /^.*?[.!?](?=\s|$)/.exec(paragraph)
  return (sentence?.[0] ?? paragraph).trim()
}

export type StageDocument = {
  id: string
  name: string
  summary: string
  file: string
}

export function stageDocuments(
  templateIds: readonly string[],
  templates: readonly Pick<TemplateFile, 'id' | 'name' | 'file' | 'markdown'>[],
): StageDocument[] {
  return templateIds.map((id) => {
    const template = templates.find((item) => item.id === id)
    if (!template) return { id, name: id, summary: '', file: '' }
    return {
      id,
      name: template.name,
      summary: templateSummary(template.markdown),
      file: template.file,
    }
  })
}

export function stepCopyText(step: Pick<Stage['steps'][number], 'title' | 'text'>): string {
  return `${step.title}\n\n${step.text}`
}

export function artifactCopyText(keyArtifact: string): string {
  return `Key artifact: ${keyArtifact}`
}

export function documentCopyText(document: Pick<StageDocument, 'name' | 'summary' | 'file'>): string {
  const extra = document.summary || document.file
  return extra ? `${document.name}\n\n${extra}` : document.name
}

export function optionCopyText(label: string, detail: string): string {
  return `${label}\n\n${detail}`
}

export function groupFlags(group: Pick<OptionGroup, 'selection' | 'required' | 'presentation'>): string {
  const parts = [group.selection === 'single' ? 'One choice' : 'Any number', group.required ? 'Required' : 'Skippable']
  if (group.presentation === 'visual') parts.push('Visual')
  return parts.join(' · ')
}

export function groupCopyText(group: OptionGroup): string {
  const lines = [group.label, '', group.help, '', groupFlags(group)]
  for (const option of group.options) {
    lines.push('', option.label, option.detail)
  }
  return lines.join('\n')
}
