export type StyleTokens = {
  background: string
  surface: string
  text: string
  muted: string
  accent: string
  border: string
  radius: string
  shadow: string
  font: string
  backdrop: string
}

export type StylePreview = {
  styleId: string
  bestFor: string
  tokens: StyleTokens
}

export type Style = {
  id: string
  name: string
  description: string
  bestFor: string
  tokens: StyleTokens
  promptFragment: string
}

export type PromptOption = {
  id: string
  label: string
  detail: string
  promptFragment: string
  starterFiles?: string[]
  preview?: StylePreview
}

export type OptionGroup = {
  id: string
  label: string
  help: string
  selection: 'single' | 'multi'
  required: boolean
  presentation: 'text' | 'visual'
  defaultOptionIds: string[]
  options: PromptOption[]
  optionsFrom?: 'styles'
}

export type Stage = {
  id: string
  order: number
  name: string
  oneLiner: string
  optionGroups: OptionGroup[]
}

export type TemplateFile = {
  id: string
  name: string
  stage: string
  file: string
  markdown: string
}

export type PromptShell = {
  shell: string
  stage: string
}

export type PromptChoices = {
  selections: Record<string, string[]>
  skippedStages: string[]
}

export type AssembledPrompt = {
  text: string
  starterFiles: TemplateFile[]
}
