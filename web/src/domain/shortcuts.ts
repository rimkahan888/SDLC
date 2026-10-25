export type AppView = 'prompt' | 'cheatsheet'

export type ShortcutAction =
  | 'help'
  | 'close'
  | 'copy'
  | 'download'
  | 'share'
  | 'reset'
  | 'toggle-panel'
  | 'option-prev'
  | 'option-next'
  | 'option-first'
  | 'option-last'
  | 'option-toggle'
  | 'card-prev'
  | 'card-next'
  | 'card-first'
  | 'card-last'
  | 'card-open'
  | 'card-select'
  | `stage-${number}`

export type ShortcutEntry = {
  keys: string
  action: string
}

export const promptShortcuts: readonly ShortcutEntry[] = [
  { keys: '?', action: 'Toggle the shortcut list' },
  { keys: 'Esc', action: 'Close the shortcut list' },
  { keys: '1–6', action: 'Open that stage' },
  { keys: 'Arrow keys', action: 'Move between options in the focused group' },
  { keys: 'Enter or Space', action: 'Select the focused option' },
  { keys: 'Double-click', action: 'Copy the style description' },
  { keys: 'Home / End', action: 'First or last option in the group' },
  { keys: 'C', action: 'Copy the prompt' },
  { keys: 'D', action: 'Download the prompt' },
  { keys: 'S', action: 'Share the link' },
  { keys: 'R', action: 'Reset choices' },
  { keys: 'P', action: 'Toggle the prompt panel' },
]

export const cheatsheetShortcuts: readonly ShortcutEntry[] = [
  { keys: '?', action: 'Toggle the shortcut list' },
  { keys: 'Esc', action: 'Close the shortcut list' },
  { keys: '1–6', action: 'Focus that stage' },
  { keys: 'Arrows, j, k', action: 'Move between stage cards' },
  { keys: 'Enter', action: 'Open the focused stage in the prompt builder' },
  { keys: 'Space', action: 'Select the focused stage' },
  { keys: 'Home / End', action: 'First or last stage' },
  { keys: 'Double-click', action: 'Copy the stage card' },
]

export function shortcutsFor(view: AppView): readonly ShortcutEntry[] {
  return view === 'prompt' ? promptShortcuts : cheatsheetShortcuts
}

export function viewForPath(path: string): AppView {
  return path.startsWith('/prompt') ? 'prompt' : 'cheatsheet'
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}

function matchCheatsheet(key: string): ShortcutAction | null {
  if (/^[1-6]$/.test(key)) return `stage-${Number(key)}`
  if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'k' || key === 'K') return 'card-prev'
  if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'j' || key === 'J') return 'card-next'
  if (key === 'Home') return 'card-first'
  if (key === 'End') return 'card-last'
  if (key === 'Enter') return 'card-open'
  if (key === ' ') return 'card-select'
  return null
}

export function matchShortcut(key: string, view: AppView, shiftKey = false): ShortcutAction | null {
  // Some layouts report Shift+/ as "/" with shift held. The overlay key is "?".
  if (key === '?' || (shiftKey && key === '/')) return 'help'
  if (key === 'Escape') return 'close'
  if (view === 'cheatsheet') return matchCheatsheet(key)

  if (/^[1-6]$/.test(key)) return `stage-${Number(key)}`
  if (key === 'ArrowLeft' || key === 'ArrowUp') return 'option-prev'
  if (key === 'ArrowRight' || key === 'ArrowDown') return 'option-next'
  if (key === 'Home') return 'option-first'
  if (key === 'End') return 'option-last'
  if (key === 'Enter' || key === ' ') return 'option-toggle'
  if (key === 'c' || key === 'C') return 'copy'
  if (key === 'd' || key === 'D') return 'download'
  if (key === 's' || key === 'S') return 'share'
  if (key === 'r' || key === 'R') return 'reset'
  if (key === 'p' || key === 'P') return 'toggle-panel'
  return null
}
