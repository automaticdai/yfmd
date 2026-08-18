import { expect, test } from '@playwright/test'
import { docText, menuAction, openApp, setCursor, setDoc } from './helpers'

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

test('Edit menu applies a heading and toggles it back to a paragraph', async ({ page }) => {
  await openApp(page)
  await setDoc(page, 'hello')
  await setCursor(page, 0)
  await menuAction(page, 'Edit', 'heading:2')
  expect(await docText(page)).toBe('## hello')
  await menuAction(page, 'Edit', 'heading:2')   // same level again -> toggles off
  expect(await docText(page)).toBe('hello')
})

test('Edit menu inserts a table that renders as a widget', async ({ page }) => {
  await openApp(page)
  await setDoc(page, 'notes')
  await setCursor(page, 5)
  await menuAction(page, 'Edit', 'table')
  // the "Header 1" placeholder is left selected for immediate typing, so the
  // table stays as raw source until the cursor moves away from it
  await setCursor(page, 0)
  await expect(page.locator('.cm-table-widget')).toBeVisible()
  await expect(page.locator('.cm-table-widget th').first()).toHaveText('Header 1')
})

test('Table Creator dialog creates custom m x n table', async ({ page }) => {
  await openApp(page)
  await setDoc(page, '')
  await menuAction(page, 'Edit', 'table-creator')
  
  const dialog = page.locator('.table-creator-dialog')
  await expect(dialog).toBeVisible()
  
  // Click on a 3x4 cell in the grid
  const cell = page.locator('.table-grid-cell[title="3 × 4"]')
  await cell.click()
  
  await expect(dialog).not.toBeVisible()
  const text = await docText(page)
  expect(text).toContain('| Header 1 | Header 2 | Header 3 | Header 4 |')
  expect(text).toContain('| -------- | -------- | -------- | -------- |')
})

test('Alert Callout renders title badge and colored border in live preview', async ({ page }) => {
  await openApp(page)
  await setDoc(page, '> [!NOTE]\n> Important alert message')
  await setCursor(page, 20) // cursor on second line

  const alertLine = page.locator('.cm-alert-note')
  await expect(alertLine.first()).toBeVisible()
  
  // First line displays styled alert title badge
  const title = page.locator('.cm-alert-title-note')
  await expect(title).toBeVisible()
  await expect(title).toContainText('Note')
})


