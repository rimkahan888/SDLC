import { styleTokenKeys } from '@/domain/styleTokens'
import type {
  OptionGroup,
  PromptOption,
  PromptShell,
  Stage,
  Style,
  StylePreview,
  StyleTokens,
  TemplateFile,
} from '@/domain/types'

export function contentUrl(resource: string, dev = import.meta.env.DEV, base = import.meta.env.BASE_URL): string {
  if (dev) return `/api/${resource}`
  return `${base}data/${resource}.json`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function expectRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(message)
  return value
}

function expectString(value: unknown, message: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(message)
  return value
}

function expectBoolean(value: unknown, message: string): boolean {
  if (typeof value !== 'boolean') throw new Error(message)
  return value
}

function readTokens(value: unknown, label: string): StyleTokens {
  const record = expectRecord(value, `${label} is missing tokens.`)
  const tokens = {} as StyleTokens
  for (const key of styleTokenKeys) {
    const entry = record[key]
    if (typeof entry !== 'string' || entry.trim() === '') {
      throw new Error(`${label} is missing token '${key}'.`)
    }
    tokens[key] = entry
  }
  return tokens
}

function readPreview(value: unknown, label: string): StylePreview {
  const record = expectRecord(value, `${label} is missing a preview.`)
  return {
    styleId: expectString(record.styleId, `${label} preview is missing styleId.`),
    bestFor: expectString(record.bestFor, `${label} preview is missing bestFor.`),
    tokens: readTokens(record.tokens, `${label} preview`),
  }
}

function readOption(value: unknown, label: string): PromptOption {
  const record = expectRecord(value, `${label} is not an object.`)
  const id = expectString(record.id, `${label} is missing id.`)
  const option: PromptOption = {
    id,
    label: expectString(record.label, `${label} '${id}' is missing label.`),
    detail: expectString(record.detail, `${label} '${id}' is missing detail.`),
    promptFragment: expectString(record.promptFragment, `${label} '${id}' is missing promptFragment.`),
  }
  if (record.starterFiles !== undefined) {
    if (!Array.isArray(record.starterFiles) || record.starterFiles.some((item) => typeof item !== 'string' || item.trim() === '')) {
      throw new Error(`${label} '${id}' starterFiles are invalid.`)
    }
    if (record.starterFiles.length > 0) option.starterFiles = [...record.starterFiles]
  }
  if (record.preview !== undefined) {
    option.preview = readPreview(record.preview, `${label} '${id}'`)
  }
  return option
}

function readGroup(value: unknown, stageId: string): OptionGroup {
  const record = expectRecord(value, `Stage '${stageId}' has an option group that is not an object.`)
  const id = expectString(record.id, `Stage '${stageId}' has an option group missing id.`)
  const label = `Stage '${stageId}' group '${id}'`
  const selection = record.selection
  if (selection !== 'single' && selection !== 'multi') {
    throw new Error(`${label} selection is invalid.`)
  }
  const presentation = record.presentation
  if (presentation !== 'text' && presentation !== 'visual') {
    throw new Error(`${label} presentation is invalid.`)
  }
  if (!Array.isArray(record.options)) throw new Error(`${label} is missing options.`)
  let defaultOptionIds: string[] = []
  if (record.defaultOptionIds !== undefined) {
    if (
      !Array.isArray(record.defaultOptionIds) ||
      record.defaultOptionIds.some((item) => typeof item !== 'string' || item.trim() === '')
    ) {
      throw new Error(`${label} defaultOptionIds are invalid.`)
    }
    defaultOptionIds = [...record.defaultOptionIds]
  }
  const group: OptionGroup = {
    id,
    label: expectString(record.label, `${label} is missing label.`),
    help: expectString(record.help, `${label} is missing help.`),
    selection,
    required: expectBoolean(record.required, `${label} is missing required.`),
    presentation,
    defaultOptionIds,
    options: record.options.map((option, index) => readOption(option, `${label} option ${index}`)),
  }
  if (record.optionsFrom !== undefined) {
    if (record.optionsFrom !== 'styles') throw new Error(`${label} optionsFrom is invalid.`)
    group.optionsFrom = 'styles'
  }
  return group
}

