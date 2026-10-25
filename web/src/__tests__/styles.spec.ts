import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { contentState, loadContent } from '@/content/catalog'
import { sortStyleIds } from '@/domain/styleOrder'
import { assemblePrompt, visualBlendLead } from '@/domain/assemble'
import { emptyChoices, withSelection } from '@/domain/choices'
import { actionTextColor, mockCssVariables, styleTokenKeys } from '@/domain/styleTokens'

const names: Record<string, string> = {
  minimalism: 'Minimalism',
  maximalism: 'Maximalism',
  futuristic: 'Futuristic',
  'vector-art': 'Vector Art',
  'collage-art': 'Collage Art',
  retro: 'Retro',
  cyberpunk: 'Cyberpunk',
  'pop-art': 'Pop Art',
  glassmorphism: 'Glassmorphism',
  'clay-style': 'Clay Style',
  'pixel-art': 'Pixel Art',
  editorial: 'Editorial',
  y2k: 'Y2K',
  'swiss-design': 'Swiss Design',
  surreal: 'Surreal',
  bohemian: 'Bohemian',
  victorian: 'Victorian',
  graffiti: 'Graffiti',
  aurora: 'Aurora',
  handwritten: 'Handwritten',
}

const glassFragment =
  'Visual style: Glassmorphism. Use translucent panels over a saturated background, with backdrop-filter blur, a hairline light border, and a soft shadow. Keep text readable: meet WCAG 2.2 AA contrast (4.5:1) against the surface the text actually sits on. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html'

beforeAll(async () => {
  await loadContent()
})

describe('style catalog', () => {
  it('loads the twenty styles in catalog order', () => {
    const styles = contentState.styles
    expect(styles.map((style) => style.id)).toEqual(Object.keys(names))
    for (const style of styles) {
      expect(style.name).toBe(names[style.id])
      expect(style.description.trim().length).toBeGreaterThan(0)
      expect(style.bestFor.trim().length).toBeGreaterThan(0)
      expect(style.promptFragment).toContain('Visual style:')
      expect(style.promptFragment).toContain('WCAG 2.2')
      expect(style.promptFragment).not.toContain('{{')
      for (const key of styleTokenKeys) {
        expect(style.tokens[key].trim().length).toBeGreaterThan(0)
      }
      expect(style.tokens.font).not.toContain('url(')
    }
    expect(new Set(styles.map((style) => JSON.stringify(style.tokens))).size).toBe(20)
    expect(styles.find((style) => style.id === 'glassmorphism')?.promptFragment).toBe(glassFragment)
  })

  it('sorts a style that is not in the catalog after the required ids', () => {
    const ids = sortStyleIds(
      ['zeta', 'aurora', 'minimalism'],
      contentState.styles.map((style) => style.id),
    )
    expect(ids[0]).toBe('minimalism')
    expect(ids[ids.length - 1]).toBe('zeta')
    expect(ids.indexOf('aurora')).toBeLessThan(ids.indexOf('zeta'))
  })

  it('expands the design visual group from the style files', () => {
    const styles = contentState.styles
    const design = contentState.stages.find((stage) => stage.id === 'design')
    const group = design?.optionGroups.find((item) => item.id === 'visual-style')
    expect(group?.presentation).toBe('visual')
    expect(group?.selection).toBe('multi')
    expect(group?.optionsFrom).toBeUndefined()
    expect(group?.options.map((option) => option.id)).toEqual(styles.map((style) => style.id))
    const first = group?.options[0]
    expect(first?.detail).toBe(styles[0]?.description)
    expect(first?.promptFragment).toBe(styles[0]?.promptFragment)
    expect(first?.preview?.bestFor).toBe(styles[0]?.bestFor)
    expect(first?.preview?.tokens).toEqual(styles[0]?.tokens)
  })

  it('maps tokens onto the shared mock variables', () => {
    const tokens = contentState.styles[0]?.tokens
    expect(tokens).toBeTruthy()
    if (!tokens) return
    const css = mockCssVariables(tokens)
    expect(css['--mock-bg']).toBe(tokens.background)
    expect(css['--mock-surface']).toBe(tokens.surface)
    expect(css['--mock-text']).toBe(tokens.text)
    expect(css['--mock-muted']).toBe(tokens.muted)
    expect(css['--mock-accent']).toBe(tokens.accent)
    expect(css['--mock-border']).toBe(tokens.border)
    expect(css['--mock-radius']).toBe(tokens.radius)
    expect(css['--mock-shadow']).toBe(tokens.shadow)
    expect(css['--mock-font']).toBe(tokens.font)
    expect(css['--mock-backdrop']).toBe(tokens.backdrop)
    expect(actionTextColor('#ffffff')).toBe('#14120f')
    expect(actionTextColor('#1a1a1a')).toBe('#f7f8fb')
  })

  it('documents the blend sentence the assembler inserts', () => {
    const model = readFileSync(path.resolve(process.cwd(), '../docs/content-model.md'), 'utf8')
    expect(model).toContain(visualBlendLead)
  })

  it('adds the picked styles to the design section, primary first', () => {
    const design = contentState.stages.find((stage) => stage.id === 'design')
    const group = design?.optionGroups.find((item) => item.id === 'visual-style')
    expect(design && group).toBeTruthy()
    if (!design || !group) return
    const editorial = group.options.find((option) => option.id === 'editorial')
    const minimal = group.options.find((option) => option.id === 'minimalism')
    expect(editorial && minimal).toBeTruthy()
    if (!editorial || !minimal) return

    let choices = withSelection(emptyChoices(), design, group, 'editorial')
    choices = withSelection(choices, design, group, 'minimalism')
    expect(choices.selections['design.visual-style']).toEqual(['editorial', 'minimalism'])

    const { text } = assemblePrompt(
      contentState.stages,
      contentState.promptShell,
      { selections: choices.selections, skippedStages: ['plan', 'build', 'test', 'deploy', 'maintain'] },
      contentState.templates,
    )
    expect(text).toContain('## 2. Design')
    expect(text.indexOf(visualBlendLead)).toBeLessThan(text.indexOf(editorial.promptFragment))
    expect(text.indexOf(editorial.promptFragment)).toBeLessThan(text.indexOf(minimal.promptFragment))
    expect(text).not.toContain('Visual style: Cyberpunk')
    expect(text).not.toContain('## 1. Plan')
    expect(text).not.toContain('{{')
  })
})
