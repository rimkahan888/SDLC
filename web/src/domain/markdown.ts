import MarkdownIt, { type Token } from 'markdown-it'

// Render template markdown with raw HTML disabled.
// https://markdown-it.github.io/
const markdown = new MarkdownIt({
  html: false,
  xhtmlOut: false,
  breaks: false,
  linkify: false,
  typographer: false,
})

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

markdown.renderer.rules.html_block = (tokens, index) => escapeHtml(tokens[index]?.content ?? '')
markdown.renderer.rules.html_inline = (tokens, index) => escapeHtml(tokens[index]?.content ?? '')

const blockedProtocol = /^(?:javascript|vbscript|file|data):/i

markdown.validateLink = (url: string) => {
  const compact = url.trim().toLowerCase().replace(/[\u0000-\u0020]+/g, '')
  if (compact === '') return false
  return !blockedProtocol.test(compact)
}

export type TemplatePiece = {
  id: string
  kind: 'prose' | 'code'
  html: string
  copyText: string
}

export type TemplateSection = {
  id: string
  copyText: string
  pieces: TemplatePiece[]
}

function renderTokens(tokens: Token[]): string {
  if (tokens.length === 0) return ''
  return markdown.renderer.render(tokens, markdown.options, {})
}

function codeText(content: string): string {
  return content.endsWith('\n') ? content.slice(0, -1) : content
}

function piecesFor(tokens: Token[], sectionIndex: number): TemplatePiece[] {
  const pieces: TemplatePiece[] = []
  let prose: Token[] = []

  function flushProse(): void {
    if (prose.length === 0) return
    const html = renderTokens(prose)
    prose = []
    if (html.trim() === '') return
    pieces.push({
      id: `section-${sectionIndex}-prose-${pieces.length}`,
      kind: 'prose',
      html,
      copyText: '',
    })
  }

  tokens.forEach((token, tokenIndex) => {
    if (token.type === 'fence' || token.type === 'code_block') {
      flushProse()
      pieces.push({
        id: `section-${sectionIndex}-code-${tokenIndex}`,
        kind: 'code',
        html: renderTokens([token]),
        copyText: codeText(token.content),
      })
      return
    }
    prose.push(token)
  })
  flushProse()
  return pieces
}

export function renderTemplateHtml(source: string): string {
  return markdown.render(source)
}

/** Split a template into heading sections. A code fence stays its own copy target. */
export function templateSections(source: string): TemplateSection[] {
  if (source.trim() === '') return []
  const tokens = markdown.parse(source, {})
  const lines = source.split('\n')
  const blocks: { start: number; tokens: Token[] }[] = []
  let current: Token[] = []
  let start = 0

  for (const token of tokens) {
    if (token.type === 'heading_open' && current.length > 0) {
      blocks.push({ start, tokens: current })
      current = []
      start = token.map?.[0] ?? start
    } else if (token.type === 'heading_open') {
      start = token.map?.[0] ?? start
    }
    current.push(token)
  }
  if (current.length > 0) blocks.push({ start, tokens: current })

  return blocks
    .map((block, index) => {
      const next = blocks[index + 1]
      const end = next ? next.start : lines.length
      return {
        id: `section-${index}`,
        copyText: lines.slice(block.start, end).join('\n').replace(/\s+$/, ''),
        pieces: piecesFor(block.tokens, index),
      }
    })
    .filter((section) => section.copyText !== '' || section.pieces.length > 0)
}
