import { expect, type Page } from '@playwright/test'

export async function openApp(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.locator('.cm-content')).toBeVisible()
}

/** Replace the whole document through the editor API (deterministic setup). */
export async function setDoc(page: Page, text: string): Promise<void> {
  await page.evaluate(doc => {
    type ViewLike = {
      state: { doc: { length: number } }
      dispatch(spec: object): void
    }
    const view = (window as unknown as { __yfmdView: ViewLike }).__yfmdView
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: doc } })
  }, text)
}

export function docText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const view = (window as unknown as { __yfmdView: { state: { doc: { toString(): string } } } }).__yfmdView
    return view.state.doc.toString()
  })
}

export async function setCursor(page: Page, pos: number): Promise<void> {
  await page.evaluate(p => {
    const view = (window as unknown as { __yfmdView: { dispatch(s: object): void } }).__yfmdView
    view.dispatch({ selection: { anchor: p } })
  }, pos)
}

export async function menuAction(page: Page, menu: string, action: string): Promise<void> {
  await page.locator('.menu-title', { hasText: menu }).click()
  await page.locator(`[data-action="${action}"]`).click()
}
