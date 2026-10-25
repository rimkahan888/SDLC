import { describe, expect, it } from 'vitest'
import { contentUrl } from '@/content/parseContent'

describe('contentUrl', () => {
  it('uses the API in dev and the exported JSON on Pages', () => {
    expect(contentUrl('stages', true, '/')).toBe('/api/stages')
    expect(contentUrl('templates/intent', true, '/')).toBe('/api/templates/intent')
    expect(contentUrl('styles', true, '/')).toBe('/api/styles')
    expect(contentUrl('prompt', true, '/')).toBe('/api/prompt')
    expect(contentUrl('stages', false, '/SDLC/')).toBe('/SDLC/data/stages.json')
    expect(contentUrl('stages/plan', false, '/SDLC/')).toBe('/SDLC/data/stages/plan.json')
    expect(contentUrl('templates/intent', false, '/SDLC/')).toBe('/SDLC/data/templates/intent.json')
    expect(contentUrl('styles', false, '/SDLC/')).toBe('/SDLC/data/styles.json')
    expect(contentUrl('prompt', false, '/SDLC/')).toBe('/SDLC/data/prompt.json')
  })
})
