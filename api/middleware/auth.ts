import type { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = process.env.API_TOKEN
  if (!token) return next()
  const header = req.headers['authorization'] || ''
  const expected = `Bearer ${token}`
  if (header !== expected) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  return next()
}

const getJwtSecret = (): Buffer | null => {
  const s = process.env.JWT_SECRET || ''
  if (!s) return null
  try {
    return Buffer.isBuffer(s as any) ? (s as any) : Buffer.from(s, /^[0-9a-fA-F]+$/.test(s) ? 'hex' : 'utf8')
  } catch { return null }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const secret = getJwtSecret()
  if (!secret) return optionalAuth(req, res, next)
  const header = String(req.headers['authorization'] || '')
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' })
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('bad token')
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
    const sig = Buffer.from(parts[2], 'base64')
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(`${parts[0]}.${parts[1]}`)
    const ok = crypto.timingSafeEqual(sig, hmac.digest())
    if (!ok) throw new Error('sig mismatch')
    ;(req as any).user = payload
    return next()
  } catch {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
}

export const requireRole = (roles: Array<'viewer'|'editor'|'admin'>) => (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user
  if (!user || !user.role || !roles.includes(user.role)) {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }
  return next()
}
