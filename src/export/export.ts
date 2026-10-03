import type { SyntaxOptions } from '../editor/live-preview/facets'
import type { FileService } from '../services/file-service'
import { renderExportHtml } from './render-html'
import { embedExportImages } from './image-assets'

export async function exportHtml(
  fs: FileService, markdown: string, title: string, customCss = '', syntax?: Partial<SyntaxOptions>, docPath: string | null = null,
): Promise<string | null> {
  const path = await fs.saveFileDialog(`${title}.html`)
  if (path === null) return null
  const html = await renderExportHtml(markdown, title, customCss, syntax)
  await fs.writeFile(path, await embedExportImages(html, fs, docPath))
  return path
}

/** Renders to a hidden iframe and opens the system print dialog (print-to-PDF). */
export async function exportPdf(
  fs: FileService, markdown: string, title: string, customCss = '', syntax?: Partial<SyntaxOptions>, docPath: string | null = null,
): Promise<void> {
  const html = await renderExportHtml(markdown, title, customCss, syntax)
  const embedded = await embedExportImages(html, fs, docPath)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '100vw'
  iframe.style.width = '0'
  iframe.style.height = '0'
  document.body.appendChild(iframe)
  await new Promise<void>(resolve => {
    iframe.onload = () => resolve()
    iframe.srcdoc = embedded
  })
  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()
  setTimeout(() => iframe.remove(), 60_000)
}
