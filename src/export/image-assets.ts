import { resolveLocalPath, type FileService } from '../services/file-service'

const IMAGE_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif', bmp: 'image/bmp',
  ico: 'image/x-icon',
}

/** Local images travel with the export. Network/data URLs retain their original meaning. */
export function exportImageResolver(fs: FileService, docPath: string | null) {
  const cache = new Map<string, Promise<string>>()
  return async (src: string): Promise<string> => {
    if (/^(?:https?:|data:|blob:|\/\/)/i.test(src)) return src
    const [pathname, fragment] = src.split('#', 2)
    const decoded = decodeURIComponent(pathname.split('?', 1)[0])
    const path = resolveLocalPath(docPath, decoded)
    if (!path) throw new Error(`Save the document before exporting relative image: ${src}`)
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    const mime = IMAGE_MIME[ext]
    if (!mime) throw new Error(`Unsupported image type: ${src}`)
    let image = cache.get(path)
    if (!image) {
      image = fs.readBinary(path).then(data => {
        // Avoid spreading large images into a single function call.
        let binary = ''
        for (let i = 0; i < data.length; i += 8192) {
          binary += String.fromCharCode(...data.subarray(i, i + 8192))
        }
        return `data:${mime};base64,${btoa(binary)}`
      })
      cache.set(path, image)
    }
    return (await image) + (fragment ? `#${fragment}` : '')
  }
}

export async function embedExportImages(html: string, fs: FileService, docPath: string | null): Promise<string> {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const resolve = exportImageResolver(fs, docPath)
  for (const image of doc.querySelectorAll('img[src]')) {
    image.setAttribute('src', await resolve(image.getAttribute('src')!))
  }
  return '<!doctype html>\n' + doc.documentElement.outerHTML
}
