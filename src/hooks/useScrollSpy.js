import { useEffect, useState } from 'react'

/**
 * Layer: hooks (rank 4) — scroll-spy for the left rail.
 *
 * Observes the given section ids within `rootRef` and returns the id whose
 * section currently crosses the vertical middle of the scroll container.
 */
export function useScrollSpy(ids, rootRef) {
  const [active, setActive] = useState(ids[0])

  useEffect(() => {
    const root = rootRef?.current || null
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean)
    if (!els.length || typeof IntersectionObserver === 'undefined') return

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { root, rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ids, rootRef])

  return active
}
