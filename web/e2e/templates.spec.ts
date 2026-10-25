import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const nodes = [
      document.documentElement,
      document.querySelector('.cheatsheet'),
      document.querySelector('.detail'),
      document.querySelector('[data-template-view]'),
      document.querySelector('[data-template-index]'),
    ]
    return Math.max(...nodes.map((node) => (node ? node.scrollWidth - node.clientWidth : 0)))
  })
  expect(overflow).toBeLessThanOrEqual(1)
}

async function expectHalfPage(page: Page): Promise<void> {
  const viewport = page.viewportSize()
  const width = viewport?.width ?? 0
  const height = viewport?.height ?? 0
  const work = page.locator('[data-region="work"]')
  const detail = page.locator('[data-region="detail"]')
  const workBox = await work.boundingBox()
  const detailBox = await detail.boundingBox()
  expect(workBox).toBeTruthy()
  expect(detailBox).toBeTruthy()
  if (width >= 960) {
    expect(detailBox!.x).toBeGreaterThanOrEqual(workBox!.x + workBox!.width - 2)
    expect(detailBox!.width).toBeGreaterThan(width * 0.45)
    expect(detailBox!.width).toBeLessThan(width * 0.55)
  } else {
    expect(detailBox!.y).toBeGreaterThanOrEqual(workBox!.y + workBox!.height - 2)
    expect(detailBox!.height).toBeGreaterThan(height * 0.45)
    expect(detailBox!.height).toBeLessThan(height * 0.55)
  }
}

