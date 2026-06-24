import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'QR Tracker – Demo An Toàn Thông Tin',
  description: 'Hệ thống demo tracking QR code cho giảng dạy an toàn thông tin',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  )
}
