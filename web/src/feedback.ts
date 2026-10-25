import { ref } from 'vue'

export type ToastKind = 'ok' | 'error'

export type Toast = {
  id: number
  kind: ToastKind
  message: string
}

export const toastState = ref<Toast | null>(null)
export const helpOpen = ref(false)

let toastTimer = 0
let toastId = 0
let storageErrorShown = false
let lastFocus: HTMLElement | null = null

export function showToast(kind: ToastKind, message: string): void {
  toastId += 1
  toastState.value = { id: toastId, kind, message }
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastState.value = null
  }, 3000)
}

function errorMessage(error: unknown): string {
  if (typeof error === 'string' && error.trim() !== '') return error
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message
    if (typeof message === 'string' && message.trim() !== '') return message
  }
  return ''
}

export function showError(error: unknown): void {
  const message = errorMessage(error)
  showToast('error', message ? `Error: ${message}` : 'Error')
}

export function reportStorageError(error: unknown): void {
  if (storageErrorShown) return
  storageErrorShown = true
  showError(error)
}

export function openHelp(): void {
  lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  helpOpen.value = true
}

export function closeHelp(): void {
  if (!helpOpen.value) return
  helpOpen.value = false
  const previous = lastFocus
  lastFocus = null
  window.setTimeout(() => previous?.focus(), 0)
}

export function toggleHelp(): void {
  if (helpOpen.value) closeHelp()
  else openHelp()
}

export async function writeClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}
