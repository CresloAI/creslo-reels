// Builds the CresloPromo audio pair into public/promo/ — run once, then render.
//   node scripts/promo-audio.mjs
//   npx remotion render CresloPromo out/creslo-promo.mp4 --props='{"voiceover":"promo/vo.mp3","music":"promo/music.mp3"}' --crf=17 --jpeg-quality=95
//
// - vo.mp3   : British AI narration (fal Kokoro) reading the APPROVED launch-pack
//              script, timed to the 19.5s retention cut's beats.
// - music.mp3: "Statement" from the owned AI music library (Stable Audio 2.5, commercial
//              use) — pulled from the public reel-music bucket. No licensing exposure.
//
// FAL_KEY + SUPABASE_URL are read from ../creslo-backend/.env (or the environment).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'promo')
mkdirSync(outDir, { recursive: true })

// --- env: prefer real env vars, fall back to the backend .env ---
function loadEnv() {
  const env = { FAL_KEY: process.env.FAL_KEY, SUPABASE_URL: process.env.SUPABASE_URL }
  if (!env.FAL_KEY || !env.SUPABASE_URL) {
    try {
      const raw = readFileSync(join(here, '..', '..', 'creslo-backend', '.env'), 'utf8')
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^(FAL_KEY|SUPABASE_URL)\s*=\s*(.+)\s*$/)
        if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    } catch { /* fall through to the check below */ }
  }
  if (!env.FAL_KEY) throw new Error('FAL_KEY not found (env or ../creslo-backend/.env)')
  if (!env.SUPABASE_URL) throw new Error('SUPABASE_URL not found (env or ../creslo-backend/.env)')
  return env
}
const { FAL_KEY, SUPABASE_URL } = loadEnv()

// The narration — the APPROVED beat-timed script from
// Creslo/04 Marketing/Reels-Launch-Pack.md §1 (reads ~19s at natural pace).
const VO_SCRIPT =
  'Running a business is a full-time job. So was social media. ' +
  'The posts. The photos. The adverts. Every day. Every platform. ' +
  'Creslo writes it, designs it, schedules it, and posts it — sounding like you. ' +
  'Posts, images, adverts, and reels. On-brand, every day, while you work. ' +
  'Creslo. Grow — without the grind. Start free at creslo dot A I.'

// Voice per the launch pack (bf_emma @ 1.02). Override:  PROMO_VOICE=bm_fable node scripts/promo-audio.mjs
const VOICE = process.env.PROMO_VOICE || 'bf_emma'
const SPEED = Number(process.env.PROMO_SPEED || 1.02)

const MODEL = 'fal-ai/kokoro/british-english'
const APP_BASE = MODEL.split('/').slice(0, 2).join('/') // queue quirk: poll at app-id base

async function falQueue(model, input) {
  const sub = await fetch(`https://queue.fal.run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const sd = await sub.json()
  if (!sub.ok || !sd.request_id) throw new Error(`fal submit failed: ${sub.status} ${JSON.stringify(sd).slice(0, 300)}`)
  const statusUrl = sd.status_url || `https://queue.fal.run/${APP_BASE}/requests/${sd.request_id}/status`
  const resultUrl = sd.response_url || `https://queue.fal.run/${APP_BASE}/requests/${sd.request_id}`
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const st = await (await fetch(statusUrl, { headers: { Authorization: `Key ${FAL_KEY}` } })).json()
    if (st.status === 'COMPLETED') break
    if (st.status === 'FAILED' || st.status === 'ERROR') throw new Error(`fal generation failed: ${JSON.stringify(st).slice(0, 300)}`)
    if (i === 89) throw new Error('fal generation timed out (3 min)')
  }
  return await (await fetch(resultUrl, { headers: { Authorization: `Key ${FAL_KEY}` } })).json()
}

async function download(url, dest, label) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${label} download failed: ${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 10_000) throw new Error(`${label} suspiciously small (${buf.length} bytes) — not saving`)
  writeFileSync(dest, buf)
  console.log(`✓ ${label} → ${dest} (${(buf.length / 1024).toFixed(0)} KB)`)
}

console.log(`1/2 Generating voiceover (Kokoro british-english, ${VOICE} @ ${SPEED})...`)
const result = await falQueue(MODEL, { prompt: VO_SCRIPT, voice: VOICE, speed: SPEED })
const voUrl = result?.audio?.url || result?.audio_url || result?.url
if (!voUrl) throw new Error(`no audio url in fal result: ${JSON.stringify(result).slice(0, 300)}`)
await download(voUrl, join(outDir, 'vo.mp3'), 'vo.mp3')

console.log('2/2 Fetching "Statement" from the owned music library...')
await download(`${SUPABASE_URL}/storage/v1/object/public/reel-music/statement.mp3`, join(outDir, 'music.mp3'), 'music.mp3')

console.log('\nDone. Now render:')
console.log(`  npx remotion render CresloPromo out/creslo-promo.mp4 --props='{"voiceover":"promo/vo.mp3","music":"promo/music.mp3"}' --crf=17 --jpeg-quality=95`)
