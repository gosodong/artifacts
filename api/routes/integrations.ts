import express from 'express'
import path from 'path'
import fs from 'fs'
import { encryptData, encryptionEnabled } from '../utils/crypto.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

router.get('/integrations/status', (req, res) => {
  const status = {
    google: {
      client_id: !!process.env.GOOGLE_CLIENT_ID,
      client_secret: !!process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || ''
    },
    onedrive: {
      client_id: !!process.env.MS_CLIENT_ID,
      client_secret: !!process.env.MS_CLIENT_SECRET,
      redirect_uri: process.env.MS_REDIRECT_URI || ''
    }
  }
  return res.json({ success: true, data: status })
})

router.get('/integrations/google/start', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${process.env.PORT || 3001}/api/integrations/google/callback`
  if (!clientId) return res.status(400).json({ success: false, error: 'GOOGLE_CLIENT_ID 미설정' })
  const scope = encodeURIComponent(['https://www.googleapis.com/auth/drive.file','openid','email','profile'].join(' '))
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=offline&prompt=consent`
  return res.json({ success: true, data: { url: authUrl } })
})

router.get('/integrations/onedrive/start', (req, res) => {
  const clientId = process.env.MS_CLIENT_ID
  const redirectUri = process.env.MS_REDIRECT_URI || `http://localhost:${process.env.PORT || 3001}/api/integrations/onedrive/callback`
  if (!clientId) return res.status(400).json({ success: false, error: 'MS_CLIENT_ID 미설정' })
  const scope = encodeURIComponent(['Files.ReadWrite','offline_access','User.Read'].join(' '))
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${scope}`
  return res.json({ success: true, data: { url: authUrl } })
})

router.post('/integrations/:provider/token', (req, res) => {
  const { provider } = req.params
  const token = req.body?.token
  if (!token) return res.status(400).json({ success: false, error: 'token 필드가 필요합니다.' })
  const allowed = ['google','onedrive']
  if (!allowed.includes(provider)) return res.status(400).json({ success: false, error: '지원하지 않는 provider' })
  const dir = path.join(__dirname, '../../uploads/integrations')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const name = `${provider}-token-${Date.now()}.json`
  const payloadStr = typeof token === 'string' ? token : JSON.stringify(token)
  const toStore = encryptionEnabled() ? JSON.stringify(encryptData(payloadStr)) : payloadStr
  fs.writeFileSync(path.join(dir, name), toStore)
  return res.json({ success: true, data: { stored: true, file: `/uploads/integrations/${name}` } })
})

export default router
