export type Pt = { x: number; y: number }

export const dist = (a: Pt, b: Pt): number => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export const angleDeg = (a: Pt, b: Pt, c: Pt): number => {
  const abx = a.x - b.x
  const aby = a.y - b.y
  const cbx = c.x - b.x
  const cby = c.y - b.y
  const dot = abx * cbx + aby * cby
  const mag1 = Math.sqrt(abx * abx + aby * aby)
  const mag2 = Math.sqrt(cbx * cbx + cby * cby)
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2 || 1)))
  const rad = Math.acos(cos)
  return (rad * 180) / Math.PI
}

export const area = (pts: Pt[]): number => {
  if (pts.length < 3) return 0
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    s += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return Math.abs(s) / 2
}

export const centroid = (pts: Pt[]): Pt => {
  let x = 0, y = 0
  for (const p of pts) { x += p.x; y += p.y }
  const n = pts.length || 1
  return { x: x / n, y: y / n }
}
