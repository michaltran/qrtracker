'use client'
import { useEffect } from 'react'
import { useParams } from 'next/navigation'

export default function QRLandingPage() {
  const params = useParams()
  const id = params.id as string

  useEffect(() => {
    async function track() {
      const screen = `${window.screen.width}×${window.screen.height}`
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      try {
        const res = await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qr_id: id, screen, timezone }),
        })
        const data = await res.json()
        if (data.redirect) {
          window.location.href = data.redirect
        } else {
          window.location.href = `/api/track/${id}`
        }
      } catch {
        // Fallback: direct redirect (still logged server-side)
        window.location.href = `/api/track/${id}`
      }
    }

    track()
  }, [id])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      background: '#fafafa',
      color: '#333',
      gap: 16,
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid #e0e0e0',
        borderTopColor: '#185FA5',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: 15, color: '#666' }}>Đang tải tài liệu...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
