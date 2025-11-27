import { describe, it, expect } from 'vitest'
import { snap, snapPoint, orthogonalEnd, arrowHeadPoints } from './snap'

describe('snap utils', () => {
  it('snap value to grid', () => {
    expect(snap(12, 10)).toBe(10)
    expect(snap(16, 10)).toBe(20)
    expect(snap(16, 0)).toBe(16)
  })

  it('snap point to grid', () => {
    const p = snapPoint(23, 27, 5)
    expect(p).toEqual({ x: 25, y: 25 })
  })

  it('orthogonal chooses axis by larger delta', () => {
    const h = orthogonalEnd(0, 0, 50, 10)
    expect(h).toEqual({ x: 50, y: 0 })
    const v = orthogonalEnd(0, 0, 10, 50)
    expect(v).toEqual({ x: 0, y: 50 })
  })

  it('arrow head points produce two vertices', () => {
    const a = arrowHeadPoints(0, 0, 100, 0, 10)
    expect(a.ax).toBeLessThan(100)
    expect(a.bx).toBeLessThan(100)
  })
})
