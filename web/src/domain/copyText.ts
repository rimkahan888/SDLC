export function optionCardText(label: string, detail: string): string {
  return `${label}\n\n${detail}`
}

export const PROMPT_DOWNLOAD_NAME = 'sdlc-prompt.md'

export function templateDownloadName(id: string): string {
  return `${id}.md`
}
