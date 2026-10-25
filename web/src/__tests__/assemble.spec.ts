import { beforeAll, describe, expect, it } from 'vitest'
import { contentState, loadContent } from '@/content/catalog'
import { assemblePrompt, visualBlendLead } from '@/domain/assemble'
import { emptyChoices, openRequiredCount, withStageSkipped } from '@/domain/choices'
import type { PromptChoices, PromptShell, Stage } from '@/domain/types'

const shell: PromptShell = {
  shell:
    'You are an agent working in this repository. Follow the decisions below. Read the named docs and any starter files before you write code.\n\n{{stages}}\n\nWhen you are unsure, stop and ask. Use the official documentation named above.',
  stage: '## {{order}}. {{name}}\n\n{{fragments}}',
}

const glassFragment =
  'Visual style: Glassmorphism. Use translucent panels over a saturated background, with backdrop-filter blur, a hairline light border, and a soft shadow. Keep text readable: meet WCAG 2.2 AA contrast (4.5:1) against the surface the text actually sits on. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html'

const swissFragment = 'Visual style: Swiss Design. Use a grid, strong type, and almost no decoration.'

function fixtureStages(): Stage[] {
  return [
    {
      id: 'plan',
      order: 1,
      name: 'Plan',
      oneLiner: 'Plan the change.',
      optionGroups: [
        {
          id: 'change-type',
          label: 'Change type',
          help: 'What kind of work is this?',
          selection: 'single',
          required: true,
          presentation: 'text',
          defaultOptionIds: [],
          options: [
            {
              id: 'feature',
              label: 'Feature',
              detail: 'Add something to an existing project.',
              promptFragment:
                'This is a feature on an existing project. Read the repository before proposing files. Keep the change inside the current architecture.',
            },
          ],
        },
        {
          id: 'docs',
          label: 'Official docs to include',
          help: 'Skip this when you will paste the links yourself.',
          selection: 'multi',
          required: false,
          presentation: 'text',
          defaultOptionIds: [],
          options: [
            {
              id: 'vue',
              label: 'Vue',
              detail: 'Vue 3 guide.',
              promptFragment: 'Official docs: Vue — https://vuejs.org/guide/introduction.html',
            },
            {
              id: 'playwright',
              label: 'Playwright',
              detail: 'End-to-end tests.',
              promptFragment: 'Official docs: Playwright — https://playwright.dev/docs/intro',
            },
          ],
        },
      ],
    },
    {
      id: 'design',
      order: 2,
      name: 'Design',
      oneLiner: 'Write the specs.',
      optionGroups: [
        {
          id: 'visual-style',
          label: 'Visual style',
          help: 'Pick one or more looks.',
          selection: 'multi',
          required: false,
          presentation: 'visual',
          defaultOptionIds: [],
          optionsFrom: 'styles',
          options: [
            {
              id: 'glassmorphism',
              label: 'Glassmorphism',
              detail: 'Translucent panels.',
              promptFragment: glassFragment,
            },
            {
              id: 'swiss-design',
              label: 'Swiss Design',
              detail: 'A grid and strong type.',
              promptFragment: swissFragment,
            },
          ],
        },
      ],
    },
    {
      id: 'test',
      order: 4,
      name: 'Test',
      oneLiner: 'Define done as checks.',
      optionGroups: [
        {
          id: 'checks',
          label: 'Done-checks',
          help: 'Pick every check this change has to meet.',
          selection: 'multi',
          required: true,
          presentation: 'text',
          defaultOptionIds: [],
          options: [
            {
              id: 'layout-540',
              label: '540px layout',
              detail: 'Side-panel width.',
              promptFragment:
                'Done check: at 540px wide there is no horizontal scrolling, and the detail region is a bottom sheet at half the viewport by default.',
            },
          ],
        },
      ],
    },
  ]
}

beforeAll(async () => {
  await loadContent()
})

