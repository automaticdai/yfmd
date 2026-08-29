import { expect, test } from '@playwright/test'
import { docText, menuAction, openApp, setDoc } from './helpers'

test('file panel is hidden by default and F9 toggles it', async ({ page }) => {
  await openApp(page)
  await expect(page.locator('.sidebar')).toHaveCount(0)
  await page.keyboard.press('F9')
  await expect(page.locator('.sidebar')).toBeVisible()
  await page.keyboard.press('F9')
  await expect(page.locator('.sidebar')).toHaveCount(0)
})

test('the file panel can be resized by dragging its edge, and the width persists', async ({ page }) => {
  await openApp(page)
  await page.keyboard.press('F9')
  const width = () => page.evaluate(() =>
    document.querySelector('.sidebar')!.getBoundingClientRect().width)
  expect(await width()).toBe(240)

  const handle = page.locator('.sidebar .panel-resizer')
  const box = (await handle.boundingBox())!
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 80, cy, { steps: 8 })
  await page.mouse.up()
  const resized = await width()
  expect(resized).toBeGreaterThanOrEqual(316)
  expect(resized).toBeLessThanOrEqual(324)

  await page.reload()
  await expect(page.locator('.cm-content')).toBeVisible()
  await page.keyboard.press('F9')
  expect(await width()).toBe(resized)
})

test('the outline panel is separate from the file panel, lists headings, and jumps on click', async ({ page }) => {
  await openApp(page)
  await setDoc(page, '# One\n\ntext\n\n## Two\n\nmore')

  // outline lives in its own right-hand panel now, not a tab in the file panel
  await page.keyboard.press('F9')
  await expect(page.locator('.sidebar')).toBeVisible()
  await expect(page.locator('.sidebar .sidebar-tab')).toHaveCount(0)
  await expect(page.locator('.outline-panel')).toHaveCount(0)

  await page.keyboard.press('F10')
  await expect(page.locator('.outline-panel')).toBeVisible()
  await expect(page.locator('.outline-panel .outline-item')).toHaveCount(2)

  await page.locator('.outline-panel .outline-item', { hasText: 'Two' }).click()
  const head = await page.evaluate(() =>
    (window as unknown as { __yfmdView: { state: { selection: { main: { head: number } } } } })
      .__yfmdView.state.selection.main.head)
  expect(head).toBe(13)

  await page.keyboard.press('F10')
  await expect(page.locator('.outline-panel')).toHaveCount(0)
})

test('read-only mode blocks every document edit and shows a badge', async ({ page }) => {
  await openApp(page)
  await setDoc(page, 'hello')

  await menuAction(page, 'View', 'read-only')
  await expect(page.locator('.readonly-badge')).toBeVisible()

  // both programmatic dispatches and menu commands are filtered out
  await setDoc(page, 'REPLACED')
  expect(await docText(page)).toBe('hello')
  await menuAction(page, 'Format', 'bold')
  expect(await docText(page)).toBe('hello')

  // toggle off — edits apply again
  await menuAction(page, 'View', 'read-only')
  await expect(page.locator('.readonly-badge')).toHaveCount(0)
  await setDoc(page, 'editable again')
  expect(await docText(page)).toBe('editable again')
})

test('Help menu: Keyboard Shortcuts dialog, Markdown Guide, and external links', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { __opened: string[] }).__opened = []
    window.open = (url?: string | URL) => {
      ;(window as unknown as { __opened: string[] }).__opened.push(String(url))
      return null
    }
  })
  await openApp(page)

  // Keyboard Shortcuts dialog
  await menuAction(page, 'Help', 'shortcuts')
  await expect(page.locator('.shortcuts-dialog')).toBeVisible()
  await expect(page.locator('.shortcuts-dialog .shortcut-keys kbd', { hasText: 'Ctrl' }).first()).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.shortcuts-dialog')).toHaveCount(0)

  // Markdown Guide loads the bundled welcome doc as a fresh untitled buffer,
  // through the dirty-discard guard
  await setDoc(page, 'scratch text')
  await menuAction(page, 'Help', 'markdown-guide')
  await page.locator('[data-choice="discard"]').click()
  expect(await docText(page)).toContain('# Welcome to yfmd')

  // external links go through window.open
  await menuAction(page, 'Help', 'report-issue')
  await menuAction(page, 'Help', 'check-updates')
  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened)
  expect(opened.some(u => u.endsWith('/issues'))).toBe(true)
  expect(opened.some(u => u.endsWith('/releases'))).toBe(true)
})

