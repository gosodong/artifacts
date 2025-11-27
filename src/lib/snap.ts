export const snap = (v: number, g: number): number => {
  if (!g || g <= 1) return v
  return Math.round(v / g) * g
}

export const snapPoint = (x: number, y: number, g: number): { x: number; y: number } => ({
  x: snap(x, g),
  y: snap(y, g)
})

export const orthogonalEnd = (
  sx: number,
  sy: number,
  ex: number,
  ey: number
): { x: number; y: number } => {
  const dx = Math.abs(ex - sx)
  const dy = Math.abs(ey - sy)
  if (dx >= dy) return { x: ex, y: sy }
  return { x: sx, y: ey }
}

export const arrowHeadPoints = (
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  size: number
): { ax: number; ay: number; bx: number; by: number } => {
  const dx = ex - sx
  const dy = ey - sy
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux
  const ax = ex - ux * size + px * (size * 0.5)
  const ay = ey - uy * size + py * (size * 0.5)
  const bx = ex - ux * size - px * (size * 0.5)
  const by = ey - uy * size - py * (size * 0.5)
  return { ax, ay, bx, by }
}
