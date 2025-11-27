import { describe, it, expect } from 'vitest'
import { mapPressureToWidth } from './pressure'

describe('mapPressureToWidth', () => {
  it('scales with pressure within bounds', () => {
    expect(mapPressureToWidth(5, 1)).toBeGreaterThanOrEqual(5)
    expect(mapPressureToWidth(5, 0.5)).toBeGreaterThan(2)
  })

  it('applies floor and clamp', () => {
    expect(mapPressureToWidth(5, 0)).toBeGreaterThanOrEqual(1)
    expect(mapPressureToWidth(5, 10)).toBeGreaterThanOrEqual(5)
  })

  it('handles non-finite values', () => {
    expect(mapPressureToWidth(5, NaN)).toBeGreaterThanOrEqual(5)
  })
})
