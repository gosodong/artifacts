import type { Request, Response, NextFunction } from 'express'

export const validateAnnotationsSave = (req: Request, res: Response, next: NextFunction) => {
  const { image_path, annotations } = (req.body || {}) as { image_path?: string; annotations?: unknown }
  if (!image_path || typeof image_path !== 'string') return res.status(400).json({ success: false, error: 'image_path 필수' })
  if (typeof annotations === 'undefined') return res.status(400).json({ success: false, error: 'annotations 필수' })
  if (!image_path.startsWith('/uploads/artifacts/')) return res.status(400).json({ success: false, error: '허용되지 않은 경로' })
  return next()
}

export const validateProtect = (req: Request, res: Response, next: NextFunction) => {
  const { file_path, password } = (req.body || {}) as { file_path?: string; password?: string }
  if (!file_path || typeof file_path !== 'string') return res.status(400).json({ success: false, error: 'file_path 필수' })
  if (!password || typeof password !== 'string' || password.length < 8) return res.status(400).json({ success: false, error: 'password 최소 8자' })
  return next()
}

export const validateUnprotect = (req: Request, res: Response, next: NextFunction) => {
  const { file_path, password } = (req.body || {}) as { file_path?: string; password?: string }
  if (!file_path || typeof file_path !== 'string') return res.status(400).json({ success: false, error: 'file_path 필수' })
  if (!password || typeof password !== 'string' || password.length < 8) return res.status(400).json({ success: false, error: 'password 최소 8자' })
  return next()
}

export const validateDeleteImage = (req: Request, res: Response, next: NextFunction) => {
  const { image_path } = (req.body || {}) as { image_path?: string }
  if (!image_path || typeof image_path !== 'string') return res.status(400).json({ success: false, error: 'image_path 필수' })
  return next()
}
