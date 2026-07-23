import { test, expect } from '@playwright/test'

test('homepage loads in Vietnamese', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.locator('h1').first()).toBeVisible()
})

test('navigation to booking page', async ({ page }) => {
  await page.goto('/dat-xe')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('404 page', async ({ page }) => {
  await page.goto('/trang-khong-ton-tai-xyz')
  await expect(page.locator('h1')).toBeVisible()
})
