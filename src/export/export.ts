import type { FileService } from '../services/file-service'
import { renderExportHtml } from './render-html'

export async function exportHtml(fs: FileService, markdown: string, title: string, customCss = ''): Promise<string | null> {
  const path = await fs.saveFileDialog(`${title}.html`)
  if (path === null) return null
  await fs.writeFile(path, await renderExportHtml(markdown, title, customCss))
  return path
}

/** Renders to a hidden iframe and opens the system print dialog (print-to-PDF). */
export async function exportPdf(markdown: string, title: string, customCss = ''): Promise<void> {
  const html = await renderExportHtml(markdown, title, customCss)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '100vw'
  iframe.style.width = '0'
  iframe.style.height = '0'
  document.body.appendChild(iframe)
  await new Promise<void>(resolve => {
    iframe.onload = () => resolve()
    iframe.srcdoc = html
  })
  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()
  setTimeout(() => iframe.remove(), 60_000)
}
