import type { StyleTokens } from '@/domain/types'

export const styleTokenKeys = [
  'background',
  'surface',
  'text',
  'muted',
  'accent',
  'border',
  'radius',
  'shadow',
  'font',
  'backdrop',
] as const satisfies readonly (keyof StyleTokens)[]

const tokenVariables: Record<keyof StyleTokens, string> = {
  background: '--mock-bg',
  surface: '--mock-surface',
  text: '--mock-text',
  muted: '--mock-muted',
  accent: '--mock-accent',
  border: '--mock-border',
  radius: '--mock-radius',
  shadow: '--mock-shadow',
  font: '--mock-font',
  backdrop: '--mock-backdrop',
}

const darkInk = '#14120f'
const lightInk = '#f7f8fb'

function channel(value: number): number {
  const scaled = value / 255
  if (scaled <= 0.04045) return scaled / 12.92
  return ((scaled + 0.055) / 1.055) ** 2.4
}

function parseColor(input: string): [number, number, number] | null {
  const text = input.trim()
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text)
  if (hex?.[1]) {
    const body = hex[1].length === 3 ? [...hex[1]].map((item) => item + item).join('') : hex[1]
    return [
      Number.parseInt(body.slice(0, 2), 16),
      Number.parseInt(body.slice(2, 4), 16),
      Number.parseInt(body.slice(4, 6), 16),
    ]
  }

  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(text)
  if (!rgb?.[1] || !rgb[2] || !rgb[3]) return null
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
}

export function actionTextColor(accent: string): string {
  const rgb = parseColor(accent)
  if (!rgb) return darkInk
  const [red, green, blue] = rgb
  const luminance = 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  return luminance > 0.45 ? darkInk : lightInk
}

export function mockCssVariables(tokens: StyleTokens): Record<string, string> {
  const style: Record<string, string> = {}
  for (const key of styleTokenKeys) {
    style[tokenVariables[key]] = tokens[key]
  }
  style['--mock-action-text'] = actionTextColor(tokens.accent)
  return style
}
