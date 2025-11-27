export interface LayerItem<T = unknown> {
  id: string
  name: string
  visible: boolean
  objects: T[]
}

export const moveLayerUp = <T>(layers: LayerItem<T>[], id: string): LayerItem<T>[] => {
  const idx = layers.findIndex(l => l.id === id)
  if (idx <= 0) return layers
  const next = layers.slice()
  const t = next[idx]
  next[idx] = next[idx - 1]
  next[idx - 1] = t
  return next
}

export const moveLayerDown = <T>(layers: LayerItem<T>[], id: string): LayerItem<T>[] => {
  const idx = layers.findIndex(l => l.id === id)
  if (idx === -1 || idx >= layers.length - 1) return layers
  const next = layers.slice()
  const t = next[idx]
  next[idx] = next[idx + 1]
  next[idx + 1] = t
  return next
}
