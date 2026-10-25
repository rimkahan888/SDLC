import { ref, watch } from 'vue'
import {
  CARD_SCALE_KEY,
  PANEL_RATIO_KEY,
  cardScaleRange,
  panelRatioRange,
  resolveStoredNumber,
} from '@/domain/preferences'
import { reportStorageError } from '@/feedback'

function readStored(key: string, min: number, max: number, fallback: number): number {
  try {
    return resolveStoredNumber(localStorage.getItem(key), min, max, fallback)
  } catch (error) {
    reportStorageError(error)
    return fallback
  }
}

function writeStored(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value))
  } catch (error) {
    reportStorageError(error)
  }
}

export function useLayout() {
  const panelRatio = ref(
    readStored(PANEL_RATIO_KEY, panelRatioRange.min, panelRatioRange.max, panelRatioRange.fallback),
  )
  const cardScale = ref(
    readStored(CARD_SCALE_KEY, cardScaleRange.min, cardScaleRange.max, cardScaleRange.fallback),
  )

  function apply(): void {
    const root = document.documentElement
    root.style.setProperty('--panel-ratio', String(panelRatio.value))
    root.style.setProperty('--card-scale', String(cardScale.value))
  }

  apply()

  watch(panelRatio, (value) => {
    apply()
    writeStored(PANEL_RATIO_KEY, value)
  })
  watch(cardScale, (value) => {
    apply()
    writeStored(CARD_SCALE_KEY, value)
  })

  return { panelRatio, cardScale }
}
