import { NextRequest, NextResponse } from 'next/server'
import { UAParser } from 'ua-parser-js'
import { getQRCode, insertScanLog } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // 1. Lookup QR code in DB
  const qr = await getQRCode(id)
  if (!qr) {
    return new NextResponse('QR code not found', { status: 404 })
  }

  // 2. Collect visitor info
  const ua = request.headers.get('user-agent') || ''
  const parser = new UAParser(ua)
  const parsed = parser.getResult()

  // IP: Vercel sets x-forwarded-for, fallback for local dev
  const rawIP =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'

  const referrer = request.headers.get('referer') || ''
  const language = request.headers.get('accept-language')?.split(',')[0] || ''

  const os = [parsed.os.name, parsed.os.version].filter(Boolean).join(' ')
  const browser = [parsed.browser.name, parsed.browser.major].filter(Boolean).join(' ')
  const deviceType = parsed.device.type || 'desktop'

  // 3. Log to Neon DB (non-blocking — don't await to keep redirect fast)
  insertScanLog({
    qr_id: id,
    ip: rawIP,
    os,
    browser,
    device_type: deviceType,
    screen: '',        // populated client-side if needed via JS redirect
    timezone: '',      // same — UA parser can't get these
    language,
    user_agent: ua,
    referrer,
  }).catch(console.error)

  // 4. Redirect to real file immediately
  return NextResponse.redirect(qr.file_url, { status: 302 })
}