test('a template opens from the stage panel', async ({ page }) => {
  const width = page.viewportSize()?.width ?? 0

  await page.goto('/')
  await page.locator('[data-stage-id="plan"]').click()
  await expect(page).toHaveURL(/#\/stages\/plan/)
  await page.locator('[data-region="detail"]').getByRole('tab', { name: 'Documents' }).click()
  await page.getByRole('link', { name: 'Intent' }).click()
  await expect(page).toHaveURL(/#\/templates\/intent/)

  const view = page.locator('[data-template-view]')
  await expect(view).toBeVisible()
  await expect(view).toHaveAttribute('data-markdown-mode', 'rendered')
  await expect(view.getByRole('heading', { name: 'Intent' })).toBeVisible()
  await expect(view.getByRole('heading', { name: 'Context' })).toBeVisible()
  await expect(view).toContainText('Copy this file to intent.md')
  await expect(view.locator('.template-file')).toHaveText('templates/intent.md')
  await expectHalfPage(page)
  await expectNoHorizontalScroll(page)

  const shotDir = '/opt/cursor/artifacts/screenshots'
  fs.mkdirSync(shotDir, { recursive: true })
  await page.screenshot({ path: path.join(shotDir, `template-viewer-${width}.png`) })

  await page.keyboard.press('m')
  await expect(view).toHaveAttribute('data-markdown-mode', 'raw')
  await expect(view.locator('.template-raw')).toContainText('## Context')
  await expect(view.locator('.template-raw')).toContainText('# Intent')
  await page.getByRole('button', { name: 'Show rendered markdown' }).click()
  await expect(view).toHaveAttribute('data-markdown-mode', 'rendered')
  await expect(view.getByRole('heading', { name: 'Context' })).toBeVisible()

  await page.getByRole('button', { name: 'Copy template' }).click()
  await expect(page.locator('.toast')).toHaveText('Copied')
  await expect(view.locator('.tick')).toContainText('Copied')
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied.startsWith('# Intent')).toBe(true)
  expect(copied).toContain('## Context')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download intent.md' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('intent.md')
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()
  const downloaded = fs.readFileSync(downloadPath!, 'utf8')
  expect(downloaded.startsWith('# Intent')).toBe(true)
  await expect(page.locator('.toast')).toHaveText('Downloaded')
  await expect(view.locator('.tick')).toContainText('Downloaded')

  await view.locator('[data-copy="section-0"]').dblclick()
  await expect(page.locator('.toast')).toHaveText('Copied')
  const section = await page.evaluate(() => navigator.clipboard.readText())
  expect(section.startsWith('# Intent')).toBe(true)
  expect(section).not.toContain('## Context')

  await page.keyboard.press('j')
  await expect(page).toHaveURL(/#\/templates\/agents/)
  await expect(view.locator('.detail-kicker')).toHaveText('AGENTS.md')
  await page.keyboard.press('k')
  await expect(page).toHaveURL(/#\/templates\/intent/)

  await page.keyboard.press('Shift+/')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Toggle rendered or raw markdown')
  await expect(dialog).toContainText('Move in the template index')
  await expect(dialog).toContainText('Copy a section or a code block')
  await page.keyboard.press('j')
  await expect(page).toHaveURL(/#\/templates\/intent/)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(view).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/#\/stages\/plan/)
  await expect(page.locator('[data-region="detail"]')).toContainText('Intent')
  await expectNoHorizontalScroll(page)
})

test('the template index is grouped by stage', async ({ page }) => {
  const width = page.viewportSize()?.width ?? 0
  await page.goto('/')
  await page.locator('[data-stage-id="plan"]').click()
  await page.getByRole('link', { name: 'All templates' }).click()
  await expect(page).toHaveURL(/#\/templates\?stage=plan/)

  const index = page.locator('[data-template-index]')
  await expect(index.getByRole('heading', { name: 'Plan' })).toBeVisible()
  await expect(index.getByRole('heading', { name: 'Design' })).toBeVisible()
  await expect(index.getByRole('heading', { name: 'Test' })).toBeVisible()
  await expect(index.getByRole('heading', { name: 'Deploy' })).toBeVisible()
  await expect(index.getByRole('heading', { name: 'Maintain' })).toBeVisible()
  await expect(index.getByRole('heading', { name: 'Build' })).toHaveCount(0)
  await expect(index.getByRole('link', { name: /Intent/ })).toBeVisible()
  await expect(index.getByRole('link', { name: /AGENTS\.md/ })).toBeVisible()
  await expectHalfPage(page)
  await expectNoHorizontalScroll(page)

  const shotDir = '/opt/cursor/artifacts/screenshots'
  fs.mkdirSync(shotDir, { recursive: true })
  await page.screenshot({ path: path.join(shotDir, `template-index-${width}.png`) })

  await page.keyboard.press('j')
  await expect(page.locator('[data-template-id="intent"]')).toBeFocused()
  await page.keyboard.press('j')
  await expect(page.locator('[data-template-id="agents"]')).toBeFocused()
  await page.keyboard.press('Home')
  await expect(page.locator('[data-template-id="intent"]')).toBeFocused()
  await page.keyboard.press('End')
  await expect(page.locator('[data-template-id="maintain-change-request"]')).toBeFocused()
  await page.keyboard.press('k')
  await expect(page.locator('[data-template-id="pull-request"]')).toBeFocused()

  await page.locator('[data-template-id="intent"]').focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/templates\/intent/)
  await expect(page).toHaveURL(/from=index/)
  await expect(page).toHaveURL(/stage=plan/)
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/#\/templates\?stage=plan/)
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/#\/stages\/plan/)
  await expectNoHorizontalScroll(page)
})

test('double-click copies a code block from a template', async ({ page }) => {
  await page.goto('#/stages/design')
  await page.locator('[data-region="detail"]').getByRole('tab', { name: 'Documents' }).click()
  await page.getByRole('link', { name: 'Docs rule' }).click()
  await expect(page).toHaveURL(/#\/templates\/docs-rule/)
  await page.locator('[data-template-view] .md-code').first().dblclick()
  await expect(page.locator('.toast')).toHaveText('Copied')
  await expect(page.locator('[data-template-view] .md-code .tick').first()).toContainText('Copied')
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toBe('[example]')
})

test('a denied clipboard shows a red error on the template', async ({ page }) => {
  await page.goto('#/templates/intent')
  await expect(page.locator('[data-template-view]')).toBeVisible()
  await page.evaluate(() => {
    navigator.clipboard.writeText = () =>
      Promise.reject(new DOMException('Write permission denied.', 'NotAllowedError'))
  })
  await page.getByRole('button', { name: 'Copy template' }).click()
  const toast = page.locator('.toast')
  await expect(toast).toContainText('Error')
  await expect(toast).toContainText('Write permission denied.')
  const color = await toast.evaluate((element) => getComputedStyle(element).color)
  expect(color).toBe('rgb(255, 107, 107)')
  await expect(page.locator('[data-template-view] .tick')).toHaveCount(0)
})
