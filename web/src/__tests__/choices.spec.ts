import { beforeAll, describe, expect, it } from 'vitest'
import { contentState, loadContent } from '@/content/catalog'
import {
  choicesJson,
  choicesLeftLabel,
  effectiveSelection,
  emptyChoices,
  parseChoicesJson,
  withSelection,
  withoutGroup,
} from '@/domain/choices'
import { optionCardText } from '@/domain/copyText'
import { resolveStoredNumber } from '@/domain/preferences'
import { matchShortcut, promptShortcuts } from '@/domain/shortcuts'

beforeAll(async () => {
  await loadContent()
})

describe('choices', () => {
  it('round-trips the share payload', () => {
    const choices = {
      selections: { 'plan.change-type': ['feature'] },
      skippedStages: ['maintain'],
    }
    const parsed = parseChoicesJson(choicesJson(choices))
    expect(parsed).toEqual({ ok: true, value: choices })
  })

  it('rejects a shared payload that is not choice JSON', () => {
    const parsed = parseChoicesJson('not-json')
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.message.length).toBeGreaterThan(0)
  })

  it('applies a default only when the stage is not skipped and nothing is stored', () => {
    const build = contentState.stages.find((stage) => stage.id === 'build')
    const group = build?.optionGroups.find((item) => item.id === 'plan-first')
    expect(build).toBeTruthy()
    expect(group).toBeTruthy()
    if (!build || !group) return
    expect(effectiveSelection(build, group, emptyChoices())).toEqual(['accept-plan'])
    const skipped = { selections: {}, skippedStages: ['build'] }
    expect(effectiveSelection(build, group, skipped)).toEqual([])
    const stored = withSelection(emptyChoices(), build, group, 'implement')
    expect(effectiveSelection(build, group, stored)).toEqual(['implement'])
  })

  it('clears a skippable group without removing the stage', () => {
    const plan = contentState.stages.find((stage) => stage.id === 'plan')
    const group = plan?.optionGroups.find((item) => item.id === 'docs')
    expect(plan && group).toBeTruthy()
    if (!plan || !group) return
    const selected = withSelection(emptyChoices(), plan, group, 'vue')
    const cleared = withoutGroup(selected, 'plan', 'docs')
    expect(cleared.selections['plan.docs']).toBeUndefined()
    expect(cleared.skippedStages).toEqual([])
  })

  it('labels the remaining required groups', () => {
    expect(choicesLeftLabel(0)).toBe('0 choices left')
    expect(choicesLeftLabel(1)).toBe('1 choice left')
    expect(choicesLeftLabel(2)).toBe('2 choices left')
  })
})

describe('sliders and shortcuts', () => {
  it('keeps an in-range slider value and rejects anything else', () => {
    expect(resolveStoredNumber('0.5', 0.3, 0.7, 0.5)).toBe(0.5)
    expect(resolveStoredNumber('0.3', 0.3, 0.7, 0.5)).toBe(0.3)
    expect(resolveStoredNumber('0.7', 0.3, 0.7, 0.5)).toBe(0.7)
    expect(resolveStoredNumber('0.2', 0.3, 0.7, 0.5)).toBe(0.5)
    expect(resolveStoredNumber('nope', 0.3, 0.7, 0.5)).toBe(0.5)
    expect(resolveStoredNumber(null, 0.3, 0.7, 0.5)).toBe(0.5)
  })

  it('matches the prompt shortcut keys listed in the overlay', () => {
    expect(matchShortcut('?', 'prompt')).toBe('help')
    expect(matchShortcut('/', 'prompt', true)).toBe('help')
    expect(matchShortcut('/', 'prompt')).toBeNull()
    expect(matchShortcut('Escape', 'prompt')).toBe('close')
    expect(matchShortcut('1', 'prompt')).toBe('stage-1')
    expect(matchShortcut('6', 'prompt')).toBe('stage-6')
    expect(matchShortcut('ArrowLeft', 'prompt')).toBe('option-prev')
    expect(matchShortcut('ArrowDown', 'prompt')).toBe('option-next')
    expect(matchShortcut('Home', 'prompt')).toBe('option-first')
    expect(matchShortcut('End', 'prompt')).toBe('option-last')
    expect(matchShortcut('Enter', 'prompt')).toBe('option-toggle')
    expect(matchShortcut(' ', 'prompt')).toBe('option-toggle')
    expect(matchShortcut('c', 'prompt')).toBe('copy')
    expect(matchShortcut('d', 'prompt')).toBe('download')
    expect(matchShortcut('s', 'prompt')).toBe('share')
    expect(matchShortcut('r', 'prompt')).toBe('reset')
    expect(matchShortcut('p', 'prompt')).toBe('toggle-panel')
    expect(matchShortcut('1', 'cheatsheet')).toBeNull()
    expect(promptShortcuts.map((entry) => entry.keys)).toContain('1–6')
  })

  it('copies an option card as label, blank line, detail', () => {
    expect(optionCardText('Feature', 'Add something to an existing project.')).toBe(
      'Feature\n\nAdd something to an existing project.',
    )
  })
})
