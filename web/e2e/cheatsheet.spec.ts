import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const stages = [
  { id: 'plan', name: 'Plan' },
  { id: 'design', name: 'Design' },
  { id: 'build', name: 'Build' },
  { id: 'test', name: 'Test' },
  { id: 'deploy', name: 'Deploy' },
  { id: 'maintain', name: 'Maintain' },
] as const

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const sheet = document.querySelector('.cheatsheet')
    const sheetOverflow = sheet ? sheet.scrollWidth - sheet.clientWidth : 0
    const pageOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth
    return Math.max(sheetOverflow, pageOverflow)
  })
  expect(overflow).toBeLessThanOrEqual(1)
}

test('overview shows every stage at both widths', async ({ page }) => {
  const viewport = page.viewportSize()
  expect(viewport).toBeTruthy()
  const width = viewport?.width ?? 0

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Cheatsheet' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Views' }).getByRole('link', { name: 'Cheatsheet' })).toHaveAttribute(
    'aria-current',
    'page',
  )

  const cards = page.locator('.stage-card')
  await expect(cards).toHaveCount(6)
  for (const [index, stage] of stages.entries()) {
    const card = cards.nth(index)
    await expect(card.getByRole('heading', { level: 2, name: stage.name })).toBeVisible()
    await expect(card.getByText('Purpose')).toBeVisible()
    await expect(card.getByText('Key artifact')).toBeVisible()
    await expect(card.getByText('Documents')).toBeVisible()
    await expect(card.getByText('Option groups')).toBeVisible()
    await expect(card.getByRole('link', { name: `Open ${stage.name} in the prompt builder` })).toHaveAttribute(
      'href',
      new RegExp(`#/prompt/${stage.id}`),
    )
  }

  await expect(cards.nth(0)).toContainText('intent.md')
  await expect(cards.nth(0)).toContainText('Intent')
  await expect(cards.nth(0)).toContainText('Change type')
  await expect(cards.nth(1)).toContainText('AGENTS.md')
  await expect(cards.nth(1)).toContainText('Visual style')
  await expect(cards.nth(2)).toContainText('None')
  await expect(page.getByRole('navigation', { name: 'Lifecycle' })).toContainText('Returns to Plan')

  const first = await cards.nth(0).boundingBox()
  const second = await cards.nth(1).boundingBox()
  expect(first && second).toBeTruthy()
  if (width <= 600) {
    expect(second!.y).toBeGreaterThan(first!.y + first!.height * 0.5)
    expect(Math.abs(second!.x - first!.x)).toBeLessThan(8)
  } else {
    expect(second!.x).toBeGreaterThan(first!.x + first!.width * 0.4)
  }

  for (const stage of stages) {
    const card = page.locator(`.stage-card[data-stage-id="${stage.id}"]`)
    const clipped = await card.evaluate((element) =>
      Math.max(element.scrollWidth - element.clientWidth, element.scrollHeight - element.clientHeight),
    )
    expect(clipped).toBeLessThanOrEqual(1)
  }
  await expectNoHorizontalScroll(page)

  const shotDir = '/opt/cursor/artifacts/screenshots'
  fs.mkdirSync(shotDir, { recursive: true })
  // The cheatsheet scrolls inside the page, so the shot lets that region grow
  // and captures every stage. The scroll checks above use the real layout.
  await page.addStyleTag({
    content: `
      html, body, #app, .page, .cheatsheet {
        height: auto !important;
        overflow: visible !important;
      }
    `,
  })
  await page.screenshot({
    path: path.join(shotDir, `cheatsheet-${width}.png`),
    fullPage: true,
  })
  await page.reload()

  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[data-stage-id="plan"]')).toBeFocused()
  await expect(page.locator('[data-stage-id="plan"]')).toHaveAttribute('data-selected', 'true')
  await page.keyboard.press('j')
  await expect(page.locator('[data-stage-id="design"]')).toBeFocused()
  await page.keyboard.press('k')
  await expect(page.locator('[data-stage-id="plan"]')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-stage-id="design"]')).toBeFocused()
  await page.keyboard.press('End')
  await expect(page.locator('[data-stage-id="maintain"]')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('[data-stage-id="maintain"]')).toBeFocused()
  await page.keyboard.press('Home')
  await expect(page.locator('[data-stage-id="plan"]')).toBeFocused()
  await page.keyboard.press('6')
  await expect(page.locator('[data-stage-id="maintain"]')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/prompt\/maintain/)
  await expect(page.getByRole('heading', { name: 'How to continue' })).toBeVisible()

  await page.getByRole('navigation', { name: 'Views' }).getByRole('link', { name: 'Cheatsheet' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Cheatsheet' })).toBeVisible()
  await page.locator('[data-stage-id="plan"]').dblclick()
  await expect(page.locator('.toast')).toHaveText('Copied')
  await expect(page.locator('[data-stage-id="plan"] .tick')).toContainText('Copied')
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied.startsWith('Plan\n\n')).toBe(true)
  expect(copied).toContain('\n\nKey artifact: intent.md\n\n')
  expect(copied).toContain('Purpose:')
  expect(copied).toContain('Documents: Intent')
  expect(copied).toContain('Change type (required)')
  await expectNoHorizontalScroll(page)

  await page.keyboard.press('Shift+/')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Move between stage cards')
  await expect(dialog).toContainText('Open the focused stage in the prompt builder')
  await expect(dialog).toContainText('Copy the stage card')
  await page.keyboard.press('j')
  await expect(page.locator('[data-stage-id="design"]')).toHaveAttribute('data-selected', 'false')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  const cardSize = page.getByLabel('Card size')
  const before = await cards.first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
  await cardSize.fill('1.25')
  await expect(cardSize).toHaveValue('1.25')
  await expect.poll(async () =>
    page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--card-scale').trim()),
  ).toBe('1.25')
  await expect.poll(async () =>
    cards.first().evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  ).toBeGreaterThan(before + 1)
  await page.reload()
  await expect(page.getByLabel('Card size')).toHaveValue('1.25')
  const scale = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--card-scale').trim(),
  )
  expect(scale).toBe('1.25')

  await page.getByLabel('Panel size').fill('0.62')
  await page.reload()
  await expect(page.getByLabel('Panel size')).toHaveValue('0.62')
  const ratio = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--panel-ratio').trim(),
  )
  expect(ratio).toBe('0.62')
  await expectNoHorizontalScroll(page)
})

test('a denied clipboard shows a red error on a stage card', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    navigator.clipboard.writeText = () =>
      Promise.reject(new DOMException('Write permission denied.', 'NotAllowedError'))
  })
  await page.locator('[data-stage-id="design"]').dblclick()
  const toast = page.locator('.toast')
  await expect(toast).toContainText('Error')
  await expect(toast).toContainText('Write permission denied.')
  const color = await toast.evaluate((element) => getComputedStyle(element).color)
  expect(color).toBe('rgb(255, 107, 107)')
  await expect(page.locator('[data-stage-id="design"] .tick')).toHaveCount(0)
})
