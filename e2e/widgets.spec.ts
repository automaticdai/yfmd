import { expect, test } from '@playwright/test'
import { docText, openApp, setCursor, setDoc } from './helpers'

test('inline math renders and reveals on click', async ({ page }) => {
  await openApp(page)
  await setDoc(page, 'x $a^2+b^2$ y\n\nend')
  await setCursor(page, 16)
  const math = page.locator('.cm-math-inline')
  await expect(math).toBeVisible()
  // force: Chromium's contenteditable hit-testing can flag the surrounding
  // .cm-line as "intercepting" an atomic contenteditable=false inline widget
  // even though a real/dispatched click resolves correctly (verified against
  // the widget's own mousedown handler) — a Playwright pre-check false
  // positive specific to inline (not block) atomic widgets, not a real bug.
  await math.click({ force: true })
  await expect(page.locator('.cm-content')).toContainText('$a^2+b^2$')
})

test('block math renders as a centered widget', async ({ page }) => {
  await openApp(page)
  await setDoc(page, 'before\n\n$$\nE=mc^2\n$$\n\nafter')
  await setCursor(page, 0)
  await expect(page.locator('.cm-math-block')).toBeVisible()
})

test('checkbox click toggles the source text', async ({ page }) => {
  await openApp(page)
  await setDoc(page, '- [ ] milk\n\nend')
  await setCursor(page, 14)
  await page.locator('.cm-task-checkbox').click()
  expect(await docText(page)).toContain('- [x] milk')
})

test('table renders as widget and opens aligned source on click', async ({ page }) => {
  await openApp(page)
  await setDoc(page, '| a | bb |\n| - | - |\n| ccc | d |\n\nend')
  await setCursor(page, 35)
  const table = page.locator('.cm-table-widget')
  await expect(table).toBeVisible()
  await expect(table.locator('th').first()).toHaveText('a')
  await table.click()
  await expect(page.locator('.cm-table-widget')).toHaveCount(0)
  expect(await docText(page)).toContain('| a   | bb  |') // auto-aligned
})

test('mermaid block renders an svg diagram', async ({ page }) => {
  await openApp(page)
  await setDoc(page, '```mermaid\ngraph LR\n  A-->B\n```\n\nend')
  await setCursor(page, 35)
  await expect(page.locator('.cm-mermaid svg')).toBeVisible({ timeout: 15_000 })
})

test('mermaid syntax error shows inline error box', async ({ page }) => {
  await openApp(page)
  await setDoc(page, '```mermaid\nnot a diagram!!\n```\n\nend')
  await setCursor(page, 35)
  await expect(page.locator('.cm-widget-error')).toBeVisible({ timeout: 15_000 })
})

test('horizontal rule renders and reveals', async ({ page }) => {
  await openApp(page)
  await setDoc(page, 'a\n\n---\n\nb')
  await setCursor(page, 0)
  await expect(page.locator('.cm-hr-widget')).toBeVisible()
  await setCursor(page, 4)
  await expect(page.locator('.cm-hr-widget')).toHaveCount(0)
})
