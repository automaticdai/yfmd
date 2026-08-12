import type { ImageSaver } from '../editor/live-preview/facets'
import { dirname, type FileService } from '../services/file-service'

/**
 * Persist image bytes next to the open document (in an `assets/` folder) and
 * return the markdown src to insert. Relative to the document when it has a
 * path, absolute (under the default directory) otherwise.
 */
export function makeImageSaver(fs: FileService, docPath: string | null): ImageSaver {
  return async (data, ext) => {
    try {
      const name = `image-${Date.now()}.${ext}`
      const baseDir = docPath ? dirname(docPath) : await fs.defaultDir()
      const dir = baseDir === '/' ? '/assets' : baseDir + '/assets'
      await fs.mkdir(dir)
      const path = dir + '/' + name
      await fs.writeBinary(path, data)
      return docPath ? `assets/${name}` : path
    } catch {
      return null
    }
  }
}
