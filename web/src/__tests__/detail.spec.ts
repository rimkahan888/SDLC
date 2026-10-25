import { describe, expect, it } from 'vitest'
import { readStages } from '@/content/parseContent'
import {
  activeDetailTab,
  artifactCopyText,
  detailTabs,
  documentCopyText,
  groupCopyText,
  groupFlags,
  optionCopyText,
  stageDocuments,
  stepCopyText,
  templateSummary,
} from '@/domain/detail'
import type { OptionGroup } from '@/domain/types'

const comment = `<!--
Copy this file to AGENTS.md at the repository root and fill it in.
A new agent reads that copy and the intent, and nothing else, on its first turn.
-->

# AGENTS.md

Standing rules.`

describe('stage detail text', () => {
  it('takes the first sentence and keeps dots inside filenames', () => {
    expect(templateSummary(comment)).toBe('Copy this file to AGENTS.md at the repository root and fill it in.')
    expect(templateSummary('# Title\n\nA short purpose. More after.')).toBe('A short purpose.')
    expect(templateSummary('   ')).toBe('')
  })

  it('names documents from the template index and falls back to the id', () => {
    const documents = stageDocuments(
      ['agents', 'missing'],
      [{ id: 'agents', name: 'AGENTS.md', file: 'templates/AGENTS.md', markdown: comment }],
    )
    expect(documents[0]).toMatchObject({
      id: 'agents',
      name: 'AGENTS.md',
      file: 'templates/AGENTS.md',
    })
    expect(documents[0]?.summary).toContain('AGENTS.md')
    expect(documents[1]).toEqual({ id: 'missing', name: 'missing', summary: '', file: '' })
    expect(documentCopyText(documents[0]!)).toBe(
      'AGENTS.md\n\nCopy this file to AGENTS.md at the repository root and fill it in.',
    )
    expect(documentCopyText(documents[1]!)).toBe('missing')
  })

  it('copies a step, an artifact, and an option as plain text', () => {
    expect(stepCopyText({ title: 'Describe the change', text: 'Write what is changing.' })).toBe(
      'Describe the change\n\nWrite what is changing.',
    )
    expect(artifactCopyText('intent.md')).toBe('Key artifact: intent.md')
    expect(optionCopyText('Feature', 'Add something to an existing project.')).toBe(
      'Feature\n\nAdd something to an existing project.',
    )
  })

  it('explains an option group, including each option', () => {
    const group: OptionGroup = {
      id: 'visual-style',
      label: 'Visual style',
      help: 'Pick one or more looks.',
      selection: 'multi',
      required: false,
      presentation: 'visual',
      defaultOptionIds: [],
      options: [
        { id: 'glass', label: 'Glassmorphism', detail: 'Translucent panels.', promptFragment: 'ignored' },
      ],
    }
    expect(groupFlags(group)).toBe('Any number · Skippable · Visual')
    expect(groupCopyText(group)).toBe(
      ['Visual style', '', 'Pick one or more looks.', '', 'Any number · Skippable · Visual', '', 'Glassmorphism', 'Translucent panels.'].join(
        '\n',
      ),
    )
    expect(groupCopyText(group)).not.toContain('ignored')
  })

  it('lists the tabs the stage actually has', () => {
    const full = {
      steps: [{ id: 'a' }],
      doneChecks: [{ id: 'b' }],
      pitfalls: [{ id: 'c' }],
      optionGroups: [{ id: 'd' }],
    }
    expect(detailTabs(full)).toEqual(['steps', 'done', 'pitfalls', 'documents', 'options'])
    expect(detailTabs({ ...full, pitfalls: [], optionGroups: [] })).toEqual(['steps', 'done', 'documents'])
    expect(activeDetailTab('pitfalls', ['steps', 'documents'])).toBe('steps')
    expect(activeDetailTab('steps', ['steps', 'documents'], 'documents')).toBe('documents')
    expect(activeDetailTab('steps', ['steps', 'documents'])).toBe('steps')
  })

  it('reads steps, done-checks, and pitfalls from a stage payload', () => {
    const { stages } = readStages([
      {
        id: 'plan',
        order: 1,
        name: 'Plan',
        oneLiner: 'Describe the change.',
        goal: 'Give the next agent enough context.',
        keyArtifact: 'intent.md',
        templates: [],
        steps: [{ id: 'describe', title: 'Describe the change', text: 'Write what is changing.' }],
        doneChecks: [{ id: 'answers', text: 'intent.md says what done means.' }],
        pitfalls: [],
        quotes: [{ text: 'Paste the link.', source: 'Notes' }],
        optionGroups: [],
      },
    ])
    expect(stages[0]?.steps).toEqual([
      { id: 'describe', title: 'Describe the change', text: 'Write what is changing.' },
    ])
    expect(stages[0]?.doneChecks[0]?.text).toBe('intent.md says what done means.')
    expect(stages[0]?.pitfalls).toEqual([])
    expect(stages[0]?.quotes).toEqual([{ text: 'Paste the link.', source: 'Notes' }])
  })

  it('rejects a step that has no title', () => {
    expect(() =>
      readStages([
        {
          id: 'plan',
          order: 1,
          name: 'Plan',
          oneLiner: 'Describe the change.',
          goal: 'Give the next agent enough context.',
          keyArtifact: 'intent.md',
          templates: [],
          steps: [{ id: 'describe', text: 'Write what is changing.' }],
          optionGroups: [],
        },
      ]),
    ).toThrow(/title/)
  })
})
