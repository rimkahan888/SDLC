import type { OptionGroup, PromptChoices, Stage } from './types'

export const PROMPT_STORAGE_KEY = 'sdlc.prompt'

const selectionKeyPattern = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/

export function emptyChoices(): PromptChoices {
  return { selections: {}, skippedStages: [] }
}

export function selectionKey(stageId: string, groupId: string): string {
  return `${stageId}.${groupId}`
}

export function isEmptyChoices(choices: PromptChoices): boolean {
  return choices.skippedStages.length === 0 && Object.keys(choices.selections).length === 0
}

export type ParseResult =
  | { ok: true; value: PromptChoices }
  | { ok: false; message: string }

export function parseChoicesJson(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Invalid JSON'
    return { ok: false, message }
  }
  return parseChoices(raw)
}

export function parseChoices(raw: unknown): ParseResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, message: 'Choices must be an object.' }
  }

  const record = raw as Record<string, unknown>
  if (typeof record.selections !== 'object' || record.selections === null || Array.isArray(record.selections)) {
    return { ok: false, message: 'Choices are missing selections.' }
  }
  if (!Array.isArray(record.skippedStages)) {
    return { ok: false, message: 'Choices are missing skippedStages.' }
  }

  const selections: Record<string, string[]> = {}
  for (const key of Object.keys(record.selections)) {
    if (!selectionKeyPattern.test(key)) {
      return { ok: false, message: `Unknown choice key '${key}'.` }
    }
    const ids = (record.selections as Record<string, unknown>)[key]
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      return { ok: false, message: `Choice '${key}' must be a list of option ids.` }
    }
    selections[key] = [...ids]
  }

  const skippedStages: string[] = []
  for (const id of record.skippedStages) {
    if (typeof id !== 'string' || id.trim() === '') {
      return { ok: false, message: 'skippedStages must be a list of stage ids.' }
    }
    skippedStages.push(id)
  }

  return { ok: true, value: { selections, skippedStages } }
}

export function choicesJson(choices: PromptChoices): string {
  return JSON.stringify({
    selections: choices.selections,
    skippedStages: choices.skippedStages,
  })
}

function knownOptionIds(group: OptionGroup): Set<string> {
  return new Set(group.options.map((option) => option.id))
}

export function normalizeOptionIds(group: OptionGroup, ids: readonly string[]): string[] {
  const known = knownOptionIds(group)
  if (group.selection === 'single') {
    const match = ids.find((id) => known.has(id))
    return match ? [match] : []
  }
  // A visual blend keeps pick order. The first id is the primary style.
  if (group.presentation === 'visual') {
    const ordered: string[] = []
    const seen = new Set<string>()
    for (const id of ids) {
      if (!known.has(id) || seen.has(id)) continue
      seen.add(id)
      ordered.push(id)
    }
    return ordered
  }
  const selected = new Set(ids.filter((id) => known.has(id)))
  return group.options.filter((option) => selected.has(option.id)).map((option) => option.id)
}

export function stageIsSkipped(choices: PromptChoices, stageId: string): boolean {
  return choices.skippedStages.includes(stageId)
}

export function effectiveSelection(stage: Stage, group: OptionGroup, choices: PromptChoices): string[] {
  if (stageIsSkipped(choices, stage.id)) return []
  const key = selectionKey(stage.id, group.id)
  if (Object.prototype.hasOwnProperty.call(choices.selections, key)) {
    return normalizeOptionIds(group, choices.selections[key] ?? [])
  }
  return normalizeOptionIds(group, group.defaultOptionIds)
}

export function openRequiredCount(stages: readonly Stage[], choices: PromptChoices): number {
  let count = 0
  for (const stage of stages) {
    if (stageIsSkipped(choices, stage.id)) continue
    for (const group of stage.optionGroups) {
      if (!group.required) continue
      if (effectiveSelection(stage, group, choices).length === 0) count += 1
    }
  }
  return count
}

export function choicesLeftLabel(count: number): string {
  if (count === 1) return '1 choice left'
  return `${count} choices left`
}

export function withSelection(
  choices: PromptChoices,
  stage: Stage,
  group: OptionGroup,
  optionId: string,
): PromptChoices {
  const key = selectionKey(stage.id, group.id)
  const current = stageIsSkipped(choices, stage.id)
    ? []
    : Object.prototype.hasOwnProperty.call(choices.selections, key)
      ? normalizeOptionIds(group, choices.selections[key] ?? [])
      : normalizeOptionIds(group, group.defaultOptionIds)

  let nextIds: string[]
  if (group.selection === 'single') {
    nextIds = [optionId]
  } else if (current.includes(optionId)) {
    nextIds = current.filter((id) => id !== optionId)
  } else {
    nextIds = normalizeOptionIds(group, [...current, optionId])
  }

  const selections = { ...choices.selections, [key]: nextIds }
  const skippedStages = choices.skippedStages.filter((id) => id !== stage.id)
  return { selections, skippedStages }
}

export function withoutGroup(choices: PromptChoices, stageId: string, groupId: string): PromptChoices {
  const key = selectionKey(stageId, groupId)
  const selections = { ...choices.selections }
  delete selections[key]
  return { selections, skippedStages: [...choices.skippedStages] }
}

export function withStageSkipped(choices: PromptChoices, stageId: string): PromptChoices {
  const prefix = `${stageId}.`
  const selections: Record<string, string[]> = {}
  for (const [key, ids] of Object.entries(choices.selections)) {
    if (!key.startsWith(prefix)) selections[key] = ids
  }
  const skippedStages = choices.skippedStages.includes(stageId)
    ? [...choices.skippedStages]
    : [...choices.skippedStages, stageId]
  return { selections, skippedStages }
}

export function withoutStageSkipped(choices: PromptChoices, stageId: string): PromptChoices {
  return {
    selections: { ...choices.selections },
    skippedStages: choices.skippedStages.filter((id) => id !== stageId),
  }
}
