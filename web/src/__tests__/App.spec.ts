import { flushPromises, mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it } from 'vitest'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from '../App.vue'
import { contentState, loadContent, resetContentForTests } from '../content/catalog'
import PlaceholderView from '../views/PlaceholderView.vue'
import PromptBuilderView from '../views/PromptBuilderView.vue'

function router() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', name: 'cheatsheet', component: PlaceholderView },
      { path: '/prompt/:stageId?', name: 'prompt', component: PromptBuilderView },
    ],
  })
}

describe('App', () => {
  beforeAll(async () => {
    await loadContent()
  })

  it('lists the six stages from content', async () => {
    const history = router()
    const wrapper = mount(App, {
      global: {
        plugins: [history],
      },
    })

    await history.isReady()
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('SDLC')
    expect(contentState.stages.map((stage) => stage.id)).toEqual([
      'plan',
      'design',
      'build',
      'test',
      'deploy',
      'maintain',
    ])

    const items = wrapper.findAll('ol.stages li')
    expect(items).toHaveLength(6)
    contentState.stages.forEach((stage, index) => {
      expect(items[index]?.text()).toContain(stage.name)
      expect(items[index]?.text()).toContain(stage.oneLiner)
    })
  })

  it('shows a red error when content cannot be loaded', async () => {
    resetContentForTests()
    const saved = globalThis.fetch
    globalThis.fetch = () => Promise.reject(new TypeError('Failed to fetch'))
    try {
      const history = router()
      const wrapper = mount(App, {
        global: {
          plugins: [history],
        },
      })
      await history.isReady()
      await flushPromises()
      const alert = wrapper.get('.error-text')
      expect(alert.attributes('role')).toBe('alert')
      expect(alert.text()).toContain('Error:')
      expect(alert.text()).toContain('Failed to fetch')
      expect(wrapper.get('.toast').text()).toContain('Error:')
      expect(wrapper.get('.toast').text()).toContain('Failed to fetch')
    } finally {
      globalThis.fetch = saved
      resetContentForTests()
    }
  })
})
