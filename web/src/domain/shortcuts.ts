export type AppView = 'prompt' | 'cheatsheet' | 'template'

export type ShortcutAction =
  | 'help'
  | 'close'
  | 'copy'
  | 'download'
  | 'share'
  | 'reset'
  | 'toggle-panel'
  | 'toggle-markdown'
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
  | 'panel-open'
  | 'panel-prev'
  | 'panel-next'
  | 'index-prev'
  | 'index-next'
  | 'index-first'
  | 'index-last'
  | 'index-open'
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

export const templateShortcuts: readonly ShortcutEntry[] = [
  { keys: '?', action: 'Toggle the shortcut list' },
  { keys: 'Esc', action: 'Back, or close the template index' },
  { keys: 'C', action: 'Copy the template' },
  { keys: 'D', action: 'Download the template' },
  { keys: 'M', action: 'Toggle rendered or raw markdown' },
  { keys: 'j, k', action: 'Move in the template index' },
  { keys: 'Enter', action: 'Open the focused template' },
  { keys: 'Home / End', action: 'First or last template' },
  { keys: 'Double-click', action: 'Copy a section or a code block' },
]

export const cheatsheetShortcuts: readonly ShortcutEntry[] = [
  { keys: '?', action: 'Toggle the shortcut list' },
  { keys: 'Esc', action: 'Close the shortcut list, or the stage detail' },
  { keys: '1–6', action: 'Focus that stage' },
  { keys: 'Arrows, j, k', action: 'Move between stage cards' },
  { keys: 'Enter or Space', action: 'Open the stage detail' },
  { keys: 'O', action: 'Open the focused stage in the prompt builder' },
  { keys: '[ ]', action: 'Previous or next stage in the detail panel' },
  { keys: 'Arrows on a tab', action: 'Move between detail tabs' },
  { keys: 'Home / End', action: 'First or last stage' },
  { keys: 'Double-click', action: 'Copy the stage card or a detail item' },
]

export function shortcutsFor(view: AppView): readonly ShortcutEntry[] {
  if (view === 'prompt') return promptShortcuts
  if (view === 'template') return templateShortcuts
  return cheatsheetShortcuts
}

export function viewForPath(path: string): AppView {
  if (path.startsWith('/prompt')) return 'prompt'
  if (path.startsWith('/templates')) return 'template'
  return 'cheatsheet'
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}

function matchTemplate(key: string): ShortcutAction | null {
  if (key === 'c' || key === 'C') return 'copy'
  if (key === 'd' || key === 'D') return 'download'
  if (key === 'm' || key === 'M') return 'toggle-markdown'
  if (key === 'j' || key === 'J') return 'index-next'
  if (key === 'k' || key === 'K') return 'index-prev'
  if (key === 'Home') return 'index-first'
  if (key === 'End') return 'index-last'
  if (key === 'Enter') return 'index-open'
  return null
}

function matchCheatsheet(key: string): ShortcutAction | null {
  if (/^[1-6]$/.test(key)) return `stage-${Number(key)}`
  if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'k' || key === 'K') return 'card-prev'
  if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'j' || key === 'J') return 'card-next'
  if (key === 'Home') return 'card-first'
  if (key === 'End') return 'card-last'
  if (key === 'Enter' || key === ' ') return 'panel-open'
  if (key === 'o' || key === 'O') return 'card-open'
  if (key === '[') return 'panel-prev'
  if (key === ']') return 'panel-next'
  return null
}

export function matchShortcut(key: string, view: AppView, shiftKey = false): ShortcutAction | null {
  // Some layouts report Shift+/ as "/" with shift held. The overlay key is "?".
  if (key === '?' || (shiftKey && key === '/')) return 'help'
  if (key === 'Escape') return 'close'
  if (view === 'cheatsheet') return matchCheatsheet(key)
  if (view === 'template') return matchTemplate(key)

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
