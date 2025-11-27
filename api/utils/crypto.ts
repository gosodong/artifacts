import crypto from 'crypto'

const getRawKey = (): Buffer | null => {
  const keyStr = process.env.DATA_ENCRYPTION_KEY || ''
  if (!keyStr) return null
  try {
    // Accept base64 or hex; fallback to utf8 padded/truncated
    if (/^[A-Za-z0-9+/=]+$/.test(keyStr)) {
      const k = Buffer.from(keyStr, 'base64')
      if (k.length >= 32) return k.slice(0, 32)
      return Buffer.concat([k, Buffer.alloc(32 - k.length)], 32)
    }
    if (/^[0-9a-fA-F]+$/.test(keyStr)) {
      const k = Buffer.from(keyStr, 'hex')
      if (k.length >= 32) return k.slice(0, 32)
      return Buffer.concat([k, Buffer.alloc(32 - k.length)], 32)
    }
    const k = Buffer.from(keyStr, 'utf8')
    if (k.length >= 32) return k.slice(0, 32)
    return Buffer.concat([k, Buffer.alloc(32 - k.length)], 32)
  } catch {
    return null
  }
}

export const encryptionEnabled = (): boolean => !!getRawKey()

export const encryptData = (plaintext: string): { enc: 'aes-256-gcm'; iv: string; tag: string; data: string } => {
  const key = getRawKey()
  if (!key) throw new Error('Encryption key not configured')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    enc: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: enc.toString('base64'),
  }
}

export const decryptData = (payload: { enc?: string; iv?: string; tag?: string; data?: string }): string => {
  const key = getRawKey()
  if (!key) throw new Error('Encryption key not configured')
  if (!(payload && payload.enc === 'aes-256-gcm' && payload.iv && payload.tag && payload.data)) throw new Error('Invalid payload')
  const iv = Buffer.from(payload.iv, 'base64')
  const tag = Buffer.from(payload.tag, 'base64')
  const data = Buffer.from(payload.data, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(data), decipher.final()])
  return dec.toString('utf8')
}

export const encryptWithPassword = (plaintext: string, password: string): { enc: 'aes-256-gcm'; iv: string; tag: string; data: string; salt: string; iter: number } => {
  const salt = crypto.randomBytes(16)
  const iter = 120_000
  const key = crypto.pbkdf2Sync(password, salt, iter, 32, 'sha256')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()])
  const tag = cipher.getAuthTag()
  return { enc: 'aes-256-gcm', iv: iv.toString('base64'), tag: tag.toString('base64'), data: enc.toString('base64'), salt: salt.toString('base64'), iter }
}

export const decryptWithPassword = (payload: { enc?: string; iv?: string; tag?: string; data?: string; salt?: string; iter?: number }, password: string): string => {
  if (!(payload && payload.enc === 'aes-256-gcm' && payload.iv && payload.tag && payload.data && payload.salt && payload.iter)) throw new Error('Invalid payload')
  const salt = Buffer.from(payload.salt!, 'base64')
  const iter = payload.iter!
  const key = crypto.pbkdf2Sync(password, salt, iter, 32, 'sha256')
  const iv = Buffer.from(payload.iv!, 'base64')
  const tag = Buffer.from(payload.tag!, 'base64')
  const data = Buffer.from(payload.data!, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(data), decipher.final()])
  return dec.toString('utf8')
}
