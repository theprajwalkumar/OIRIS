import React, { useEffect, useMemo, useRef } from 'react'
import { SEVERITY_COLOR, GLOBE_LAYERS, landVectors } from '../../utils/globeData.js'
import { buildAttackFlows } from '../../utils/dashboardData.js'

const D2R = Math.PI / 180
const ROT_SPEED = 0.0009
const TILT_LIMIT = 60 * D2R

const toTrig = (lat, lng) => {
  const la = lat * D2R
  const lo = lng * D2R
  return [Math.cos(la), Math.sin(la), Math.cos(lo), Math.sin(lo)]
}

// Precompute cyber great-circle arcs once (static seeded reference flows).
const CYBER_ARCS = buildAttackFlows().slice(0, 12).map((f) => {
  const a = toTrig(f.from.lat, f.from.lng)
  const b = toTrig(f.to.lat, f.to.lng)
  const av = [a[0] * a[2], a[1], a[0] * a[3]]
  const bv = [b[0] * b[2], b[1], b[0] * b[3]]
  const dot = Math.max(-1, Math.min(1, av[0] * bv[0] + av[1] * bv[1] + av[2] * bv[2]))
  const angle = Math.acos(dot)
  const lift = 0.1 + 0.14 * (angle / Math.PI)
  const samples = []
  const N = 40
  for (let i = 0; i <= N; i++) {
    const t = i / N
    let x
    let y
    let z
    if (angle < 1e-4) {
      x = av[0]
      y = av[1]
      z = av[2]
    } else {
      const s0 = Math.sin((1 - t) * angle) / Math.sin(angle)
      const s1 = Math.sin(t * angle) / Math.sin(angle)
      x = s0 * av[0] + s1 * bv[0]
      y = s0 * av[1] + s1 * bv[1]
      z = s0 * av[2] + s1 * bv[2]
    }
    const lat = Math.asin(Math.max(-1, Math.min(1, y))) / D2R
    const lng = Math.atan2(z, x) / D2R
    samples.push({ trig: toTrig(lat, lng), lift: 1 + lift * Math.sin(Math.PI * t) })
  }
  return { id: f.id, samples, intensity: f.intensity, speed: 0.35 + (f.intensity % 40) / 60 }
})

/** Project unit-vector trig to orthographic offsets. Returns null when back-facing. */
const project = (trig, cosLat0, sinLat0, cosLon0, sinLon0) => {
  const [cosLat, sinLat, cosLon, sinLon] = trig
  const cosd = cosLon * cosLon0 + sinLon * sinLon0
  const sind = sinLon * cosLon0 - cosLon * sinLon0
  const cosc = sinLat0 * sinLat + cosLat0 * cosLat * cosd
  if (cosc < 0) return null
  return [cosLat * sind, cosLat0 * sinLat - sinLat0 * cosLat * cosd, cosc]
}

