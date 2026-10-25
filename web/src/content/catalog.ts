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
import type { OptionGroup, PromptOption, PromptShell, Stage, TemplateFile } from '@/domain/types'

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

function normalizeGroup(group: RawGroup): OptionGroup {
  return {
    id: group.id,
    label: group.label,
    help: group.help,
    selection: group.selection,
    required: group.required,
    presentation: group.presentation,
    defaultOptionIds: group.defaultOptionIds ?? [],
    options: group.options ?? [],
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
