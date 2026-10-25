import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import { useStageSelection } from '../composables/useStageSelection'
import { contentState, loadContent } from '../content/catalog'
import { readStages } from '../content/parseContent'
import {
  documentNames,
  moveStageIndex,
  optionGroupGlance,
  stageCardText,
} from '../domain/cheatsheet'
import { cheatsheetShortcuts, matchShortcut } from '../domain/shortcuts'
import router from '../router'
import { helpOpen, toastState } from '../feedback'

const planStage = {
  id: 'plan',
  order: 1,
  name: 'Plan',
  oneLiner: 'Describe the change before any code.',
  goal: 'Give the next agent enough context that it does not guess.',
  keyArtifact: 'intent.md',
  templates: ['intent'],
  optionGroups: [
    {
      id: 'change-type',
      label: 'Change type',
      help: 'What kind of work is this?',
      selection: 'single' as const,
      required: true,
      presentation: 'text' as const,
      defaultOptionIds: [],
      options: [],
    },
    {
      id: 'visual-style',
      label: 'Visual style',
      help: 'Pick a look.',
      selection: 'multi' as const,
      required: false,
      presentation: 'visual' as const,
      defaultOptionIds: [],
      options: [],
    },
  ],
}

describe('cheatsheet overview logic', () => {
  it('moves between cards and stops at the ends', () => {
    expect(moveStageIndex(-1, 6, 'next')).toBe(0)
    expect(moveStageIndex(-1, 6, 'prev')).toBe(5)
    expect(moveStageIndex(0, 6, 'prev')).toBe(0)
    expect(moveStageIndex(5, 6, 'next')).toBe(5)
    expect(moveStageIndex(2, 6, 'first')).toBe(0)
    expect(moveStageIndex(2, 6, 'last')).toBe(5)
    expect(moveStageIndex(0, 0, 'next')).toBe(-1)
  })

  it('names documents and falls back to the id', () => {
    expect(documentNames(['intent', 'missing'], [{ id: 'intent', name: 'Intent' }])).toEqual([
      'Intent',
      'missing',
    ])
    expect(documentNames([], [])).toEqual([])
  })

  it('copies the card as plain text, including purpose, documents, and groups', () => {
    expect(optionGroupGlance(planStage.optionGroups[1]!)).toBe('Visual style (skippable, visual)')
    expect(stageCardText(planStage, ['Intent'])).toBe(
      [
        'Plan',
        '',
        'Describe the change before any code.',
        '',
        'Key artifact: intent.md',
        '',
        'Purpose: Give the next agent enough context that it does not guess.',
        '',
        'Documents: Intent',
        '',
        'Option groups: Change type (required), Visual style (skippable, visual)',
      ].join('\n'),
    )
    expect(stageCardText({ ...planStage, optionGroups: [] }, [])).toContain('Documents: None')
    expect(stageCardText({ ...planStage, optionGroups: [] }, [])).toContain('Option groups: None')
  })

  it('reads purpose, the key artifact, and template ids from a stage payload', () => {
    const { stages, templateIds } = readStages([planStage])
    expect(stages[0]).toMatchObject({
      goal: planStage.goal,
      keyArtifact: 'intent.md',
      templates: ['intent'],
    })
    expect(templateIds).toEqual(['intent'])
  })

  it('rejects a stage that has no purpose', () => {
    const { goal, ...rest } = planStage
    void goal
    expect(() => readStages([rest])).toThrow(/goal/)
  })

  it('matches the cheatsheet keys listed in the overlay', () => {
    expect(matchShortcut('?', 'cheatsheet')).toBe('help')
    expect(matchShortcut('/', 'cheatsheet', true)).toBe('help')
    expect(matchShortcut('j', 'cheatsheet')).toBe('card-next')
    expect(matchShortcut('J', 'cheatsheet')).toBe('card-next')
    expect(matchShortcut('k', 'cheatsheet')).toBe('card-prev')
    expect(matchShortcut('K', 'cheatsheet')).toBe('card-prev')
    expect(matchShortcut('ArrowDown', 'cheatsheet')).toBe('card-next')
    expect(matchShortcut('ArrowUp', 'cheatsheet')).toBe('card-prev')
    expect(matchShortcut('ArrowRight', 'cheatsheet')).toBe('card-next')
    expect(matchShortcut('ArrowLeft', 'cheatsheet')).toBe('card-prev')
    expect(matchShortcut('Enter', 'cheatsheet')).toBe('card-open')
    expect(matchShortcut(' ', 'cheatsheet')).toBe('card-select')
    expect(matchShortcut('Home', 'cheatsheet')).toBe('card-first')
    expect(matchShortcut('End', 'cheatsheet')).toBe('card-last')
    expect(matchShortcut('6', 'cheatsheet')).toBe('stage-6')
    expect(matchShortcut('c', 'cheatsheet')).toBeNull()
    expect(cheatsheetShortcuts.map((entry) => entry.action).join('\n')).toContain(
      'Open the focused stage in the prompt builder',
    )
    expect(cheatsheetShortcuts.map((entry) => entry.keys)).toContain('Arrows, j, k')
  })
})

