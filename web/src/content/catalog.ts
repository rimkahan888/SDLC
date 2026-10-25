import { reactive } from 'vue'
import { fetchJson, readPrompt, readStages, readStyles, readTemplate } from '@/content/parseContent'
import type { PromptShell, Stage, Style, TemplateFile } from '@/domain/types'
import { showError } from '@/feedback'

export const contentState = reactive({
  stages: [] as Stage[],
  styles: [] as Style[],
  templates: [] as TemplateFile[],
  promptShell: { shell: '', stage: '' } as PromptShell,
  ready: false,
  error: '',
})

let inflight: Promise<void> | null = null

function applyError(error: unknown): void {
  const message = error instanceof Error && error.message ? error.message : 'Content could not be loaded.'
  contentState.error = message
  contentState.ready = false
  showError(new Error(message))
}

async function fetchCatalog(): Promise<void> {
  const [stageValues, styleValues, promptValue] = await Promise.all([
    fetchJson('stages'),
    fetchJson('styles'),
    fetchJson('prompt'),
  ])
  const parsed = readStages(stageValues)
  const templateValues = await Promise.all(parsed.templateIds.map((id) => fetchJson(`templates/${id}`)))
  contentState.stages = parsed.stages
  contentState.styles = readStyles(styleValues)
  contentState.templates = templateValues.map(readTemplate)
  contentState.promptShell = readPrompt(promptValue)
  contentState.error = ''
  contentState.ready = true
}

export function loadContent(): Promise<void> {
  if (contentState.ready) return Promise.resolve()
  if (!inflight) {
    inflight = fetchCatalog().catch((error: unknown) => {
      applyError(error)
      throw error
    })
  }
  return inflight
}

export function resetContentForTests(): void {
  inflight = null
  contentState.stages = []
  contentState.styles = []
  contentState.templates = []
  contentState.promptShell = { shell: '', stage: '' }
  contentState.ready = false
  contentState.error = ''
}

export function stageById(id: string): Stage | undefined {
  return contentState.stages.find((stage) => stage.id === id)
}

export function stageByOrder(order: number): Stage | undefined {
  return contentState.stages.find((stage) => stage.order === order)
}
