import { expect, test } from '@playwright/test'

test('placeholder renders without horizontal scrolling', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1, name: 'SDLC' })).toBeVisible()
  await expect(page.getByText('Scaffold placeholder.')).toBeVisible()
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