const GlobeCanvas = ({ points, activeLayers, selectedId, onSelect, focus }) => {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const stateRef = useRef({
    lon: 78 * D2R,
    lat: 18 * D2R,
    drag: null,
    moved: 0,
    hovered: null,
    fly: null,
    reduce: false,
    dpr: 1,
    size: { w: 0, h: 0 }
  })
  const markersRef = useRef([])
  const pointsRef = useRef(points)
  const activeRef = useRef(activeLayers)
  const selectedRef = useRef(selectedId)

  const land = useMemo(() => landVectors(), [])

  useEffect(() => { pointsRef.current = points }, [points])
  useEffect(() => { activeRef.current = activeLayers }, [activeLayers])
  useEffect(() => { selectedRef.current = selectedId }, [selectedId])

  useEffect(() => {
    if (focus) stateRef.current.fly = { lon: focus.lng * D2R, lat: focus.lat * D2R }
  }, [focus])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')

    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const applyMotion = () => { stateRef.current.reduce = !!mq?.matches }
    applyMotion()
    mq?.addEventListener?.('change', applyMotion)

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      stateRef.current.size = { w, h }
      stateRef.current.dpr = dpr
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const escape = (e) => { if (e.key === 'Escape') onSelect?.(null) }
    window.addEventListener('keydown', escape)

    let raf = 0
    const draw = (time) => {
      raf = requestAnimationFrame(draw)
      const s = stateRef.current
      const { w, h } = s.size
      if (!w || !h) return
      // Re-sync the backing store when DPR changes (window moved across displays).
      if ((window.devicePixelRatio || 1) !== s.dpr) { resize(); return }

      // Clear the full frame before redrawing: without this, pixels drawn
      // outside the sphere in earlier frames (lifted arcs, marker pulses)
      // persist and smear into ghost masks beside the globe.
      ctx.clearRect(0, 0, w, h)

      // --- advance rotation ---
      const canAuto = !s.drag && !s.hovered && !selectedRef.current && !s.reduce
      if (canAuto) s.lon += ROT_SPEED
      if (s.fly) {
        let d = s.fly.lon - s.lon
        while (d > Math.PI) d -= Math.PI * 2
        while (d < -Math.PI) d += Math.PI * 2
        s.lon += d * 0.12
        s.lat += (s.fly.lat - s.lat) * 0.12
        if (Math.abs(d) < 0.002 && Math.abs(s.fly.lat - s.lat) < 0.002) s.fly = null
      }
      s.lat = Math.max(-TILT_LIMIT, Math.min(TILT_LIMIT, s.lat))

      const cx = w / 2
      const cy = h / 2
      const R = Math.min(w, h) * 0.42
      const cosLat0 = Math.cos(s.lat)
      const sinLat0 = Math.sin(s.lat)
      const cosLon0 = Math.cos(s.lon)
      const sinLon0 = Math.sin(s.lon)

      // --- sphere ---
      const g = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.3, R * 0.15, cx, cy, R * 1.02)
      g.addColorStop(0, '#0C1824')
      g.addColorStop(0.75, '#08121B')
      g.addColorStop(1, '#050D14')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fill()

      // --- graticule ---
      ctx.strokeStyle = 'rgba(31,54,80,0.55)'
      ctx.lineWidth = 1
      const line = (pts, radiusScale = 1) => {
        ctx.beginPath()
        let pen = false
        for (const trig of pts) {
          const p = project(trig, cosLat0, sinLat0, cosLon0, sinLon0)
          if (!p) { pen = false; continue }
          const x = cx + p[0] * R * radiusScale
          const y = cy - p[1] * R * radiusScale
          if (pen) ctx.lineTo(x, y)
          else { ctx.moveTo(x, y); pen = true }
        }
        ctx.stroke()
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        const pts = []
        for (let lng = -180; lng <= 180; lng += 4) pts.push(toTrig(lat, lng))
        line(pts)
      }
      for (let lng = -180; lng < 180; lng += 30) {
        const pts = []
        for (let lat = -90; lat <= 90; lat += 4) pts.push(toTrig(lat, lng))
        line(pts)
      }

      // --- land dots ---
      for (let i = 0; i < land.length; i += 4) {
        const p = project(
          [land[i], land[i + 1], land[i + 2], land[i + 3]],
          cosLat0, sinLat0, cosLon0, sinLon0
        )
        if (!p) continue
        const a = 0.14 + 0.5 * p[2]
        ctx.fillStyle = `rgba(237,231,217,${a.toFixed(3)})`
        ctx.fillRect(cx + p[0] * R - 0.8, cy - p[1] * R - 0.8, 1.6, 1.6)
      }

      // --- cyber arcs ---
      if (activeRef.current?.has('cyber')) {
        for (const arc of CYBER_ARCS) {
          ctx.strokeStyle = 'rgba(124,211,234,0.28)'
          ctx.lineWidth = 1
          ctx.beginPath()
          let pen = false
          const screens = []
          for (const smp of arc.samples) {
            const p = project(smp.trig, cosLat0, sinLat0, cosLon0, sinLon0)
            if (!p) { pen = false; screens.push(null); continue }
            const x = cx + p[0] * R * smp.lift
            const y = cy - p[1] * R * smp.lift
            screens.push([x, y])
            if (pen) ctx.lineTo(x, y)
            else { ctx.moveTo(x, y); pen = true }
          }
          ctx.stroke()
          if (!s.reduce) {
            const n = arc.samples.length
            for (let k = 0; k < 2; k++) {
              const idx = Math.floor(((time / 1000) * arc.speed + k * 0.5) % 1 * (n - 1))
              const pt = screens[idx]
              if (!pt) continue
              ctx.fillStyle = 'rgba(124,211,234,0.9)'
              ctx.beginPath()
              ctx.arc(pt[0], pt[1], 1.8, 0, Math.PI * 2)
              ctx.fill()
            }
          }
        }
      }

      // --- markers ---
      const markers = []
      const active = activeRef.current
      const pulseT = s.reduce ? 0 : (time % 2400) / 2400
      for (const pt of pointsRef.current) {
        if (active && !active.has(pt.layer)) continue
        const trig = toTrig(pt.lat, pt.lng)
        const p = project(trig, cosLat0, sinLat0, cosLon0, sinLon0)
        if (!p) continue
        const x = cx + p[0] * R
        const y = cy - p[1] * R
        const color = SEVERITY_COLOR[pt.severity] || SEVERITY_COLOR.info
        const selected = pt.id === selectedRef.current
        const r = selected ? 5 : pt.severity === 'critical' ? 3.6 : 2.8

        if (!s.reduce && (pt.severity === 'critical' || pt.severity === 'high')) {
          const pr = r + 3 + 9 * pulseT
          ctx.strokeStyle = color
          ctx.globalAlpha = 0.7 * (1 - pulseT)
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.arc(x, y, pr, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = 1
        }

        ctx.fillStyle = color
        if (pt.layer === 'maritime') {
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(Math.PI / 4)
          ctx.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4)
          ctx.restore()
        } else {
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        }

        if (selected) {
          ctx.strokeStyle = '#EDE7D9'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.arc(x, y, r + 7, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = '#EDE7D9'
          ctx.font = '500 11px Geist, Inter, sans-serif'
          ctx.textAlign = 'center'
          const label = pt.title.length > 34 ? `${pt.title.slice(0, 33)}…` : pt.title
          ctx.fillText(label, x, y - r - 14)
          ctx.fillStyle = 'rgba(126,147,166,0.9)'
          ctx.font = '10px Geist, Inter, sans-serif'
          ctx.fillText(`${pt.lat.toFixed(1)}°, ${pt.lng.toFixed(1)}°`, x, y + r + 16)
        }

        markers.push({ x, y, r: 12, id: pt.id, point: pt })
      }
      markersRef.current = markers

      // --- rim ---
      ctx.strokeStyle = 'rgba(201,165,94,0.5)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(201,165,94,0.12)'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(cx, cy, R + 4, 0, Math.PI * 2)
      ctx.stroke()
    }
    raf = requestAnimationFrame(draw)

    // --- interaction ---
    const hitTest = (x, y) => markersRef.current.find((m) => (m.x - x) ** 2 + (m.y - y) ** 2 <= m.r * m.r)

    const local = (e) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const down = (e) => {
      const s = stateRef.current
      s.drag = { x: e.clientX, y: e.clientY }
      s.moved = 0
      canvas.setPointerCapture?.(e.pointerId)
    }
    const move = (e) => {
      const s = stateRef.current
      if (s.drag) {
        const dx = e.clientX - s.drag.x
        const dy = e.clientY - s.drag.y
        s.moved += Math.abs(dx) + Math.abs(dy)
        s.lon -= dx * 0.005
        s.lat = Math.max(-TILT_LIMIT, Math.min(TILT_LIMIT, s.lat + dy * 0.004))
        s.drag = { x: e.clientX, y: e.clientY }
        s.fly = null
      } else {
        const { x, y } = local(e)
        const hit = hitTest(x, y)
        s.hovered = hit ? hit.id : null
        canvas.style.cursor = hit ? 'pointer' : 'grab'
      }
    }
    const up = (e) => {
      const s = stateRef.current
      if (s.drag && s.moved < 4) {
        const { x, y } = local(e)
        const hit = hitTest(x, y)
        onSelect?.(hit ? hit.point : null)
      }
      s.drag = null
    }
    const leave = () => { stateRef.current.hovered = null }

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointerleave', leave)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mq?.removeEventListener?.('change', applyMotion)
      window.removeEventListener('keydown', escape)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointerleave', leave)
    }
  }, [land, onSelect])

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none select-none"
        role="img"
        aria-label={`Rotating globe with ${points.length} plotted events across ${GLOBE_LAYERS.length} layers. Drag to rotate; use the dispatch list for a keyboard-accessible view.`}
      />
    </div>
  )
}

export default GlobeCanvas