export function readStages(value: unknown): { stages: Stage[]; templateIds: string[] } {
  if (!Array.isArray(value)) throw new Error('Stages response is not an array.')
  const templateIds: string[] = []
  const seen = new Set<string>()
  const stages = value.map((item) => {
    const record = expectRecord(item, 'A stage response is not an object.')
    const id = expectString(record.id, 'A stage is missing id.')
    const order = record.order
    if (typeof order !== 'number' || !Number.isFinite(order)) {
      throw new Error(`Stage '${id}' is missing order.`)
    }
    if (!Array.isArray(record.optionGroups)) throw new Error(`Stage '${id}' is missing option groups.`)
    if (!Array.isArray(record.templates)) throw new Error(`Stage '${id}' is missing templates.`)
    const templates: string[] = []
    for (const templateId of record.templates) {
      if (typeof templateId !== 'string' || templateId.trim() === '') {
        throw new Error(`Stage '${id}' has an empty template id.`)
      }
      templates.push(templateId)
      if (!seen.has(templateId)) {
        seen.add(templateId)
        templateIds.push(templateId)
      }
    }
    const stage: Stage = {
      id,
      order,
      name: expectString(record.name, `Stage '${id}' is missing name.`),
      oneLiner: expectString(record.oneLiner, `Stage '${id}' is missing oneLiner.`),
      goal: expectString(record.goal, `Stage '${id}' is missing goal.`),
      keyArtifact: expectString(record.keyArtifact, `Stage '${id}' is missing keyArtifact.`),
      templates,
      optionGroups: record.optionGroups.map((group) => readGroup(group, id)),
    }
    return stage
  })
  return { stages, templateIds }
}

export function readStyles(value: unknown): Style[] {
  if (!Array.isArray(value)) throw new Error('Styles response is not an array.')
  return value.map((item) => {
    const record = expectRecord(item, 'A style response is not an object.')
    const id = expectString(record.id, 'A style is missing id.')
    return {
      id,
      name: expectString(record.name, `Style '${id}' is missing name.`),
      description: expectString(record.description, `Style '${id}' is missing description.`),
      bestFor: expectString(record.bestFor, `Style '${id}' is missing bestFor.`),
      tokens: readTokens(record.tokens, `Style '${id}'`),
      promptFragment: expectString(record.promptFragment, `Style '${id}' is missing promptFragment.`),
    }
  })
}

export function readTemplate(value: unknown): TemplateFile {
  const record = expectRecord(value, 'Template response is not an object.')
  const id = expectString(record.id, 'Template response is missing id.')
  return {
    id,
    name: expectString(record.name, `Template '${id}' is missing name.`),
    stage: expectString(record.stage, `Template '${id}' is missing stage.`),
    file: expectString(record.file, `Template '${id}' is missing file.`),
    markdown: expectString(record.markdown, `Template '${id}' is missing markdown.`),
  }
}

export function readPrompt(value: unknown): PromptShell {
  const record = expectRecord(value, 'Prompt response is not an object.')
  return {
    shell: expectString(record.shell, 'Prompt response is missing shell.'),
    stage: expectString(record.stage, 'Prompt response is missing stage.'),
  }
}

export async function fetchJson(resource: string): Promise<unknown> {
  const target = contentUrl(resource)
  let response: Response
  try {
    response = await fetch(target)
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'The request failed.'
    throw new Error(`Could not load content from ${target}. ${message}`)
  }
  if (!response.ok) {
    throw new Error(`Could not load content from ${target}. The server returned ${response.status}.`)
  }
  try {
    return await response.json()
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Invalid JSON.'
    throw new Error(`Could not read content from ${target}. ${message}`)
  }
}
