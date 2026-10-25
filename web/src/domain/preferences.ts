export const PANEL_RATIO_KEY = 'sdlc.panelRatio'
export const CARD_SCALE_KEY = 'sdlc.cardScale'

export const panelRatioRange = { min: 0.3, max: 0.7, fallback: 0.5 }
export const cardScaleRange = { min: 0.85, max: 1.25, fallback: 1 }

export function resolveStoredNumber(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (raw === null || raw.trim() === '') return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || value < min || value > max) return fallback
  return value
}
