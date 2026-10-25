import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from '../App.vue'
import { stages } from '../stages'
import PlaceholderView from '../views/PlaceholderView.vue'
import PromptBuilderView from '../views/PromptBuilderView.vue'

describe('App', () => {
  it('lists the six stages from content', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/', name: 'cheatsheet', component: PlaceholderView },
        { path: '/prompt/:stageId?', name: 'prompt', component: PromptBuilderView },
      ],
    })

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    await router.isReady()

    expect(wrapper.get('h1').text()).toBe('SDLC')
    expect(stages.map((stage) => stage.id)).toEqual([
      'plan',
      'design',
      'build',
      'test',
      'deploy',
      'maintain',
    ])

    const items = wrapper.findAll('ol.stages li')
    expect(items).toHaveLength(6)
    stages.forEach((stage, index) => {
      expect(items[index]?.text()).toContain(stage.name)
      expect(items[index]?.text()).toContain(stage.oneLiner)
    })
  })
})
