// Run with: node -r dotenv/config lib/init-db.js
// Or: npx tsx lib/init-db.ts
require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

async function main() {
  const sql = neon(process.env.DATABASE_URL)

  console.log('Creating tables...')

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
      qr_id        TEXT REFERENCES qr_codes(id) ON DELETE CASCADE,
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

  // Sample QR code pointing to a real public PDF
  await sql`
    INSERT INTO qr_codes (id, name, description, file_url)
    VALUES (
      'demo-bai-hoc-1',
      'Bài giảng 01 – An toàn thông tin',
      'Tài liệu giới thiệu các khái niệm cơ bản về an toàn thông tin',
      'https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF1.pdf'
    )
    ON CONFLICT (id) DO NOTHING
  `

  console.log('✅ Done! Database initialized.')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
