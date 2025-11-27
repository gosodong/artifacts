import { describe, it, expect } from 'vitest'
import { dist, angleDeg, area, centroid } from './measure'

describe('measure utils', () => {
  it('distance', () => {
    expect(Math.round(dist({ x: 0, y: 0 }, { x: 3, y: 4 }))).toBe(5)
  })

  it('angle', () => {
    const ang = angleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })
    expect(Math.round(ang)).toBe(90)
  })

  it('area', () => {
    const a = area([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])
    expect(a).toBe(100)
  })

  it('centroid', () => {
    const c = centroid([{ x: 0, y: 0 }, { x: 10, y: 0 }])
    expect(c).toEqual({ x: 5, y: 0 })
  })
})
