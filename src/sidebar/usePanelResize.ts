import { type MouseEvent as ReactMouseEvent, useRef } from 'react'
import { clampPanelWidth } from '../app/settings'

/**
 * Drag-to-resize for a side panel. `handleEdge` is which edge of the panel the
 * drag handle sits on: the left file panel's handle is on its right edge
 * (drag right → wider), the right outline panel's handle is on its left edge
 * (drag left → wider), so the direction is inverted between them. The width is
 * written straight to the DOM during the drag — no re-render per mousemove — and
 * the final value is committed on release.
 */
export function usePanelResize(handleEdge: 'left' | 'right', commit: (width: number) => void) {
  const ref = useRef<HTMLElement>(null)

  const startResize = (e: ReactMouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = ref.current?.offsetWidth ?? 0
    const dir = handleEdge === 'right' ? 1 : -1
    const onMove = (ev: MouseEvent) => {
      if (ref.current) ref.current.style.width = `${clampPanelWidth(startW + dir * (ev.clientX - startX))}px`
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.classList.remove('is-resizing')
      if (ref.current) commit(clampPanelWidth(ref.current.offsetWidth))
    }
    document.body.classList.add('is-resizing')
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return { ref, startResize }
}
