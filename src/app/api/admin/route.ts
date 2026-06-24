import { NextRequest, NextResponse } from 'next/server'
import { getScanLogs, getScanStats, getAllQRCodes, createQRCode, deleteQRCode } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// Simple token auth — set ADMIN_TOKEN in .env.local
function isAuthorized(request: NextRequest) {
  const token = request.headers.get('x-admin-token') || request.nextUrl.searchParams.get('token')
  return token === process.env.ADMIN_TOKEN
}

// GET /api/admin?token=xxx[&qr_id=xxx]
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const qr_id = request.nextUrl.searchParams.get('qr_id') || undefined
  const [logs, stats, qrcodes] = await Promise.all([
    getScanLogs(qr_id),
    getScanStats(),
    getAllQRCodes(),
  ])

  return NextResponse.json({ logs, stats, qrcodes })
}

// POST /api/admin — create new QR code
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, file_url, custom_id } = body

  if (!name || !file_url) {
    return NextResponse.json({ error: 'name and file_url are required' }, { status: 400 })
  }

  const id = custom_id || uuidv4().slice(0, 8)
  const qr = await createQRCode({ id, name, description: description || '', file_url })
  return NextResponse.json({ qr, tracking_url: `${process.env.NEXT_PUBLIC_BASE_URL}/q/${id}` })
}

// DELETE /api/admin?qr_id=xxx
export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const qr_id = request.nextUrl.searchParams.get('qr_id')
  if (!qr_id) return NextResponse.json({ error: 'qr_id required' }, { status: 400 })

  await deleteQRCode(qr_id)
  return NextResponse.json({ deleted: qr_id })
}
