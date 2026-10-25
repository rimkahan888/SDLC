import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import TemplateViewer from '../components/TemplateViewer.vue'
import { useStageSelection } from '../composables/useStageSelection'
import { contentState, loadContent } from '../content/catalog'
import { renderTemplateHtml, templateSections } from '../domain/markdown'
import { matchShortcut, templateShortcuts, viewForPath } from '../domain/shortcuts'
import {
  neighborTemplateId,
  templateIdsInOrder,
  templateIndex,
  templateReturn,
} from '../domain/templates'
import type { TemplateFile } from '../domain/types'
import { helpOpen, toastState } from '../feedback'
import router from '../router'

const sample = `# Title

Hello.

## Next

A paragraph.

\`\`\`ts
const n = 1
\`\`\`

After.
`

describe('template markdown', () => {
  it('escapes raw HTML and drops unsafe links', () => {
    const html = renderTemplateHtml(
      '<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n[click](javascript:alert(1))\n\n[Vue](https://vuejs.org/)\n',
    )
    expect(html.toLowerCase()).not.toContain('<script')
    expect(html.toLowerCase()).not.toContain('<img')
    expect(html.toLowerCase()).not.toMatch(/href\s*=\s*["']\s*javascript:/)
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('href="https://vuejs.org/"')
  })

  it('splits sections on headings and keeps code as its own copy target', () => {
    const sections = templateSections(sample)
    expect(sections.map((section) => section.copyText.split('\n')[0])).toEqual(['# Title', '## Next'])
    expect(sections[0]?.copyText).toContain('Hello.')
    expect(sections[0]?.copyText).not.toContain('## Next')
    expect(sections[1]?.copyText).toContain('```ts')
    expect(sections[1]?.copyText).toContain('After.')

    const code = sections[1]?.pieces.find((piece) => piece.kind === 'code')
    expect(code?.copyText).toBe('const n = 1')
    expect(code?.html).toContain('<pre>')
    expect(code?.html.toLowerCase()).not.toContain('<script')
  })

  it('copies fenced code as text and escapes it in the rendered html', () => {
    const sections = templateSections('```html\n<script>alert(1)</script>\n```\n')
    const code = sections[0]?.pieces.find((piece) => piece.kind === 'code')
    expect(code?.copyText).toBe('<script>alert(1)</script>')
    expect(code?.html.toLowerCase()).not.toContain('<script>')
    expect(code?.html).toContain('&lt;script&gt;')
  })

  it('returns no sections for blank markdown', () => {
    expect(templateSections('   \n')).toEqual([])
  })
})

describe('template index', () => {
  const stages = [
    { id: 'build', name: 'Build', order: 3, templates: [] as string[] },
    { id: 'plan', name: 'Plan', order: 1, templates: ['intent'] },
    { id: 'design', name: 'Design', order: 2, templates: ['agents', 'agents'] },
  ]
  const templates = [
    { id: 'intent', name: 'Intent', file: 'templates/intent.md', markdown: '# Intent\n\nA purpose. More.' },
    { id: 'agents', name: 'AGENTS.md', file: 'templates/AGENTS.md', markdown: '# Agents\n\nRules.' },
  ]

  it('groups by stage order and skips an empty stage', () => {
    const groups = templateIndex(stages, templates)
    expect(groups.map((group) => group.stageId)).toEqual(['plan', 'design'])
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['intent'])
    expect(groups[0]?.items[0]?.summary).toBe('A purpose.')
    expect(groups[1]?.items.map((item) => item.name)).toEqual(['AGENTS.md'])
    expect(templateIdsInOrder(groups)).toEqual(['intent', 'agents'])
  })

  it('keeps a missing template id so the index can still link to it', () => {
    const groups = templateIndex(
      [{ id: 'plan', name: 'Plan', order: 1, templates: ['missing'] }],
      [],
    )
    expect(groups[0]?.items[0]).toEqual({ id: 'missing', name: 'missing', file: '', summary: '' })
  })

  it('moves through the index and stops at the ends', () => {
    const ids = ['intent', 'agents', 'docs-rule']
    expect(neighborTemplateId(ids, null, 'next')).toBe('intent')
    expect(neighborTemplateId(ids, 'intent', 'next')).toBe('agents')
    expect(neighborTemplateId(ids, 'docs-rule', 'next')).toBe('docs-rule')
    expect(neighborTemplateId(ids, 'intent', 'prev')).toBe('intent')
    expect(neighborTemplateId(ids, null, 'last')).toBe('docs-rule')
    expect(neighborTemplateId([], null, 'next')).toBeNull()
  })

  it('sends back to the stage, the index, or closed', () => {
    const known = ['plan', 'design']
    expect(
      templateReturn({
        routeName: 'template',
        from: undefined,
        stageQuery: undefined,
        templateStageId: 'plan',
        knownStageIds: known,
      }),
    ).toEqual({ kind: 'stage', stageId: 'plan' })
    expect(
      templateReturn({
        routeName: 'template',
        from: 'index',
        stageQuery: 'design',
        templateStageId: 'plan',
        knownStageIds: known,
      }),
    ).toEqual({ kind: 'index', stageId: 'design' })
    expect(
      templateReturn({
        routeName: 'templates',
        from: undefined,
        stageQuery: 'plan',
        templateStageId: null,
        knownStageIds: known,
      }),
    ).toEqual({ kind: 'stage', stageId: 'plan' })
    expect(
      templateReturn({
        routeName: 'templates',
        from: undefined,
        stageQuery: 'nope',
        templateStageId: null,
        knownStageIds: known,
      }),
    ).toEqual({ kind: 'close' })
    expect(
      templateReturn({
        routeName: 'template',
        from: 'index',
        stageQuery: undefined,
        templateStageId: null,
        knownStageIds: known,
      }),
    ).toEqual({ kind: 'index', stageId: null })
  })
})

describe('template shortcuts', () => {
  it('matches the template keys and leaves the cheatsheet keys alone', () => {
    expect(viewForPath('/templates')).toBe('template')
    expect(viewForPath('/templates/intent')).toBe('template')
    expect(viewForPath('/stages/plan')).toBe('cheatsheet')
    expect(matchShortcut('c', 'template')).toBe('copy')
    expect(matchShortcut('D', 'template')).toBe('download')
    expect(matchShortcut('m', 'template')).toBe('toggle-markdown')
    expect(matchShortcut('j', 'template')).toBe('index-next')
    expect(matchShortcut('k', 'template')).toBe('index-prev')
    expect(matchShortcut('Home', 'template')).toBe('index-first')
    expect(matchShortcut('End', 'template')).toBe('index-last')
    expect(matchShortcut('Enter', 'template')).toBe('index-open')
    expect(matchShortcut('Escape', 'template')).toBe('close')
    expect(matchShortcut('?', 'template')).toBe('help')
    expect(matchShortcut('c', 'cheatsheet')).toBeNull()
    expect(matchShortcut('j', 'cheatsheet')).toBe('card-next')
    expect(templateShortcuts.map((entry) => entry.action).join('\n')).toContain('Toggle rendered or raw markdown')
    expect(templateShortcuts.map((entry) => entry.action).join('\n')).toContain('Copy a section or a code block')
  })
})

describe('template viewer', () => {
  const evil: TemplateFile = {
    id: 'evil',
    name: 'Evil',
    stage: 'plan',
    file: 'templates/evil.md',
    markdown: '<script>alert(1)</script>\n\n# Safe\n\n```html\n<script>alert(2)</script>\n```\n',
  }

  it('renders escaped html and copies a section or a code block', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const wrapper = mount(TemplateViewer, {
      props: { template: evil, raw: false, actionTick: null, backLabel: 'Back to Plan' },
    })
    expect(wrapper.html().toLowerCase()).not.toContain('<script')
    expect(wrapper.text()).toContain('Safe')
    expect(wrapper.find('[aria-label="Download evil.md"]').exists()).toBe(true)

    const section = wrapper.findAll('.md-section').find((item) => item.text().includes('Safe'))
    expect(section).toBeTruthy()
    await section!.trigger('dblclick')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('# Safe'))
    expect(section!.get('.tick').text()).toContain('Copied')
    expect(toastState.value?.message).toBe('Copied')

    const code = wrapper.get('.md-code')
    await code.trigger('dblclick')
    await flushPromises()
    expect(writeText).toHaveBeenLastCalledWith('<script>alert(2)</script>')
    expect(code.get('.tick').text()).toContain('Copied')
    wrapper.unmount()
  })

  it('shows a red error when a section copy fails', async () => {
    const writeText = vi
      .fn()
      .mockRejectedValue(new DOMException('Write permission denied.', 'NotAllowedError'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const wrapper = mount(TemplateViewer, {
      props: { template: evil, raw: true, actionTick: null, backLabel: 'Back to Plan' },
    })
    await wrapper.get('[data-copy="raw"]').trigger('dblclick')
    await flushPromises()
    expect(toastState.value?.kind).toBe('error')
    expect(toastState.value?.message).toContain('Error')
    expect(toastState.value?.message).toContain('Write permission denied.')
    expect(wrapper.find('.tick').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('template routes', () => {
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
    vi.restoreAllMocks()
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

  it('opens a template from the stage detail, toggles raw, and goes back', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:intent')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    let downloadName = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const wrapper = mountApp()
    await flushPromises()

    await wrapper.get('[data-stage-id="plan"]').trigger('click')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.path).toBe('/stages/plan')
    })
    await wrapper.get('[aria-label="All templates"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/templates')
    expect(router.currentRoute.value.query.stage).toBe('plan')
    const index = wrapper.get('[data-template-index]')
    expect(index.text()).toContain('Plan')
    expect(index.text()).toContain('Design')
    expect(index.text()).not.toContain('Build')
    expect(index.find('[data-template-id="intent"]').exists()).toBe(true)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }))
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.get('[data-template-id="intent"]').element)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }))
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.get('[data-template-id="agents"]').element)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }))
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.get('[data-template-id="intent"]').element)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/templates/intent')
    expect(router.currentRoute.value.query.from).toBe('index')

    const view = wrapper.get('[data-template-view]')
    expect(view.text()).toContain('Context')
    expect(view.text()).toContain('Copy this file to intent.md')
    expect(view.html().toLowerCase()).not.toContain('<script')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }))
    await flushPromises()
    expect(wrapper.find('[data-markdown-mode="raw"]').exists()).toBe(true)
    expect(wrapper.get('.template-raw').text()).toContain('## Context')
    await wrapper.get('[aria-label="Show rendered markdown"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-markdown-mode="rendered"]').exists()).toBe(true)

    await wrapper.get('[aria-label="Copy template"]').trigger('click')
    await flushPromises()
    const lastCopy = writeText.mock.calls[writeText.mock.calls.length - 1]
    expect(String(lastCopy?.[0])).toContain('# Intent')
    expect(wrapper.get('[data-template-view] .tick').text()).toContain('Copied')
    expect(wrapper.get('.toast').text()).toBe('Copied')

    await wrapper.get('[aria-label="Download intent.md"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('.toast').text()).toBe('Downloaded')
    expect(downloadName).toBe('intent.md')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/templates/agents')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/templates')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/stages/plan')

    await router.push('/templates/intent')
    await flushPromises()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
    await flushPromises()
    expect(wrapper.get('.shortcut-dialog').text()).toContain('Toggle rendered or raw markdown')
    expect(wrapper.get('.shortcut-dialog').text()).toContain('Move in the template index')
  })

  it('names a missing template', async () => {
    const wrapper = mountApp()
    await flushPromises()
    await router.push('/templates/nope')
    await flushPromises()
    const detail = wrapper.get('[data-region="detail"]')
    expect(detail.text()).toContain('Error')
    expect(detail.text()).toContain("No template with id 'nope'.")
  })
})
