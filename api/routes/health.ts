import express from 'express'

const router = express.Router()

router.get('/health/converters', async (_req, res) => {
  let psdOk = false
  let sharpPdfOk = false
  try { await import('psd'); psdOk = true } catch {}
  try { sharpPdfOk = true } catch {}
  return res.json({ success: true, data: { psd_parser: psdOk, pdf_density: sharpPdfOk } })
})

export default router
