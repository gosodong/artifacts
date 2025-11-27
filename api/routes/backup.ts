import express from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

const uploadsRoot = path.join(__dirname, '../../uploads')
const artifactsDir = path.join(uploadsRoot, 'artifacts')
const backupsDir = path.join(uploadsRoot, 'backups')
const dbPath = path.join(__dirname, '../database/museum.db')

const ensureDir = (p: string) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }) }

router.get('/backup/list', (_req, res) => {
  try {
    ensureDir(backupsDir)
    const items = fs.readdirSync(backupsDir).filter(d => fs.statSync(path.join(backupsDir, d)).isDirectory())
    const list = items.map(name => ({ name, created_at: new Date(Number(name.split('-')[0]) || Date.now()).toISOString() }))
    return res.json({ success: true, data: list })
  } catch (e) {
    return res.status(500).json({ success: false, error: '백업 목록 조회 실패' })
  }
})

router.post('/backup/create', (_req, res) => {
  try {
    ensureDir(backupsDir)
    const stamp = `${Date.now()}-backup`
    const dest = path.join(backupsDir, stamp)
    ensureDir(dest)
    // DB 파일 복사
    const dbDest = path.join(dest, 'museum.db')
    if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, dbDest)
    // 이미지 디렉터리 복사 (shallow)
    const imgDest = path.join(dest, 'artifacts')
    ensureDir(imgDest)
    if (fs.existsSync(artifactsDir)) {
      for (const f of fs.readdirSync(artifactsDir)) {
        const src = path.join(artifactsDir, f)
        const dst = path.join(imgDest, f)
        if (fs.statSync(src).isFile()) fs.copyFileSync(src, dst)
      }
    }
    // 매니페스트 작성
    const manifest = { created_at: new Date().toISOString(), files: { db: 'museum.db', artifacts: fs.existsSync(imgDest) ? fs.readdirSync(imgDest) : [] } }
    fs.writeFileSync(path.join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2))
    return res.json({ success: true, data: { name: stamp, path: `/uploads/backups/${stamp}` } })
  } catch (e) {
    return res.status(500).json({ success: false, error: '백업 생성 실패' })
  }
})

router.post('/backup/restore', (req, res) => {
  try {
    const { name } = req.body as { name?: string }
    if (!name) return res.status(400).json({ success: false, error: 'name 필드가 필요합니다.' })
    const src = path.join(backupsDir, name)
    if (!fs.existsSync(src)) return res.status(404).json({ success: false, error: '백업을 찾을 수 없습니다.' })
    // DB 복구
    const dbSrc = path.join(src, 'museum.db')
    if (fs.existsSync(dbSrc)) fs.copyFileSync(dbSrc, dbPath)
    // 이미지 복구
    const imgSrcDir = path.join(src, 'artifacts')
    ensureDir(artifactsDir)
    if (fs.existsSync(imgSrcDir)) {
      for (const f of fs.readdirSync(imgSrcDir)) {
        const srcFile = path.join(imgSrcDir, f)
        const dstFile = path.join(artifactsDir, f)
        if (fs.statSync(srcFile).isFile()) fs.copyFileSync(srcFile, dstFile)
      }
    }
    return res.json({ success: true, data: { restored: true, name } })
  } catch (e) {
    return res.status(500).json({ success: false, error: '복구 실패' })
  }
})

export default router
