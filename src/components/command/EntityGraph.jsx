import React, { useMemo } from 'react'
import { classificationColor } from '../../utils/constants.js'

const W = 520
const H = 360

/**
 * Lightweight deterministic relationship graph (no external layout lib).
 * Root sits centre; neighbours are placed on concentric rings.
 */
const EntityGraph = ({ graph, selectedId, onSelect }) => {
  const layout = useMemo(() => {
    if (!graph || !graph.nodes?.length) return { nodes: [], edges: [] }
    const rootId = graph.root
    const others = graph.nodes.filter((n) => n.id !== rootId).slice(0, 14)
    const cx = W / 2
    const cy = H / 2
    const pos = new Map()
    pos.set(rootId, { x: cx, y: cy })
    others.forEach((n, i) => {
      const angle = (i / others.length) * Math.PI * 2 - Math.PI / 2
      const r = 130
      pos.set(n.id, { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r * 0.82 })
    })
    const nodes = graph.nodes
      .filter((n) => pos.has(n.id))
      .map((n) => ({ ...n, ...pos.get(n.id) }))
    const seen = new Set()
    const edges = []
    for (const e of graph.edges) {
      const key = `${e.from}|${e.to}|${e.rel}`
      if (seen.has(key)) continue
      seen.add(key)
      const a = pos.get(e.from)
      const b = pos.get(e.to)
      if (a && b) edges.push({ id: key, rel: e.rel, x1: a.x, y1: a.y, x2: b.x, y2: b.y })
    }
    return { nodes, edges }
  }, [graph])

  if (!graph || !graph.nodes?.length) {
    return <div className="h-full flex items-center justify-center font-mono text-[10px] text-[var(--color-text-muted)]">NO RELATIONSHIPS MAPPED</div>
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {layout.edges.map((e) => (
        <g key={e.id}>
          <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="rgba(0,212,255,0.28)" strokeWidth="1" />
          <text
            x={(e.x1 + e.x2) / 2}
            y={(e.y1 + e.y2) / 2}
            fill="rgba(148,163,184,0.7)"
            fontFamily="var(--font-mono, monospace)"
            fontSize="6"
            textAnchor="middle"
          >
            {e.rel}
          </text>
        </g>
      ))}
      {layout.nodes.map((n) => {
        const color = classificationColor(n.classification)
        const isSel = n.id === selectedId
        const isRoot = n.id === graph.root
        return (
          <g key={n.id} className="cursor-pointer" onClick={() => onSelect(n.id)}>
            <circle
              cx={n.x}
              cy={n.y}
              r={isRoot ? 15 : 9}
              fill="rgba(7,9,14,0.9)"
              stroke={color}
              strokeWidth={isSel ? 2.5 : 1.4}
              style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            />
            <circle cx={n.x} cy={n.y} r={isRoot ? 4 : 2.5} fill={color} />
            <text
              x={n.x}
              y={n.y + (isRoot ? 26 : 20)}
              fill="var(--color-text-secondary, #94a3b8)"
              fontFamily="var(--font-mono, monospace)"
              fontSize="7"
              textAnchor="middle"
            >
              {(n.label || '').slice(0, 16)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default EntityGraph