describe('cheatsheet overview', () => {
  let active: VueWrapper | null = null

  beforeAll(async () => {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
    await loadContent()
  })

  afterEach(() => {
    active?.unmount()
    active = null
  })

  beforeEach(async () => {
    localStorage.clear()
    useStageSelection().selectStage(null)
    helpOpen.value = false
    toastState.value = null
    await router.push('/')
    await router.isReady()
  })

  function mountApp() {
    active = mount(App, { attachTo: document.body, global: { plugins: [router] } })
    return active
  }

  it('renders six stage cards from the loaded content', async () => {
    const wrapper = mountApp()
    await flushPromises()

    const cards = wrapper.findAll('.stage-card')
    expect(cards).toHaveLength(6)
    expect(cards.map((card) => card.get('h2').text())).toEqual([
      'Plan',
      'Design',
      'Build',
      'Test',
      'Deploy',
      'Maintain',
    ])

    const plan = cards[0]!
    expect(plan.text()).toContain(contentState.stages[0]?.goal)
    expect(plan.text()).toContain('intent.md')
    expect(plan.text()).toContain('Intent')
    expect(plan.text()).toContain('Change type')
    expect(plan.text()).toContain('Required')
    expect(plan.get('a').attributes('href')).toMatch(/prompt\/plan/)
    expect(plan.get('a').attributes('aria-label')).toBe('Open Plan in the prompt builder')

    const build = cards[2]!
    expect(build.text()).toContain('None')
    expect(build.text()).toContain('Plan first')

    const design = cards[1]!
    expect(design.text()).toContain('AGENTS.md')
    expect(design.text()).toContain('Docs rule')
    expect(design.text()).toContain('Visual')
  })

  it('moves with j and k and opens the focused stage on Enter', async () => {
    const wrapper = mountApp()
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }))
    await flushPromises()
    expect(useStageSelection().selectedStageId.value).toBe('plan')
    expect(document.activeElement).toBe(wrapper.get('[data-stage-id="plan"]').element)
    expect(wrapper.get('[data-stage-id="plan"]').attributes('data-selected')).toBe('true')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }))
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.get('[data-stage-id="design"]').element)
    expect(useStageSelection().selectedStageId.value).toBe('design')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }))
    await flushPromises()
    expect(useStageSelection().selectedStageId.value).toBe('plan')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await flushPromises()
    expect(useStageSelection().selectedStageId.value).toBe('maintain')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/prompt/maintain')
  })

  it('ignores card shortcuts while a slider is focused', async () => {
    const wrapper = mountApp()
    await flushPromises()
    const slider = wrapper.get('.cheatsheet input[type="range"]').element
    if (!(slider instanceof HTMLInputElement)) throw new Error('Expected a range input.')
    slider.focus()
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }))
    await flushPromises()
    expect(useStageSelection().selectedStageId.value).toBeNull()
  })

  it('shows a tick and a copied toast on double-click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const wrapper = mountApp()
    await flushPromises()
    await wrapper.get('[data-stage-id="plan"]').trigger('dblclick')
    await flushPromises()

    expect(writeText).toHaveBeenCalledOnce()
    const text = String(writeText.mock.calls[0]?.[0])
    expect(text.startsWith('Plan\n\n')).toBe(true)
    expect(text).toContain('Key artifact: intent.md')
    expect(text).toContain('Documents: Intent')
    expect(wrapper.get('[data-stage-id="plan"] .tick').text()).toContain('Copied')
    expect(wrapper.get('.toast').text()).toBe('Copied')
    expect(wrapper.get('.toast').attributes('role')).toBe('status')
  })

  it('shows a red error and no tick when the copy fails', async () => {
    const writeText = vi
      .fn()
      .mockRejectedValue(new DOMException('Write permission denied.', 'NotAllowedError'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const wrapper = mountApp()
    await flushPromises()
    await wrapper.get('[data-stage-id="plan"]').trigger('dblclick')
    await flushPromises()

    const toast = wrapper.get('.toast')
    expect(toast.classes()).toContain('error')
    expect(toast.attributes('role')).toBe('alert')
    expect(toast.text()).toContain('Error')
    expect(toast.text()).toContain('Write permission denied.')
    expect(wrapper.find('[data-stage-id="plan"] .tick').exists()).toBe(false)
  })

  it('remembers the card size and lists the shortcuts in the overlay', async () => {
    const wrapper = mountApp()
    await flushPromises()
    const cardSize = wrapper
      .findAll('.cheatsheet .slider')
      .find((slider) => slider.text().includes('Card size'))
    expect(cardSize).toBeTruthy()
    await cardSize!.get('input').setValue('1.2')
    expect(localStorage.getItem('sdlc.cardScale')).toBe('1.2')
    expect(document.documentElement.style.getPropertyValue('--card-scale')).toBe('1.2')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
    await flushPromises()
    expect(helpOpen.value).toBe(true)
    const dialog = wrapper.get('.shortcut-dialog')
    expect(dialog.text()).toContain('Move between stage cards')
    expect(dialog.text()).toContain('Open the focused stage in the prompt builder')
    expect(dialog.text()).toContain('Copy the stage card')
  })
})
