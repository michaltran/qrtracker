'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import QRCode from 'qrcode'

const TOKEN = process.env.NEXT_PUBLIC_ADMIN_TOKEN || ''

type ScanLog = {
  id: number
  qr_id: string
  qr_name: string
  scanned_at: string
  ip: string
  os: string
  browser: string
  device_type: string
  screen: string
  timezone: string
  language: string
  user_agent: string
}

type QRCodeRecord = {
  id: string
  name: string
  description: string
  file_url: string
  scan_count: number
  last_scan: string | null
  created_at: string
}

type Stats = {
  total_scans: number
  unique_ips: number
  active_qr_codes: number
  scans_last_hour: number
}

export default function Dashboard() {
  const [token, setToken] = useState(TOKEN)
  const [authed, setAuthed] = useState(false)
  const [logs, setLogs] = useState<ScanLog[]>([])
  const [qrcodes, setQrcodes] = useState<QRCodeRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedQR, setSelectedQR] = useState<string>('')
  const [tab, setTab] = useState<'logs' | 'qrcodes' | 'create'>('logs')
  const [lastCount, setLastCount] = useState(0)
  const [newRows, setNewRows] = useState<Set<number>>(new Set())

  // Create QR form
  const [form, setForm] = useState({ name: '', description: '', file_url: '', custom_id: '' })
  const [creating, setCreating] = useState(false)
  const [createdQR, setCreatedQR] = useState<{ url: string; qr: QRCodeRecord } | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const fetchData = useCallback(async (tok: string) => {
    const qParam = selectedQR ? `&qr_id=${selectedQR}` : ''
    try {
      const res = await fetch(`/api/admin?token=${tok}${qParam}`)
      if (res.status === 401) return false
      const data = await res.json()
      setLogs(prev => {
        const prevIds = new Set(prev.map(l => l.id))
        const fresh = (data.logs as ScanLog[]).filter(l => !prevIds.has(l.id))
        if (fresh.length > 0) {
          setNewRows(new Set(fresh.map(l => l.id)))
          setTimeout(() => setNewRows(new Set()), 3000)
        }
        return data.logs
      })
      setQrcodes(data.qrcodes)
      setStats(data.stats)
      setLastCount(data.logs.length)
      return true
    } catch { return false }
  }, [selectedQR])

  const login = async () => {
    const ok = await fetchData(token)
    if (ok) setAuthed(true)
    else alert('Token không đúng!')
  }

  useEffect(() => {
    if (!authed) return
    const iv = setInterval(() => fetchData(token), 3000)
    return () => clearInterval(iv)
  }, [authed, token, fetchData])

  const handleCreateQR = async () => {
    if (!form.name || !form.file_url) return alert('Điền đủ Tên và URL tài liệu')
    setCreating(true)
    try {
      const res = await fetch(`/api/admin?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      const trackingUrl = `${baseUrl}/q/${data.qr.id}`
      setCreatedQR({ url: trackingUrl, qr: data.qr })
      setTimeout(async () => {
        if (qrCanvasRef.current) {
          await QRCode.toCanvas(qrCanvasRef.current, trackingUrl, { width: 240, margin: 2 })
        }
      }, 100)
      fetchData(token)
    } catch (e) { alert('Lỗi tạo QR') }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(`Xoá QR "${id}" và toàn bộ log?`)) return
    await fetch(`/api/admin?token=${token}&qr_id=${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': token },
    })
    fetchData(token)
  }

  const downloadQR = () => {
    if (!qrCanvasRef.current) return
    const a = document.createElement('a')
    a.download = `qr-${createdQR?.qr.id}.png`
    a.href = qrCanvasRef.current.toDataURL()
    a.click()
  }

  if (!authed) {
    return (
      <div style={styles.center}>
        <div style={styles.loginBox}>
          <h1 style={styles.h1}>🔐 QR Tracker Admin</h1>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Nhập ADMIN_TOKEN để tiếp tục</p>
          <input
            type="password"
            placeholder="Admin token..."
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            style={styles.input}
          />
          <button onClick={login} style={styles.btnPrimary}>Đăng nhập</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>QR Tracker Dashboard</h1>
          <div style={styles.liveTag}>
            <span style={styles.dot} /> Cập nhật mỗi 3 giây
          </div>
        </div>
        <button onClick={() => setTab('create')} style={styles.btnPrimary}>
          + Tạo QR mới
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={styles.statRow}>
          {[
            { label: 'Tổng lượt quét', value: stats.total_scans },
            { label: 'IP khác nhau', value: stats.unique_ips },
            { label: 'QR codes', value: stats.active_qr_codes },
            { label: 'Trong 1 giờ', value: stats.scans_last_hour },
          ].map(s => (
            <div key={s.label} style={styles.statCard}>
              <div style={styles.statLabel}>{s.label}</div>
              <div style={styles.statValue}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['logs', 'qrcodes', 'create'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}>
            {{ logs: '📋 Nhật ký quét', qrcodes: '📦 QR codes', create: '➕ Tạo QR' }[t]}
          </button>
        ))}
      </div>

      {/* Scan Logs Tab */}
      {tab === 'logs' && (
        <div style={styles.card}>
          <div style={styles.filterRow}>
            <select value={selectedQR} onChange={e => setSelectedQR(e.target.value)} style={styles.select}>
              <option value="">Tất cả QR codes</option>
              {qrcodes.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
            <span style={{ fontSize: 13, color: '#666' }}>{logs.length} bản ghi</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['#', 'Thời gian', 'QR Code', 'IP', 'Thiết bị', 'OS', 'Trình duyệt', 'Màn hình', 'Múi giờ', 'Ngôn ngữ'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={10} style={styles.empty}>Chưa có lượt quét nào</td></tr>
                ) : logs.map((l, i) => (
                  <tr key={l.id} style={newRows.has(l.id) ? styles.newRow : {}}>
                    <td style={styles.td}>{logs.length - i}</td>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {new Date(l.scanned_at).toLocaleString('vi-VN')}
                      {newRows.has(l.id) && <span style={styles.newBadge}>MỚI</span>}
                    </td>
                    <td style={styles.td}><span style={styles.qrBadge}>{l.qr_name}</span></td>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12, color: '#185FA5', fontWeight: 500 }}>{l.ip}</td>
                    <td style={styles.td}>{l.device_type || '—'}</td>
                    <td style={styles.td}>{l.os || '—'}</td>
                    <td style={styles.td}>{l.browser || '—'}</td>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11 }}>{l.screen || '—'}</td>
                    <td style={{ ...styles.td, fontSize: 11 }}>{l.timezone || '—'}</td>
                    <td style={{ ...styles.td, fontSize: 11 }}>{l.language || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR Codes Tab */}
      {tab === 'qrcodes' && (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['ID', 'Tên', 'URL tài liệu', 'Lượt quét', 'Lần cuối', 'Link tracking', 'Xoá'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {qrcodes.length === 0 ? (
                <tr><td colSpan={7} style={styles.empty}>Chưa có QR code nào</td></tr>
              ) : qrcodes.map(q => (
                <tr key={q.id}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 12 }}>{q.id}</td>
                  <td style={{ ...styles.td, fontWeight: 500 }}>{q.name}</td>
                  <td style={{ ...styles.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a href={q.file_url} target="_blank" rel="noreferrer" style={{ color: '#185FA5', fontSize: 12 }}>{q.file_url}</a>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center', fontWeight: 500 }}>{q.scan_count}</td>
                  <td style={{ ...styles.td, fontSize: 11, whiteSpace: 'nowrap' }}>
                    {q.last_scan ? new Date(q.last_scan).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td style={styles.td}>
                    <a href={`${baseUrl}/q/${q.id}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, fontFamily: 'monospace', color: '#185FA5' }}>
                      /q/{q.id}
                    </a>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => handleDelete(q.id)} style={styles.btnDanger}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create QR Tab */}
      {tab === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: createdQR ? '1fr 1fr' : '1fr', gap: 16 }}>
          <div style={styles.card}>
            <h2 style={styles.h2}>Tạo QR code mới</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tên tài liệu *</label>
              <input style={styles.input} placeholder="VD: Bài giảng 01 – An toàn mạng"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Mô tả</label>
              <input style={styles.input} placeholder="Mô tả ngắn về tài liệu"
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>URL tài liệu thật * (PDF, video, Google Drive...)</label>
              <input style={styles.input} placeholder="https://example.com/tailieu.pdf"
                value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} />
              <p style={styles.hint}>Học viên sẽ được redirect đến URL này sau khi bị log.</p>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>ID tuỳ chỉnh (tùy chọn)</label>
              <input style={styles.input} placeholder="VD: bai-giang-01 (để trống = tự động)"
                value={form.custom_id} onChange={e => setForm({ ...form, custom_id: e.target.value })} />
            </div>
            <button onClick={handleCreateQR} disabled={creating} style={styles.btnPrimary}>
              {creating ? 'Đang tạo...' : '✨ Tạo QR Code'}
            </button>
          </div>

          {createdQR && (
            <div style={styles.card}>
              <h2 style={styles.h2}>✅ QR Code đã tạo</h2>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <canvas ref={qrCanvasRef} style={{ borderRadius: 8, border: '1px solid #e0e0e0' }} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>URL tracking (chia sẻ cái này)</label>
                <div style={styles.codeBox}>{createdQR.url}</div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>File thật</label>
                <div style={styles.codeBox}>{createdQR.qr.file_url}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={downloadQR} style={styles.btnSecondary}>⬇ Tải QR PNG</button>
                <button onClick={() => navigator.clipboard.writeText(createdQR.url)} style={styles.btnSecondary}>
                  📋 Copy URL
                </button>
              </div>
              <div style={styles.infoBox}>
                Khi học viên quét QR → mở <code>/q/{createdQR.qr.id}</code> → JS thu thập screen + timezone → POST log → redirect đến file thật.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' },
  loginBox: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: 32, width: 360, display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  h1: { fontSize: 20, fontWeight: 600, marginBottom: 4 },
  h2: { fontSize: 16, fontWeight: 600, marginBottom: 16 },
  liveTag: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#639922' },
  dot: { display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#639922', animation: 'pulse 1.5s infinite' },
  statRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 },
  statCard: { background: '#f5f7fa', borderRadius: 8, padding: '14px 16px' },
  statLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: 600 },
  tabs: { display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e5e5e5', paddingBottom: 0 },
  tab: { padding: '8px 16px', fontSize: 13, cursor: 'pointer', border: '1px solid transparent', borderBottom: 'none', borderRadius: '6px 6px 0 0', background: 'transparent', color: '#666' },
  tabActive: { background: '#fff', borderColor: '#e0e0e0', color: '#1a1a1a', fontWeight: 500, marginBottom: -1 },
  card: { background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: 12 },
  filterRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  select: { fontSize: 13, padding: '6px 10px', borderRadius: 6, border: '1px solid #e0e0e0', background: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' },
  td: { padding: '10px 10px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'middle' },
  empty: { textAlign: 'center', color: '#999', padding: '2rem', fontSize: 13 },
  newRow: { background: '#EBF5FF' },
  newBadge: { marginLeft: 6, fontSize: 10, background: '#185FA5', color: '#fff', borderRadius: 4, padding: '1px 5px', fontWeight: 600 },
  qrBadge: { fontSize: 11, background: '#f0f0f0', borderRadius: 4, padding: '2px 7px', fontWeight: 500 },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 6 },
  input: { width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid #e0e0e0', borderRadius: 6, fontFamily: 'system-ui' },
  hint: { fontSize: 11, color: '#888', marginTop: 4 },
  btnPrimary: { padding: '9px 18px', fontSize: 13, background: '#185FA5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 },
  btnSecondary: { padding: '8px 14px', fontSize: 13, background: '#f5f5f5', color: '#333', border: '1px solid #e0e0e0', borderRadius: 6, cursor: 'pointer' },
  btnDanger: { padding: '4px 8px', fontSize: 13, background: '#FFF0F0', color: '#A32D2D', border: '1px solid #F7C1C1', borderRadius: 6, cursor: 'pointer' },
  codeBox: { fontSize: 12, fontFamily: 'monospace', background: '#f5f7fa', border: '1px solid #e0e0e0', borderRadius: 6, padding: '8px 12px', wordBreak: 'break-all', color: '#185FA5' },
  infoBox: { marginTop: 12, background: '#EBF5FF', borderLeft: '3px solid #378ADD', borderRadius: '0 6px 6px 0', padding: '10px 14px', fontSize: 12, color: '#042C53', lineHeight: 1.6 },
}