test('theme menu switches theme and persists', async ({ page }) => {
  await openApp(page)
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('github')
  await menuAction(page, 'Theme', 'theme:night')
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('night')
  await page.reload()
  await expect(page.locator('.cm-content')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('night')
  // active theme is checkmarked in the menu
  await page.locator('.menu-title', { hasText: 'Theme' }).click()
  await expect(page.locator('[data-action="theme:night"]')).toHaveClass(/checked/)
})

test('settings dialog changes the editor and code fonts, and persists them', async ({ page }) => {
  await openApp(page)
  await setDoc(page, 'plain text\n\n```js\nlet x = 1\n```\n')
  await menuAction(page, 'File', 'settings')
  await page.locator('.settings-tab[data-tab="appearance"]').click()
  await page.locator('[data-setting="bodyFont"]').selectOption('georgia')
  await page.locator('[data-setting="codeFont"]').selectOption('courier')

  const fonts = () => page.evaluate(() => ({
    body: getComputedStyle(document.querySelector('.cm-scroller')!).fontFamily,
    code: getComputedStyle(document.querySelector('.cm-codeblock-line')!).fontFamily,
  }))
  expect((await fonts()).body).toContain('Georgia')
  expect((await fonts()).code).toContain('Courier New')

  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.locator('.cm-content')).toBeVisible()
  await setDoc(page, 'plain text\n\n```js\nlet x = 1\n```\n')
  expect((await fonts()).body).toContain('Georgia')
  expect((await fonts()).code).toContain('Courier New')
})

test('"follow theme" hands the editor font back to the theme', async ({ page }) => {
  await openApp(page)
  await menuAction(page, 'File', 'settings')
  await page.locator('.settings-tab[data-tab="appearance"]').click()
  await page.locator('[data-setting="bodyFont"]').selectOption('verdana')
  await page.locator('[data-setting="theme"]').selectOption('newsprint')
  const bodyFont = () => page.evaluate(() =>
    getComputedStyle(document.querySelector('.cm-scroller')!).fontFamily)
  expect(await bodyFont()).toContain('Verdana')
  // Newsprint's own serif stack only reappears once the override is cleared
  await page.locator('[data-setting="bodyFont"]').selectOption('theme')
  const themeFont = await bodyFont()
  expect(themeFont).toContain('Georgia')
  expect(themeFont).not.toContain('Verdana')
})

test('settings dialog changes text width live and persists', async ({ page }) => {
  await openApp(page)
  await menuAction(page, 'File', 'settings')
  await expect(page.locator('.settings-dialog')).toBeVisible()
  await page.locator('.settings-tab[data-tab="layout"]').click()
  await page.locator('[data-setting="maxWidth"]').evaluate((el, v) => {
    const input = el as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, v)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, '60')
  // rendered width, not getComputedStyle (Chromium keeps min()/calc() with a
  // percentage symbolic there instead of resolving it to a used-value px)
  const width = () => page.evaluate(() =>
    document.querySelector('.cm-content')!.getBoundingClientRect().width)
  expect(await width()).toBe(960)   // 60rem at 16px root font
  await page.keyboard.press('Escape')
  await expect(page.locator('.settings-dialog')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.cm-content')).toBeVisible()
  expect(await width()).toBe(960)
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
