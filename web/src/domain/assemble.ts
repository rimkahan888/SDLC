import { effectiveSelection } from './choices'
import type { AssembledPrompt, OptionGroup, PromptChoices, PromptShell, Stage, TemplateFile } from './types'

export const visualBlendLead =
  'Blend these visual styles. The first style is the primary system: keep its layout, type, and spacing. Each later style is an accent: borrow its color, texture, or shape, and do not let an accent replace the primary layout.'

function joinFragments(group: OptionGroup, parts: readonly string[]): string {
  if (group.presentation === 'visual' && parts.length > 1) {
    return [visualBlendLead, ...parts].join('\n\n')
  }
  return parts.join('\n\n')
}

function fillOnce(template: string, token: string, value: string): string {
  const index = template.indexOf(token)
  if (index < 0) return template
  return template.slice(0, index) + value + template.slice(index + token.length)
}

export function assemblePrompt(
  stages: readonly Stage[],
  shell: PromptShell,
  choices: PromptChoices,
  templates: readonly TemplateFile[],
): AssembledPrompt {
  const ordered = [...stages].sort((left, right) => left.order - right.order)
  const blocks: string[] = []
  const starterIds: string[] = []

  for (const stage of ordered) {
    const fragments: string[] = []
    for (const group of stage.optionGroups) {
      const ids = effectiveSelection(stage, group, choices)
      const parts: string[] = []
      for (const id of ids) {
        const option = group.options.find((item) => item.id === id)
        if (!option) continue
        parts.push(option.promptFragment)
        if (option.starterFiles) starterIds.push(...option.starterFiles)
      }
      if (parts.length === 0) continue
      fragments.push(joinFragments(group, parts))
    }
    if (fragments.length === 0) continue

    let block = fillOnce(shell.stage, '{{fragments}}', fragments.join('\n\n'))
    block = fillOnce(block, '{{order}}', String(stage.order))
    block = fillOnce(block, '{{name}}', stage.name)
    blocks.push(block.trimEnd())
  }

  let text = fillOnce(shell.shell, '{{stages}}', blocks.join('\n\n'))
  const seen = new Set<string>()
  const starterFiles: TemplateFile[] = []
  for (const id of starterIds) {
    if (seen.has(id)) continue
    seen.add(id)
    const template = templates.find((item) => item.id === id)
    if (!template) continue
    starterFiles.push(template)
  }

  if (starterFiles.length > 0) {
    const lines = starterFiles.map((template) => template.file).join('\n')
    text = `${text.trimEnd()}\n\n## Starter files\n\n${lines}\n`
  }

  return { text, starterFiles }
}
