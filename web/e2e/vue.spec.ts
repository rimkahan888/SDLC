import { expect, test } from '@playwright/test'

test('placeholder renders without horizontal scrolling', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'SDLC' })).toBeVisible()
  await expect(page.getByText('Six stages, read from the content files.')).toBeVisible()

  const names = ['Plan', 'Design', 'Build', 'Test', 'Deploy', 'Maintain']
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(6)
  for (const [index, name] of names.entries()) {
    await expect(items.nth(index)).toContainText(name)
  }
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /data:image\/svg\+xml/)

  const colorScheme = await page.evaluate(
    () => getComputedStyle(document.documentElement).colorScheme,
  )
  expect(colorScheme).toBe('dark')

  const scrollsHorizontally = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(scrollsHorizontally).toBe(false)
})
