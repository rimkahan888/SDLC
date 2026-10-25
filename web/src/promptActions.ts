type PromptAction = 'copy' | 'download' | 'share' | 'reset' | 'toggle-panel'

type Handler = (action: PromptAction) => void

let handler: Handler | null = null

export function registerPromptActions(next: Handler): () => void {
  handler = next
  return () => {
    if (handler === next) handler = null
  }
}

export function runPromptAction(action: string): void {
  if (
    action === 'copy' ||
    action === 'download' ||
    action === 'share' ||
    action === 'reset' ||
    action === 'toggle-panel'
  ) {
    handler?.(action)
  }
}
