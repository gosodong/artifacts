import type { Request, Response, NextFunction } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const logDir = path.join(__dirname, '../../uploads/logs')
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
const logFile = path.join(logDir, 'audit.log')

export const audit = (action: string) => (req: Request, _res: Response, next: NextFunction) => {
  const entry = { ts: new Date().toISOString(), action, path: req.originalUrl, user: (req as any).user || null, ip: req.ip }
  try { fs.appendFileSync(logFile, JSON.stringify(entry) + '\n') } catch {}
  next()
}