describe('assemblePrompt', () => {
  it('matches the documented sample', () => {
    const choices: PromptChoices = {
      selections: {
        'plan.change-type': ['feature'],
        'plan.docs': ['vue'],
        'design.visual-style': ['glassmorphism'],
        'test.checks': ['layout-540'],
      },
      skippedStages: [],
    }

    const { text } = assemblePrompt(fixtureStages(), shell, choices, [])

    expect(text).toBe(`You are an agent working in this repository. Follow the decisions below. Read the named docs and any starter files before you write code.

## 1. Plan

This is a feature on an existing project. Read the repository before proposing files. Keep the change inside the current architecture.

Official docs: Vue — https://vuejs.org/guide/introduction.html

## 2. Design

${glassFragment}

## 4. Test

Done check: at 540px wide there is no horizontal scrolling, and the detail region is a bottom sheet at half the viewport by default.

When you are unsure, stop and ask. Use the official documentation named above.`)
  })

  it('keeps multi-select fragments in option order and ignores other styles', () => {
    const choices: PromptChoices = {
      selections: {
        'plan.docs': ['playwright', 'vue'],
        'design.visual-style': ['glassmorphism'],
      },
      skippedStages: [],
    }
    const { text } = assemblePrompt(fixtureStages(), shell, choices, [])
    const vue = text.indexOf('Official docs: Vue')
    const playwright = text.indexOf('Official docs: Playwright')
    expect(vue).toBeGreaterThan(-1)
    expect(playwright).toBeGreaterThan(vue)
    expect(text).toContain(glassFragment)
    expect(text).not.toContain(swissFragment)
    expect(text).not.toContain('{{')
  })

  it('blends visual styles in pick order and leaves a single style unmarked', () => {
    const blended: PromptChoices = {
      selections: {
        'design.visual-style': ['swiss-design', 'glassmorphism'],
      },
      skippedStages: [],
    }
    const { text } = assemblePrompt(fixtureStages(), shell, blended, [])
    expect(text).toContain(visualBlendLead)
    expect(text.indexOf(swissFragment)).toBeLessThan(text.indexOf(glassFragment))
    expect(text.indexOf(visualBlendLead)).toBeLessThan(text.indexOf(swissFragment))

    const single: PromptChoices = {
      selections: { 'design.visual-style': ['glassmorphism'] },
      skippedStages: [],
    }
    const alone = assemblePrompt(fixtureStages(), shell, single, []).text
    expect(alone).toContain(glassFragment)
    expect(alone).not.toContain(visualBlendLead)
    expect(alone).not.toContain(swissFragment)
  })

  it('omits a skipped stage and keeps the remaining stage numbers', () => {
    const choices = withStageSkipped(
      {
        selections: {
          'plan.change-type': ['feature'],
          'design.visual-style': ['glassmorphism'],
          'test.checks': ['layout-540'],
        },
        skippedStages: [],
      },
      'design',
    )
    const { text } = assemblePrompt(fixtureStages(), shell, choices, [])
    expect(text).not.toContain('## 2. Design')
    expect(text).not.toContain('Glassmorphism')
    expect(text).toContain('## 1. Plan')
    expect(text).toContain('## 4. Test')
  })

  it('walks the six content stages in order and names starter files once', () => {
    const choices: PromptChoices = {
      selections: {
        'plan.change-type': ['new-app'],
        'plan.docs': ['vue'],
        'design.stack': ['vue-csharp'],
        'design.agents': ['generate'],
        'test.checks': ['layout-540', 'a11y'],
        'test.test-types': ['e2e'],
        'deploy.ci': ['actions'],
      },
      skippedStages: [],
    }
    const { text, starterFiles } = assemblePrompt(
      contentState.stages,
      contentState.promptShell,
      choices,
      contentState.templates,
    )
    const headings = [...text.matchAll(/^## (\d+)\. (.+)$/gm)].map((match) => `${match[1]} ${match[2]}`)
    expect(headings).toEqual([
      '1 Plan',
      '2 Design',
      '3 Build',
      '4 Test',
      '5 Deploy',
      '6 Maintain',
    ])
    expect(text).toContain('This is a new app.')
    expect(text).toContain('Official docs: Vue — https://vuejs.org/guide/introduction.html')
    expect(text.indexOf('540px')).toBeLessThan(text.indexOf('WCAG 2.2 AA contrast'))
    expect(starterFiles.map((file) => file.file)).toEqual([
      'templates/intent.md',
      'templates/AGENTS.md',
      'templates/pull_request_template.md',
      'templates/maintain-change-request.md',
    ])
    expect(text).toContain('## Starter files\n\ntemplates/intent.md\n')
    expect(text).not.toContain('{{')
  })

  it('uses defaults for an empty choice set and leaves required groups open', () => {
    const { text } = assemblePrompt(
      contentState.stages,
      contentState.promptShell,
      emptyChoices(),
      contentState.templates,
    )
    expect(text).not.toContain('## 1. Plan')
    expect(text).not.toContain('## 2. Design')
    expect(text).toContain('## 3. Build')
    expect(text).toContain('## 5. Deploy')
    expect(text).toContain('## 6. Maintain')
    expect(openRequiredCount(contentState.stages, emptyChoices())).toBe(4)
  })
})
