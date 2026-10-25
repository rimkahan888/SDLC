import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.vue'
import router from '../router'

describe('prompt copy feedback', () => {
  beforeEach(async () => {
    localStorage.clear()
    await router.push('/prompt/plan')
    await router.isReady()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a tick and a toast when the copy succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()
    await wrapper.get('[aria-label="Copy prompt"]').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledOnce()
    expect(wrapper.get('.toast').text()).toBe('Copied')
    expect(wrapper.get('.toast').attributes('role')).toBe('status')
    expect(wrapper.get('.prompt-actions .tick').text()).toContain('Copied')
    wrapper.unmount()
  })

  it('shows a red error and no tick when the clipboard rejects', async () => {
    const writeText = vi
      .fn()
      .mockRejectedValue(new DOMException('Write permission denied.', 'NotAllowedError'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()
    await wrapper.get('[aria-label="Copy prompt"]').trigger('click')
    await flushPromises()

    const toast = wrapper.get('.toast')
    expect(toast.attributes('role')).toBe('alert')
    expect(toast.text()).toContain('Error')
    expect(toast.text()).toContain('Write permission denied.')
    expect(wrapper.find('.prompt-actions .tick').exists()).toBe(false)
    wrapper.unmount()
  })
})
