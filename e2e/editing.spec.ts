import { expect, test } from '@playwright/test'
import { docText, openApp, setCursor, setDoc } from './helpers'

test('heading renders large with marker hidden until cursor enters', async ({ page }) => {
  await openApp(page)
  await setDoc(page, '# Hello\n\nWorld')
  await setCursor(page, 12)
  const heading = page.locator('.cm-heading-line-1')
  await expect(heading).toHaveText('Hello')          // '# ' hidden
  await setCursor(page, 3)
  await expect(heading).toHaveText('# Hello')        // revealed
})

test('bold markers hide when cursor leaves', async ({ page }) => {
  await openApp(page)
  await setDoc(page, 'a **bold** z')
  await setCursor(page, 5)
  await expect(page.locator('.cm-content')).toContainText('**bold**')
  await setCursor(page, 0)
  await expect(page.locator('.cm-content')).not.toContainText('**')
  await expect(page.locator('.tok-strong').first()).toBeVisible()
})

test('source mode shows everything raw', async ({ page }) => {
  await openApp(page)
  await setDoc(page, '# T\n**b**')
  await page.locator('.cm-content').click()   // focus so the editor keymap receives Ctrl+/
  await setCursor(page, 0)
  await page.keyboard.press('Control+/')
  await expect(page.locator('.cm-content')).toContainText('**b**')
  await expect(page.locator('.statusbar')).toContainText('SOURCE')
  await page.keyboard.press('Control+/')
  await expect(page.locator('.statusbar')).not.toContainText('SOURCE')
})

test('typing markdown renders live', async ({ page }) => {
  await openApp(page)
  await setDoc(page, '')
  await page.locator('.cm-content').click()
  await page.keyboard.type('## Section')
  await expect(page.locator('.cm-heading-line-2')).toBeVisible()
  expect(await docText(page)).toBe('## Section')
})
