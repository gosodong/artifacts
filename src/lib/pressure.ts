export const mapPressureToWidth = (base: number, pressure: number): number => {
  const p = Number.isFinite(pressure) ? pressure : 1
  const norm = Math.min(1, Math.max(0.2, p))
  const w = Math.max(0.5, base * norm)
  return w
}
