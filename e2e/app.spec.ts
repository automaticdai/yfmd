import { expect, test } from '@playwright/test'
import { docText, menuAction, openApp, setDoc } from './helpers'

test('outline lists headings and jumps on click', async ({ page }) => {
  await openApp(page)
  await setDoc(page, '# One\n\ntext\n\n## Two\n\nmore')
  await page.locator('.sidebar-tab[data-tab="outline"]').click()
  await expect(page.locator('.outline-item')).toHaveCount(2)
  await page.locator('.outline-item', { hasText: 'Two' }).click()
  const head = await page.evaluate(() =>
    (window as unknown as { __yfmdView: { state: { selection: { main: { head: number } } } } })
      .__yfmdView.state.selection.main.head)
  expect(head).toBe(13)
})

test('theme toggle flips data-theme and persists', async ({ page }) => {
  await openApp(page)
  const initial = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  await menuAction(page, 'View', 'theme')
  const flipped = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  expect(flipped).not.toBe(initial)
  await page.reload()
  await expect(page.locator('.cm-content')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(flipped)
})

test('editing marks dirty; save clears it', async ({ page }) => {
  await openApp(page)
  await page.evaluate(() => {
    const fs = (window as unknown as { __yfmdFs: { dialogQueue: (string | null)[] } }).__yfmdFs
    fs.dialogQueue.push('/e2e-save.md')
  })
  await setDoc(page, 'dirty content')
  await expect(page.locator('.dirty-dot')).toBeVisible()
  await page.keyboard.press('Control+s')
  await expect(page.locator('.dirty-dot')).toHaveCount(0)
  const saved = await page.evaluate(() =>
    (window as unknown as { __yfmdFs: { files: Map<string, string> } }).__yfmdFs.files.get('/e2e-save.md'))
  expect(saved).toBe('dirty content')
})

test('folder tree opens files with dirty guard', async ({ page }) => {
  await openApp(page)
  await page.evaluate(() => {
    const fs = (window as unknown as {
      __yfmdFs: { files: Map<string, string>; dialogQueue: (string | null)[] }
    }).__yfmdFs
    fs.files.set('/proj/notes.md', '# Notes')
    fs.files.set('/proj/data.png', 'binary')
    fs.dialogQueue.push('/proj')
  })
  await menuAction(page, 'File', 'open-folder')
  await expect(page.locator('.tree-file', { hasText: 'notes.md' })).toBeVisible()
  await expect(page.locator('.tree-file.tree-dim', { hasText: 'data.png' })).toBeVisible()

  await setDoc(page, 'unsaved!')                       // make dirty
  await page.locator('.tree-file', { hasText: 'notes.md' }).click()
  await expect(page.locator('.confirm-dialog')).toBeVisible()
  await page.locator('[data-choice="discard"]').click()
  expect(await docText(page)).toBe('# Notes')
})

test('export html writes a standalone document', async ({ page }) => {
  await openApp(page)
  await setDoc(page, '# Doc\n\n$x^2$\n')
  await page.evaluate(() => {
    const fs = (window as unknown as { __yfmdFs: { dialogQueue: (string | null)[] } }).__yfmdFs
    fs.dialogQueue.push('/out.html')
  })
  await menuAction(page, 'File', 'export-html')
  await expect(page.locator('.toast')).toContainText('/out.html')
  const html = await page.evaluate(() =>
    (window as unknown as { __yfmdFs: { files: Map<string, string> } }).__yfmdFs.files.get('/out.html'))
  expect(html).toContain('<!doctype html>')
  expect(html).toContain('<math')
  // offline check: xmlns attributes are namespace identifiers, not fetched resources
  expect(html!.replace(/xmlns="[^"]*"/g, '')).not.toContain('http://')
})
