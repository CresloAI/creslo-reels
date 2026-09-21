// Fetches the REAL-footage opener for CresloPromo v2 into public/promo/opener.mp4.
//   node scripts/promo-footage.mjs
// Portrait stock of a real business owner at work (Pexels, free licence incl.
// commercial use). Re-roll with a different search or pick:
//   PROMO_QUERY="florist small business" node scripts/promo-footage.mjs
//   PROMO_PICK=2 node scripts/promo-footage.mjs   (0-based index into results)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, '..', 'public', 'promo')
mkdirSync(outDir, { recursive: true })

function loadKey() {
  if (process.env.PEXELS_API_KEY) return process.env.PEXELS_API_KEY
  const raw = readFileSync(join(here, '..', '..', 'creslo-backend', '.env'), 'utf8')
  const m = raw.match(/^PEXELS_API_KEY\s*=\s*(.+)\s*$/m)
  if (!m) throw new Error('PEXELS_API_KEY not found (env or ../creslo-backend/.env)')
  return m[1].replace(/^["']|["']$/g, '')
}
const KEY = loadKey()

const QUERY = process.env.PROMO_QUERY || 'small business owner working shop'
const PICK = Number(process.env.PROMO_PICK || 0)

const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(QUERY)}&orientation=portrait&per_page=8`, {
  headers: { Authorization: KEY },
})
if (!res.ok) throw new Error(`Pexels search failed: ${res.status}`)
const data = await res.json()
const vids = data.videos || []
if (!vids.length) throw new Error(`No portrait results for "${QUERY}" — try another PROMO_QUERY`)

console.log(`Results for "${QUERY}":`)
vids.forEach((v, i) => console.log(`  [${i}] ${v.duration}s  ${v.width}x${v.height}  by ${v.user?.name}  ${v.url}`))

const v = vids[Math.min(PICK, vids.length - 1)]
// Best portrait file ≥1080 wide if available, else the tallest.
const files = (v.video_files || []).filter(f => f.height > f.width)
files.sort((a, b) => (b.width - a.width))
const file = files.find(f => f.width >= 1080) || files[0]
if (!file) throw new Error('No portrait video file on the picked result')

console.log(`\nDownloading [${PICK}] ${file.width}x${file.height} …`)
const dl = await fetch(file.link)
if (!dl.ok) throw new Error(`download failed: ${dl.status}`)
const buf = Buffer.from(await dl.arrayBuffer())
if (buf.length < 100_000) throw new Error(`suspiciously small (${buf.length} bytes)`)
writeFileSync(join(outDir, 'opener.mp4'), buf)
console.log(`✓ opener.mp4 → public/promo/ (${(buf.length / 1048576).toFixed(1)} MB)`)
console.log('\nCredit (Pexels licence needs none, but nice to note): ' + (v.user?.name || 'unknown'))
