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
    const nodes = [document.documentElement, document.querySelector('.cheatsheet'), document.querySelector('.detail')]
    return Math.max(...nodes.map((node) => (node ? node.scrollWidth - node.clientWidth : 0)))
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
  await page.keyboard.press('o')
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
  await expect(dialog).toContainText('Open the stage detail')
  await expect(dialog).toContainText('Open the focused stage in the prompt builder')
  await expect(dialog).toContainText('Previous or next stage in the detail panel')
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

test('stage detail is half the page and follows the stage', async ({ page }) => {
  const viewport = page.viewportSize()
  expect(viewport).toBeTruthy()
  const width = viewport?.width ?? 0
  const height = viewport?.height ?? 0

  await page.goto('/')
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /svg/)
  await page.locator('[data-stage-id="plan"]').click()
  await expect(page).toHaveURL(/#\/stages\/plan/)

  const work = page.locator('[data-region="work"]')
  const detail = page.locator('[data-region="detail"]')
  await expect(detail).toBeVisible()
  await expect(detail.locator('.detail-kicker')).toHaveText(/Plan/)
  await expect(detail.locator('.detail-kicker')).not.toContainText('before any code')
  await expect(detail.getByRole('heading')).toHaveCount(0)
  await expect(detail).toContainText('Give the next agent enough context that it does not guess.')
  await expect(detail).toContainText('intent.md')
  await expect(detail.getByRole('link', { name: 'Open in prompt builder' })).toHaveAttribute('href', /prompt\/plan/)
  await expect(detail.getByRole('tab', { name: 'Steps' })).toHaveAttribute('aria-selected', 'true')
  await expect(detail).toContainText('Describe the change')

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
  await expectNoHorizontalScroll(page)

  const shotDir = '/opt/cursor/artifacts/screenshots'
  fs.mkdirSync(shotDir, { recursive: true })
  await page.screenshot({ path: path.join(shotDir, `stage-detail-${width}.png`) })

  await detail.getByRole('tab', { name: 'Steps' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(detail.getByRole('tab', { name: 'Done-checks' })).toHaveAttribute('aria-selected', 'true')
  await expect(page).toHaveURL(/#\/stages\/plan/)
  await expect(detail).toContainText('intent.md says what, why, for whom')

  await detail.getByRole('tab', { name: 'Documents' }).click()
  await expect(detail.getByRole('link', { name: 'Intent' })).toBeVisible()
  await expect(detail.locator('[data-copy="doc:intent"]')).toContainText('intent.md')
  await detail.getByRole('link', { name: 'Intent' }).click()
  await expect(page).toHaveURL(/#\/templates\/intent/)
  await expect(detail.getByRole('link', { name: 'Intent' })).toHaveAttribute('aria-current', 'true')

  await detail.getByRole('tab', { name: 'Options' }).click()
  await expect(detail).toContainText('Change type')
  await expect(detail).toContainText('Add something to an existing project.')
  await detail.getByRole('tab', { name: 'Pitfalls' }).click()
  await expect(detail).toContainText('Leaving the agent to guess an API')

  await page.keyboard.press(']')
  await expect(page).toHaveURL(/#\/stages\/design/)
  await expect(detail.locator('.detail-kicker')).toHaveText(/Design/)
  await expect(detail).toContainText('AGENTS.md')
  await page.keyboard.press('[')
  await expect(page).toHaveURL(/#\/stages\/plan/)
  await page.keyboard.press('[')
  await expect(page).toHaveURL(/#\/stages\/plan/)

  await page.locator('[data-stage-id="test"]').click()
  await expect(page).toHaveURL(/#\/stages\/test/)
  await expect(detail.locator('.detail-kicker')).toHaveText(/Test/)

  await page.keyboard.press('Escape')
  await expect(detail).toHaveCount(0)
  await expect(page).toHaveURL(/#\/$/)

  await page.locator('[data-stage-id="build"]').focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/stages\/build/)
  await detail.getByRole('tab', { name: 'Documents' }).click()
  await expect(detail.getByRole('tabpanel')).toContainText('None')
  await page.keyboard.press('Escape')

  await page.locator('[data-stage-id="maintain"]').focus()
  await page.keyboard.press('Space')
  await expect(page).toHaveURL(/#\/stages\/maintain/)
  await page.keyboard.press('Escape')

  await page.locator('[data-stage-id="plan"]').click()
  await detail.getByRole('tab', { name: 'Steps' }).click()
  await detail.locator('[data-copy="step:describe"]').dblclick()
  await expect(page.locator('.toast')).toHaveText('Copied')
  await expect(detail.locator('[data-copy="step:describe"] .tick')).toContainText('Copied')
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toBe('Describe the change\n\nWrite what is changing, who it is for, and the constraints.')

  await page.keyboard.press('Shift+/')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(detail).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(detail).toHaveCount(0)

  await page.locator('[data-stage-id="plan"]').click()
  const detailText = detail.locator('.detail-scroll')
  const before = await detailText.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
  await page.getByLabel('Card size').fill('1.25')
  await expect.poll(async () =>
    detailText.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  ).toBeGreaterThan(before + 1)
  await expectNoHorizontalScroll(page)
})

test('a denied clipboard shows a red error on a detail item', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-stage-id="plan"]').click()
  await page.evaluate(() => {
    navigator.clipboard.writeText = () =>
      Promise.reject(new DOMException('Write permission denied.', 'NotAllowedError'))
  })
  await page.locator('[data-copy="purpose"]').dblclick()
  const toast = page.locator('.toast')
  await expect(toast).toContainText('Error')
  await expect(toast).toContainText('Write permission denied.')
  const color = await toast.evaluate((element) => getComputedStyle(element).color)
  expect(color).toBe('rgb(255, 107, 107)')
  await expect(page.locator('[data-copy="purpose"] .tick')).toHaveCount(0)
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
