import React from 'react'

interface PreservationLog {
  action_type: string
  description: string
  performed_by: string
  performed_date: string
  before_images?: string[]
  after_images?: string[]
  status_before: string
  status_after: string
}

interface ArtifactSummary {
  id: string
  name: string
  number: string
  category?: string
  era?: string
  processor?: string
  excavation_site?: string
}

interface Props {
  artifact: ArtifactSummary
  log: PreservationLog
}

const PreservationCardTemplate: React.FC<Props> = ({ artifact, log }) => {
  return (
    <div style={{ fontFamily: 'system-ui, Segoe UI, Arial' }}>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, margin: 0 }}>보존처리카드</h1>
            <p style={{ margin: 0, color: '#6b7280' }}>Artifact Preservation Treatment Card</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#6b7280' }}>
            <div>작성일: {new Date().toLocaleDateString()}</div>
            <div>처리일: {new Date(log.performed_date).toLocaleDateString()}</div>
          </div>
        </header>
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <h2 style={{ fontSize: 16, margin: '0 0 8px 0' }}>유물 정보</h2>
            <table style={{ width: '100%', fontSize: 12 }}>
              <tbody>
                <tr><td style={{ color: '#6b7280', width: 90 }}>명칭</td><td>{artifact.name}</td></tr>
                <tr><td style={{ color: '#6b7280' }}>관리번호</td><td>{artifact.number}</td></tr>
                <tr><td style={{ color: '#6b7280' }}>분류</td><td>{artifact.category || '-'}</td></tr>
                <tr><td style={{ color: '#6b7280' }}>시대</td><td>{artifact.era || '-'}</td></tr>
                <tr><td style={{ color: '#6b7280' }}>출토지</td><td>{artifact.excavation_site || '-'}</td></tr>
                <tr><td style={{ color: '#6b7280' }}>담당자</td><td>{artifact.processor || '-'}</td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <h2 style={{ fontSize: 16, margin: '0 0 8px 0' }}>처리 개요</h2>
            <table style={{ width: '100%', fontSize: 12 }}>
              <tbody>
                <tr><td style={{ color: '#6b7280', width: 90 }}>처리유형</td><td>{log.action_type}</td></tr>
                <tr><td style={{ color: '#6b7280' }}>처리자</td><td>{log.performed_by}</td></tr>
                <tr><td style={{ color: '#6b7280' }}>처리상태</td><td>{log.status_before} → {log.status_after}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, margin: '0 0 8px 0' }}>상세 내용</h2>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>{log.description}</p>
        </section>
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <h3 style={{ fontSize: 14, margin: '0 0 8px 0' }}>처리 전 이미지</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {(log.before_images || []).map((src, i) => (
                <img key={i} src={`http://localhost:3001${src}`} alt={`before-${i}`} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
              ))}
            </div>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <h3 style={{ fontSize: 14, margin: '0 0 8px 0' }}>처리 후 이미지</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {(log.after_images || []).map((src, i) => (
                <img key={i} src={`http://localhost:3001${src}`} alt={`after-${i}`} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
              ))}
            </div>
          </div>
        </section>
        <footer style={{ marginTop: 12, fontSize: 12, color: '#6b7280', textAlign: 'right' }}>
          <div>Template ID: OH-PCARD-1.0</div>
        </footer>
      </div>
    </div>
  )
}

export default PreservationCardTemplate
