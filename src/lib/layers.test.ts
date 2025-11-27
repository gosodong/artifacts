import { describe, it, expect } from 'vitest'
import { moveLayerUp, moveLayerDown, type LayerItem } from './layers'

const makeLayers = (n: number): LayerItem[] =>
  Array.from({ length: n }).map((_, i) => ({
    id: `layer-${i + 1}`,
    name: `L${i + 1}`,
    visible: true,
    objects: []
  }))

describe('layers reorder', () => {
  it('moves layer up within bounds', () => {
    const ls = makeLayers(3)
    const res = moveLayerUp(ls, 'layer-2')
    expect(res.map(l => l.id)).toEqual(['layer-2', 'layer-1', 'layer-3'])
  })

  it('does nothing when topmost moves up', () => {
    const ls = makeLayers(3)
    const res = moveLayerUp(ls, 'layer-1')
    expect(res.map(l => l.id)).toEqual(['layer-1', 'layer-2', 'layer-3'])
  })

  it('moves layer down within bounds', () => {
    const ls = makeLayers(3)
    const res = moveLayerDown(ls, 'layer-2')
    expect(res.map(l => l.id)).toEqual(['layer-1', 'layer-3', 'layer-2'])
  })

  it('does nothing when bottommost moves down', () => {
    const ls = makeLayers(3)
    const res = moveLayerDown(ls, 'layer-3')
    expect(res.map(l => l.id)).toEqual(['layer-1', 'layer-2', 'layer-3'])
  })
})
