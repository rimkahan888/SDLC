import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { vi } from 'vitest'

const dataRoot = path.resolve(process.cwd(), 'public/data')

function fileFor(url: string): string {
  const apiAt = url.indexOf('/api/')
  const dataAt = url.indexOf('/data/')
  let relative = ''
  if (apiAt >= 0) relative = url.slice(apiAt + '/api/'.length)
  else if (dataAt >= 0) relative = url.slice(dataAt + '/data/'.length)
  else throw new Error(`Unexpected content URL ${url}.`)
  relative = relative.split('?')[0] ?? relative
  if (!relative.endsWith('.json')) relative += '.json'
  return path.join(dataRoot, relative)
}

const fetchContent: typeof fetch = async (input) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const file = fileFor(url)
  if (!existsSync(file)) {
    throw new Error(
      `Missing ${file}. Run \`dotnet run --project api -- export web/public/data\` from the repository root.`,
    )
  }
  const body = readFileSync(file, 'utf8')
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

vi.stubGlobal('fetch', fetchContent)
