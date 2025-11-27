import React, { useEffect, useState } from 'react'
import { artifactApi } from '../../services/api'

export default function BackupRestore() {
  const [backups, setBackups] = useState<Array<{ name: string; created_at: string }>>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    try { setBackups(await artifactApi.listBackups()) } catch {}
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    try {
      setBusy(true)
      const b = await artifactApi.createBackup()
      setMessage(`백업 생성: ${b.name}`)
      await load()
    } catch { setMessage('백업 생성 실패') } finally { setBusy(false) }
  }

  const restore = async (name: string) => {
    if (!window.confirm(`${name} 백업으로 복구하시겠습니까? 현재 데이터가 덮어씌워집니다.`)) return
    try {
      setBusy(true)
      await artifactApi.restoreBackup(name)
      setMessage(`복구 완료: ${name}`)
    } catch { setMessage('복구 실패') } finally { setBusy(false) }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">백업 및 복구</h3>
        <button disabled={busy} onClick={create} className="h-8 px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">백업 생성</button>
      </div>
      <div className="text-sm text-gray-600 mb-2">생성된 백업 목록에서 선택하여 복구할 수 있습니다.</div>
      <div className="space-y-2">
        {backups.map(b => (
          <div key={b.name} className="flex items-center justify-between border rounded p-2">
            <div>
              <div className="font-medium">{b.name}</div>
              <div className="text-xs text-gray-500">{b.created_at}</div>
            </div>
            <button disabled={busy} onClick={() => restore(b.name)} className="h-8 px-3 rounded-md border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50">복구</button>
          </div>
        ))}
        {backups.length === 0 && <div className="text-sm text-gray-500">백업이 없습니다.</div>}
      </div>
      {message && <div className="mt-2 text-sm text-gray-600">{message}</div>}
    </div>
  )
}
