import React, { useEffect, useState } from 'react'
import { artifactApi } from '../../services/api'

export default function CloudIntegration() {
  const [status, setStatus] = useState<{ google: { client_id: boolean; client_secret: boolean; redirect_uri: string }; onedrive: { client_id: boolean; client_secret: boolean; redirect_uri: string } } | null>(null)
  const [gToken, setGToken] = useState('')
  const [mToken, setMToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const st = await artifactApi.getIntegrationStatus()
        setStatus(st)
      } catch {}
    }
    load()
  }, [])

  const startGoogle = async () => {
    try {
      const url = await artifactApi.getGoogleStartUrl()
      window.open(url, '_blank')
    } catch {
      setMessage('Google OAuth 시작 URL을 가져올 수 없습니다.')
    }
  }

  const startOneDrive = async () => {
    try {
      const url = await artifactApi.getOneDriveStartUrl()
      window.open(url, '_blank')
    } catch {
      setMessage('OneDrive OAuth 시작 URL을 가져올 수 없습니다.')
    }
  }

  const saveToken = async (provider: 'google' | 'onedrive') => {
    try {
      setBusy(true)
      const token = provider === 'google' ? safeJson(gToken) : safeJson(mToken)
      const res = await artifactApi.saveIntegrationToken(provider, token)
      setMessage(`토큰 저장 완료: ${res.file}`)
    } catch {
      setMessage('토큰 저장 실패')
    } finally {
      setBusy(false)
    }
  }

  const safeJson = (t: string) => {
    try { return JSON.parse(t) } catch { return t }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">클라우드 연동 설정</h3>
      {status && (
        <div className="text-sm text-gray-600 mb-3">
          <div>Google: ClientID {status.google.client_id ? '✓' : '×'} / Secret {status.google.client_secret ? '✓' : '×'}</div>
          <div>OneDrive: ClientID {status.onedrive.client_id ? '✓' : '×'} / Secret {status.onedrive.client_secret ? '✓' : '×'}</div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Google Drive</span>
            <button onClick={startGoogle} className="h-8 px-3 rounded-md border bg-white text-gray-700 hover:bg-gray-50">OAuth 시작</button>
          </div>
          <textarea value={gToken} onChange={(e) => setGToken(e.target.value)} className="w-full h-24 border rounded p-2 text-sm" placeholder="OAuth 토큰 JSON 붙여넣기" />
          <div className="mt-2 flex justify-end">
            <button disabled={busy} onClick={() => saveToken('google')} className="h-8 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">토큰 저장</button>
          </div>
        </div>
        <div className="border rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">OneDrive</span>
            <button onClick={startOneDrive} className="h-8 px-3 rounded-md border bg-white text-gray-700 hover:bg-gray-50">OAuth 시작</button>
          </div>
          <textarea value={mToken} onChange={(e) => setMToken(e.target.value)} className="w-full h-24 border rounded p-2 text-sm" placeholder="OAuth 토큰 JSON 붙여넣기" />
          <div className="mt-2 flex justify-end">
            <button disabled={busy} onClick={() => saveToken('onedrive')} className="h-8 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">토큰 저장</button>
          </div>
        </div>
      </div>
      {message && <div className="mt-3 text-sm text-gray-600">{message}</div>}
    </div>
  )
}
