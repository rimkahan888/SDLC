import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from '../App.vue'
import PlaceholderView from '../views/PlaceholderView.vue'

describe('App', () => {
  it('renders the scaffold placeholder', async () => {
    const router = createRouter({
      history: createWebHashHistory(),
      routes: [{ path: '/', component: PlaceholderView }],
    })

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    await router.isReady()

    expect(wrapper.get('h1').text()).toBe('SDLC')
    expect(wrapper.text()).toContain('Scaffold placeholder.')
  })
})
