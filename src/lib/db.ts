import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

export const sql = neon(process.env.DATABASE_URL!)

// ── Schema init (run once via npm run db:init) ──────────────────────────────
export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS qr_codes (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      file_url    TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS scan_logs (
      id           SERIAL PRIMARY KEY,
      qr_id        TEXT REFERENCES qr_codes(id),
      scanned_at   TIMESTAMPTZ DEFAULT NOW(),
      ip           TEXT,
      country      TEXT,
      city         TEXT,
      os           TEXT,
      browser      TEXT,
      device_type  TEXT,
      screen       TEXT,
      timezone     TEXT,
      language     TEXT,
      user_agent   TEXT,
      referrer     TEXT
    )
  `
  console.log('✅ Database tables created')
}

// ── QR Code CRUD ────────────────────────────────────────────────────────────
export async function getAllQRCodes() {
  return sql`
    SELECT q.*, COUNT(s.id)::int AS scan_count,
           MAX(s.scanned_at) AS last_scan
    FROM qr_codes q
    LEFT JOIN scan_logs s ON s.qr_id = q.id
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `
}

export async function getQRCode(id: string) {
  const rows = await sql`SELECT * FROM qr_codes WHERE id = ${id}`
  return rows[0] ?? null
}

export async function createQRCode(data: {
  id: string
  name: string
  description: string
  file_url: string
}) {
  const rows = await sql`
    INSERT INTO qr_codes (id, name, description, file_url)
    VALUES (${data.id}, ${data.name}, ${data.description}, ${data.file_url})
    RETURNING *
  `
  return rows[0]
}

export async function deleteQRCode(id: string) {
  await sql`DELETE FROM scan_logs WHERE qr_id = ${id}`
  await sql`DELETE FROM qr_codes WHERE id = ${id}`
}

// ── Scan Logs ────────────────────────────────────────────────────────────────
export async function insertScanLog(data: {
  qr_id: string
  ip: string
  os: string
  browser: string
  device_type: string
  screen: string
  timezone: string
  language: string
  user_agent: string
  referrer: string
}) {
  await sql`
    INSERT INTO scan_logs
      (qr_id, ip, os, browser, device_type, screen, timezone, language, user_agent, referrer)
    VALUES
      (${data.qr_id}, ${data.ip}, ${data.os}, ${data.browser},
       ${data.device_type}, ${data.screen}, ${data.timezone},
       ${data.language}, ${data.user_agent}, ${data.referrer})
  `
}

export async function getScanLogs(qr_id?: string) {
  if (qr_id) {
    return sql`
      SELECT s.*, q.name as qr_name
      FROM scan_logs s
      JOIN qr_codes q ON q.id = s.qr_id
      WHERE s.qr_id = ${qr_id}
      ORDER BY s.scanned_at DESC
      LIMIT 200
    `
  }
  return sql`
    SELECT s.*, q.name as qr_name
    FROM scan_logs s
    JOIN qr_codes q ON q.id = s.qr_id
    ORDER BY s.scanned_at DESC
    LIMIT 200
  `
}

export async function getScanStats() {
  const rows = await sql`
    SELECT
      COUNT(*)::int                                          AS total_scans,
      COUNT(DISTINCT ip)::int                                AS unique_ips,
      COUNT(DISTINCT qr_id)::int                             AS active_qr_codes,
      COUNT(*) FILTER (WHERE scanned_at > NOW() - INTERVAL '1 hour')::int AS scans_last_hour
    FROM scan_logs
  `
  return rows[0]
}
