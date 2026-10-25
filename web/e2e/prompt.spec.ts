import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
}

test('prompt builder walks the stages at both widths', async ({ page }) => {
  const viewport = page.viewportSize()
  expect(viewport).toBeTruthy()
  const width = viewport?.width ?? 0
  const height = viewport?.height ?? 0

  await page.goto('#/prompt/plan')
  await expect(page.getByRole('heading', { level: 1, name: 'Prompt' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Views' }).getByRole('link', { name: 'Prompt' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.locator('pre[aria-label="Assembled prompt"]')).toBeVisible()
  await expect(page.getByText('4 choices left')).toBeVisible()
  await expectNoHorizontalScroll(page)

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

  const changeType = page.getByRole('radiogroup', { name: 'Change type' })
  await changeType.getByRole('radio', { name: /Feature/ }).click()
  await expect(page.locator('.prompt-text')).toContainText('This is a feature on an existing project')

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('note', { name: 'Visual style placeholder' })).toBeVisible()
  await expect(page.getByText('The quick look')).toHaveCount(0)

  await page.getByRole('radiogroup', { name: 'Stack' }).getByRole('radio', { name: /Vue and C#/ }).click()
  await page.getByRole('radiogroup', { name: 'AGENTS.md' }).getByRole('radio', { name: /existing AGENTS.md/ }).click()

  await page.keyboard.press('3')
  await expect(page.getByRole('radiogroup', { name: 'Plan first' }).getByRole('radio', { name: /Accept the plan first/ })).toHaveAttribute(
    'aria-checked',
    'true',
  )

  await page.keyboard.press('4')
  const checks = page.getByRole('group', { name: 'Done-checks' })
  const layout = checks.getByRole('checkbox', { name: /540px layout/ })
  await layout.focus()
  await page.keyboard.press('ArrowDown')
  await expect(checks.getByRole('checkbox', { name: /Wide layout/ })).toBeFocused()
  await page.keyboard.press('End')
  await expect(checks.getByRole('checkbox', { name: /^Keyboard/ })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(layout).toBeFocused()
  await page.keyboard.press('Space')
  await expect(layout).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('.prompt-text')).toContainText('## 4. Test')

  await page.keyboard.press('5')
  await expect(page.getByRole('heading', { name: 'Review boundary' })).toBeVisible()
  await page.keyboard.press('6')
  await expect(page.getByRole('heading', { name: 'How to continue' })).toBeVisible()

  const preview = await page.locator('.prompt-text').innerText()
  const positions = ['## 1. Plan', '## 2. Design', '## 3. Build', '## 4. Test', '## 5. Deploy', '## 6. Maintain'].map(
    (heading) => preview.indexOf(heading),
  )
  expect(positions.every((index) => index >= 0)).toBe(true)
  expect([...positions].sort((left, right) => left - right)).toEqual(positions)

  await page.getByRole('button', { name: 'Skip Maintain' }).click()
  await expect(page.locator('.prompt-text')).not.toContainText('## 6. Maintain')

  await page.keyboard.press('Shift+/')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Copy the prompt')
  await expect(dialog).toContainText('1–6')
  await expectNoHorizontalScroll(page)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: 'Copy prompt' }).click()
  await expect(page.locator('.toast')).toHaveText('Copied')
  await expect(page.locator('.prompt-actions .tick')).toContainText('Copied')
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('## 1. Plan')
  expect(copied).not.toContain('## 6. Maintain')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download prompt' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('sdlc-prompt.md')
  const downloadPath = await download.path()
  expect(downloadPath).toBeTruthy()
  const downloaded = fs.readFileSync(downloadPath!, 'utf8')
  expect(downloaded).toContain('This is a feature on an existing project')
  await expect(page.locator('.toast')).toHaveText('Downloaded')

  await page.reload()
  await page.keyboard.press('1')
  await expect(page.getByRole('radio', { name: /Feature/ })).toHaveAttribute('aria-checked', 'true')

  await page.getByRole('button', { name: 'Share link' }).click()
  await expect(page.locator('.toast')).toHaveText('Copied')
  const sharedUrl = await page.evaluate(() => navigator.clipboard.readText())
  expect(sharedUrl).toContain('c=')

  await page.getByRole('button', { name: 'Reset choices' }).click()
  await expect(page.locator('.toast')).toHaveText('Reset')
  await page.keyboard.press('1')
  await expect(page.getByRole('radio', { name: /Feature/ })).toHaveAttribute('aria-checked', 'false')
  expect(page.url()).not.toContain('c=')

  await page.goto(sharedUrl)
  await page.keyboard.press('1')
  await expect(page.getByRole('radio', { name: /Feature/ })).toHaveAttribute('aria-checked', 'true')

  await page.keyboard.press('p')
  await expect(detail).toBeHidden()
  await page.getByRole('button', { name: 'Show prompt' }).click()
  await expect(detail).toBeVisible()
  await expectNoHorizontalScroll(page)

  const screenshotDir = '/opt/cursor/artifacts/screenshots'
  fs.mkdirSync(screenshotDir, { recursive: true })
  await page.keyboard.press('2')
  await expect(page.getByRole('note', { name: 'Visual style placeholder' })).toBeVisible()
  await page.screenshot({
    path: path.join(screenshotDir, `prompt-builder-${width}.png`),
    fullPage: false,
  })
  if (width === 1440) {
    fs.writeFileSync(
      '/opt/cursor/artifacts/prompt-sample.md',
      await page.locator('.prompt-text').innerText(),
    )
  }
})

test('a denied clipboard shows a red error', async ({ page }) => {
  await page.goto('#/prompt/plan')
  await page.evaluate(() => {
    navigator.clipboard.writeText = () =>
      Promise.reject(new DOMException('Write permission denied.', 'NotAllowedError'))
  })
  await page.getByRole('button', { name: 'Copy prompt' }).click()
  const toast = page.locator('.toast')
  await expect(toast).toContainText('Error')
  await expect(toast).toContainText('Write permission denied.')
  await expect(page.locator('.prompt-actions .tick')).toHaveCount(0)
})

test('a broken share link keeps the saved choices', async ({ page }) => {
  await page.goto('#/prompt/plan')
  await page.getByRole('radio', { name: /Bug fix/ }).click()
  await page.goto('#/prompt/plan?c=' + encodeURIComponent('{'))
  await expect(page.locator('.toast')).toContainText('Error')
  await expect(page.getByRole('radio', { name: /Bug fix/ })).toHaveAttribute('aria-checked', 'true')
})

test('panel size survives a reload', async ({ page }) => {
  await page.goto('#/prompt/plan')
  const slider = page.getByLabel('Panel size')
  await slider.fill('0.65')
  await expect(slider).toHaveValue('0.65')
  await page.reload()
  await expect(page.getByLabel('Panel size')).toHaveValue('0.65')
  const ratio = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--panel-ratio').trim(),
  )
  expect(ratio).toBe('0.65')

  const card = page.getByLabel('Card size')
  await card.fill('1.1')
  await page.reload()
  await expect(page.getByLabel('Card size')).toHaveValue('1.1')
  const scale = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--card-scale').trim(),
  )
  expect(scale).toBe('1.1')
  await expectNoHorizontalScroll(page)
})

test('double-click copies an option card', async ({ page }) => {
  await page.goto('#/prompt/plan')
  await page.getByRole('radio', { name: /Feature/ }).dblclick()
  await expect(page.locator('.toast')).toHaveText('Copied')
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('Feature\n\nAdd something to an existing project.')
})
