import agentsMeta from '../../../content/templates/agents.json'
import definitionMeta from '../../../content/templates/definition-of-done.json'
import docsRuleMeta from '../../../content/templates/docs-rule.json'
import intentMeta from '../../../content/templates/intent.json'
import maintainMeta from '../../../content/templates/maintain-change-request.json'
import pullRequestMeta from '../../../content/templates/pull-request.json'
import shellText from '../../../content/prompt/shell.md?raw'
import stageText from '../../../content/prompt/stage.md?raw'
import build from '../../../content/stages/build.json'
import deploy from '../../../content/stages/deploy.json'
import design from '../../../content/stages/design.json'
import maintain from '../../../content/stages/maintain.json'
import plan from '../../../content/stages/plan.json'
import test from '../../../content/stages/test.json'
import agentsMd from '../../../templates/AGENTS.md?raw'
import definitionMd from '../../../templates/definition-of-done.md?raw'
import docsRuleMd from '../../../templates/docs-rule-example.md?raw'
import intentMd from '../../../templates/intent.md?raw'
import maintainMd from '../../../templates/maintain-change-request.md?raw'
import pullRequestMd from '../../../templates/pull_request_template.md?raw'
import { styleTokenKeys } from '@/domain/styleTokens'
import type { OptionGroup, PromptOption, PromptShell, Stage, Style, StyleTokens, TemplateFile } from '@/domain/types'

// Temporary read, same as the scaffold placeholder. The API and the static
// export arrive in a later change; until then the builder imports content/.

type RawOption = PromptOption

type RawGroup = {
  id: string
  label: string
  help: string
  selection: 'single' | 'multi'
  required: boolean
  presentation: 'text' | 'visual'
  defaultOptionIds?: string[]
  options?: RawOption[]
  optionsFrom?: 'styles'
}

type RawStage = {
  id: string
  order: number
  name: string
  oneLiner: string
  optionGroups: RawGroup[]
}

type RawTemplate = {
  id: string
  name: string
  stage: string
  file: string
}

const styleModules = import.meta.glob('../../../content/styles/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function readTokens(value: unknown): StyleTokens | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const tokens = {} as StyleTokens
  for (const key of styleTokenKeys) {
    const entry = record[key]
    if (typeof entry !== 'string' || entry.trim() === '') return null
    tokens[key] = entry
  }
  return tokens
}

function readStyle(value: unknown): Style | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const tokens = readTokens(record.tokens)
  if (!tokens) return null
  if (typeof record.id !== 'string' || record.id.trim() === '') return null
  if (typeof record.name !== 'string' || record.name.trim() === '') return null
  if (typeof record.description !== 'string' || record.description.trim() === '') return null
  if (typeof record.bestFor !== 'string' || record.bestFor.trim() === '') return null
  if (typeof record.promptFragment !== 'string' || record.promptFragment.trim() === '') return null
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    bestFor: record.bestFor,
    tokens,
    promptFragment: record.promptFragment,
  }
}

export function sortStyleIds(ids: readonly string[], order: readonly string[]): string[] {
  const rank = new Map(order.map((id, index) => [id, index]))
  return [...ids].sort((left, right) => {
    const leftRank = rank.get(left) ?? Number.MAX_SAFE_INTEGER
    const rightRank = rank.get(right) ?? Number.MAX_SAFE_INTEGER
    if (leftRank !== rightRank) return leftRank - rightRank
    if (left < right) return -1
    if (left > right) return 1
    return 0
  })
}

function readStyleOrder(modules: Record<string, unknown>): string[] {
  for (const [key, value] of Object.entries(modules)) {
    if (key.endsWith('/order.json') && isStringArray(value)) return value
  }
  return []
}

const loadedStyles = new Map<string, Style>()
for (const value of Object.values(styleModules)) {
  const style = readStyle(value)
  if (style) loadedStyles.set(style.id, style)
}

export const styleOrder: readonly string[] = readStyleOrder(styleModules)

export const styles: Style[] = sortStyleIds([...loadedStyles.keys()], styleOrder)
  .map((id) => loadedStyles.get(id))
  .filter((style): style is Style => style !== undefined)

function styleOption(style: Style): PromptOption {
  return {
    id: style.id,
    label: style.name,
    detail: style.description,
    promptFragment: style.promptFragment,
    preview: {
      styleId: style.id,
      bestFor: style.bestFor,
      tokens: style.tokens,
    },
  }
}

function normalizeGroup(group: RawGroup): OptionGroup {
  return {
    id: group.id,
    label: group.label,
    help: group.help,
    selection: group.selection,
    required: group.required,
    presentation: group.presentation,
    defaultOptionIds: group.defaultOptionIds ?? [],
    options: group.optionsFrom === 'styles' ? styles.map(styleOption) : (group.options ?? []),
    optionsFrom: group.optionsFrom,
  }
}

function normalizeStage(raw: RawStage): Stage {
  return {
    id: raw.id,
    order: raw.order,
    name: raw.name,
    oneLiner: raw.oneLiner,
    optionGroups: raw.optionGroups.map(normalizeGroup),
  }
}

const stageFiles = [plan, design, build, test, deploy, maintain] as unknown as RawStage[]

export const stages: Stage[] = stageFiles
  .map(normalizeStage)
  .sort((left, right) => left.order - right.order)

export const promptShell: PromptShell = {
  shell: shellText,
  stage: stageText,
}

function templateFile(meta: RawTemplate, markdown: string): TemplateFile {
  return { ...meta, markdown }
}

export const templates: TemplateFile[] = [
  templateFile(intentMeta, intentMd),
  templateFile(agentsMeta, agentsMd),
  templateFile(docsRuleMeta, docsRuleMd),
  templateFile(definitionMeta, definitionMd),
  templateFile(pullRequestMeta, pullRequestMd),
  templateFile(maintainMeta, maintainMd),
]

export function stageById(id: string): Stage | undefined {
  return stages.find((stage) => stage.id === id)
}

export function stageByOrder(order: number): Stage | undefined {
  return stages.find((stage) => stage.order === order)
}
