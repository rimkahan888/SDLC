import { expect, test } from '@playwright/test'

test('cheatsheet renders without horizontal scrolling', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'Cheatsheet' })).toBeVisible()
  await expect(page.getByText('Plan through Maintain, then back to Plan.')).toBeVisible()

  const names = ['Plan', 'Design', 'Build', 'Test', 'Deploy', 'Maintain']
  const items = page.locator('ol.stage-grid > li')
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

  const views = page.getByRole('navigation', { name: 'Views' })
  await views.getByRole('link', { name: 'Prompt' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Prompt' })).toBeVisible()
  await expect(views.getByRole('link', { name: 'Prompt' })).toHaveAttribute('aria-current', 'page')

  await views.getByRole('link', { name: 'Cheatsheet' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Cheatsheet' })).toBeVisible()
  await expect(views.getByRole('link', { name: 'Cheatsheet' })).toHaveAttribute('aria-current', 'page')
})
