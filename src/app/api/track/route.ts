import { NextRequest, NextResponse } from 'next/server'
import { UAParser } from 'ua-parser-js'
import { getQRCode, insertScanLog } from '@/lib/db'

export const runtime = 'nodejs'

// This endpoint receives extra client-side info (screen, timezone) then logs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { qr_id, screen, timezone } = body

    if (!qr_id) return NextResponse.json({ error: 'missing qr_id' }, { status: 400 })

    const qr = await getQRCode(qr_id)
    if (!qr) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const ua = request.headers.get('user-agent') || ''
    const parser = new UAParser(ua)
    const parsed = parser.getResult()

    const rawIP =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'

    await insertScanLog({
      qr_id,
      ip: rawIP,
      os: [parsed.os.name, parsed.os.version].filter(Boolean).join(' '),
      browser: [parsed.browser.name, parsed.browser.major].filter(Boolean).join(' '),
      device_type: parsed.device.type || 'desktop',
      screen: screen || '',
      timezone: timezone || '',
      language: request.headers.get('accept-language')?.split(',')[0] || '',
      user_agent: ua,
      referrer: request.headers.get('referer') || '',
    })

    return NextResponse.json({ redirect: qr.file_url })
  } catch (e) {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
