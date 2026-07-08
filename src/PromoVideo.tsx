// CresloPromo — the brand promo composition (agency-style device-mockup advert).
// LOCAL-FIRST: preview with `npm run studio`, render with
//   npx remotion render CresloPromo out/creslo-promo.mp4
// Registered alongside ReelVideo in Root.tsx; the customer reel pipeline is untouched.
//
// Structure (30fps, 1080x1920, ~28s):
//   1. HOOK    "Running a business is a full-time job."
//   2. BEAT    "So is social media."  (is -> was strikethrough)
//   3. PAIN    accelerating chore lines swiping past
//   4. TURN    phone rises; the app fills itself with posts (Written/Designed/Scheduled/Posted)
//   5. PROOF   platform chips orbit the phone
//   6. CTA     outline logo, "Grow. Without the grind.", creslo.ai chip
//
// The phone screen is a stylised NATIVE recreation of the Creslo app (crisp at any
// scale, every element animatable). Real app screenshots can replace the screen via
// staticFile('promo/…') later without changing the choreography.
import React from 'react'
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img } from 'remotion'
import { loadFont as loadDMSerifDisplay } from '@remotion/google-fonts/DMSerifDisplay'
import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans'

const serif = loadDMSerifDisplay('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily
const sans = loadDMSans('normal', { weights: ['400', '600', '700'], subsets: ['latin'] }).fontFamily

// Brand palette (creslo.ai)
const CREAM = '#F5EFE0'
const INK = '#2B2320'
const BROWN = '#B07A4F'
const BROWN_DEEP = '#8A5A33'
const SURFACE = '#FFFDF7'

export const PROMO_FPS = 30
export const PROMO_W = 1080
export const PROMO_H = 1920
export const PROMO_FRAMES = 585 // ~19.5s — retention cut (was 28s)

// ---------- shared bits ----------
const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 90px', textAlign: 'center', ...style }}>{children}</AbsoluteFill>
)

// Serif headline that springs up per word.
const Headline: React.FC<{ text: string; size?: number; color?: string; delay?: number }> = ({ text, size = 108, color = INK, delay = 0 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const words = text.split(' ')
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${size * 0.12}px ${size * 0.26}px`, maxWidth: 900 }}>
      {words.map((w, i) => {
        const s = spring({ frame: frame - delay - i * 2, fps, config: { damping: 15, mass: 0.55, stiffness: 170 } })
        return (
          <span key={i} style={{
            fontFamily: serif, fontSize: size, lineHeight: 1.04, color,
            display: 'inline-block', opacity: s,
            transform: `translateY(${interpolate(s, [0, 1], [size * 0.5, 0])}px)`,
          }}>{w}</span>
        )
      })}
    </div>
  )
}

// ---------- 1+2: hook & the turn of phrase ----------
const Hook: React.FC = () => (
  <AbsoluteFill style={{ background: CREAM }}>
    <Center><Headline text="Running a business is a full-time job." /></Center>
  </AbsoluteFill>
)

const SoIs: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  // "So is social media." -> strike "is", stamp "was".
  const strike = interpolate(frame, [26, 38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const was = spring({ frame: frame - 36, fps, config: { damping: 11, mass: 0.6, stiffness: 210 } })
  const size = 116
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <Center>
        <div style={{ fontFamily: serif, fontSize: size, lineHeight: 1.1, color: INK }}>
          So{' '}
          <span style={{ position: 'relative', display: 'inline-block' }}>
            is
            <span style={{ position: 'absolute', left: '-6%', top: '52%', height: 9, width: `${strike * 112}%`, background: BROWN, borderRadius: 5 }} />
            <span style={{
              position: 'absolute', left: '-30%', top: '-72%', fontFamily: serif, color: BROWN,
              fontSize: size * 0.82, transform: `rotate(-9deg) scale(${interpolate(was, [0, 1], [1.9, 1])})`, opacity: was,
            }}>was</span>
          </span>{' '}
          social media.
        </div>
      </Center>
    </AbsoluteFill>
  )
}

// ---------- 3: pain montage ----------
const PAIN_LINES = ['Write the posts.', 'Find the photos.', 'Design the adverts.', 'Post every day.', 'On every platform.']
const Pain: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()
  // Each line gets a shrinking slot — the montage accelerates.
  const slots = [26, 23, 20, 18, 23]
  const starts = slots.map((_, i) => slots.slice(0, i).reduce((a, b) => a + b, 0))
  // Background darkens as the overwhelm builds.
  const dark = interpolate(frame, [0, durationInFrames], [0, 1])
  const bg = `linear-gradient(180deg, ${CREAM} ${interpolate(dark, [0, 1], [100, -40])}%, ${INK} 140%)`
  const shake = Math.sin(frame * 1.7) * interpolate(frame, [0, durationInFrames], [0, 5])
  return (
    <AbsoluteFill style={{ background: bg }}>
      {PAIN_LINES.map((line, i) => {
        const local = frame - starts[i]
        if (local < 0 || local > slots[i] + 12) return null
        const inS = spring({ frame: local, fps, config: { damping: 14, mass: 0.5, stiffness: 200 } })
        const out = interpolate(local, [slots[i] - 6, slots[i] + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        const dir = i % 2 === 0 ? 1 : -1
        return (
          <Center key={i} style={{ transform: `translateX(${shake}px)` }}>
            <div style={{
              fontFamily: sans, fontWeight: 700, fontSize: 92, color: dark > 0.45 ? CREAM : INK, letterSpacing: '-0.01em',
              opacity: inS * (1 - out),
              transform: `translateX(${interpolate(inS, [0, 1], [90 * dir, 0]) + interpolate(out, [0, 1], [0, -140 * dir])}px) scale(${interpolate(inS, [0, 1], [0.92, 1])})`,
            }}>{line}</div>
          </Center>
        )
      })}
    </AbsoluteFill>
  )
}

// ---------- the phone ----------
const POSTS = [
  { title: 'Monday - LinkedIn', body: 'Behind the scenes at the workshop…', tag: 'Written' },
  { title: 'Tuesday - Instagram', body: 'Before & after: this weekend’s project', tag: 'Designed' },
  { title: 'Wednesday - Facebook', body: 'Meet the team: 15 years of craft', tag: 'Scheduled' },
  { title: 'Thursday - TikTok', body: 'Reel: 3 things nobody tells you', tag: 'Posted' },
]
const PhoneScreen: React.FC<{ appear: number }> = ({ appear }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <div style={{ width: '100%', height: '100%', background: CREAM, display: 'flex', flexDirection: 'column', fontFamily: sans }}>
      {/* status bar + header */}
      <div style={{ height: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', fontSize: 13, fontWeight: 700, color: INK }}>
        <span>9:41</span><span>●●●</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px 8px' }}>
        <Img src={staticFile('promo/creslo-icon.png')} style={{ width: 30, height: 30, borderRadius: 8 }} />
        <span style={{ fontFamily: serif, fontSize: 22, color: INK }}>Creslo.</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: BROWN_DEEP, background: '#EADFC9', borderRadius: 100, padding: '4px 10px' }}>AUTO</span>
      </div>
      <div style={{ fontFamily: serif, fontSize: 26, color: INK, padding: '2px 20px 10px' }}>This week, handled.</div>
      {/* posts filling in */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
        {POSTS.map((p, i) => {
          const s = spring({ frame: frame - (appear + i * 10), fps, config: { damping: 14, mass: 0.5, stiffness: 190 } })
          const tick = spring({ frame: frame - (appear + i * 10 + 7), fps, config: { damping: 9, mass: 0.4, stiffness: 280 } })
          return (
            <div key={i} style={{
              background: SURFACE, borderRadius: 16, border: '1px solid #E7DCC6', padding: '13px 14px',
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [34, 0])}px)`,
              display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 8px 22px -16px rgba(43,35,32,.35)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{p.title}</span>
                <span style={{
                  fontSize: 10.5, fontWeight: 800, color: '#fff', background: BROWN, borderRadius: 100, padding: '3px 9px',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  transform: `scale(${tick})`,
                }}>✓ {p.tag}</span>
              </div>
              <div style={{ height: 52, borderRadius: 10, background: `linear-gradient(135deg, #EADFC9, ${BROWN}55)` }} />
              <span style={{ fontSize: 12, color: '#6F6257' }}>{p.body}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const Phone: React.FC<{ rise: number; tilt: number; appear: number }> = ({ rise, tilt, appear }) => {
  const W = 560, H = 1180
  return (
    <div style={{
      width: W, height: H, position: 'relative',
      transform: `translateY(${interpolate(rise, [0, 1], [700, 0])}px) rotateY(${tilt}deg) rotateX(${tilt * 0.4}deg)`,
      transformStyle: 'preserve-3d',
    }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 74, background: '#141210',
        boxShadow: '0 60px 120px -40px rgba(43,35,32,.55), inset 0 0 0 3px #3A332E',
      }} />
      <div style={{ position: 'absolute', inset: 14, borderRadius: 62, overflow: 'hidden', background: CREAM }}>
        <PhoneScreen appear={appear} />
      </div>
      {/* notch */}
      <div style={{ position: 'absolute', top: 26, left: '50%', transform: 'translateX(-50%)', width: 150, height: 34, borderRadius: 100, background: '#141210' }} />
    </div>
  )
}

// ---------- 4: the turn ----------
const Turn: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const rise = spring({ frame, fps, config: { damping: 15, mass: 0.7, stiffness: 120 } })
  const title = spring({ frame: frame - 6, fps, config: { damping: 15, mass: 0.6, stiffness: 140 } })
  return (
    <AbsoluteFill style={{ background: CREAM, perspective: 1400 }}>
      <div style={{ position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center', opacity: title, transform: `translateY(${interpolate(title, [0, 1], [26, 0])}px)` }}>
        <div style={{ fontFamily: serif, fontSize: 88, color: INK }}>Creslo does it <span style={{ color: BROWN }}>for you.</span></div>
      </div>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 90 }}>
        <Phone rise={rise} tilt={0} appear={16} />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

// ---------- 5: proof (orbiting platforms) ----------
// Real platform glyphs (inline vectors, nominative use) - crisp at any scale.
const GLYPHS: Record<string, React.ReactNode> = {
  linkedin: <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S.02 4.88.02 3.5 1.13 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4v15h-4V8zm7.5 0h3.8v2.05h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-7.9c0-1.88-.04-4.3-2.62-4.3-2.62 0-3.02 2.05-3.02 4.17V23H8V8z" />,
  instagram: <><rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" strokeWidth="2.1" /><circle cx="12" cy="12" r="4.6" fill="none" strokeWidth="2.1" /><circle cx="17.6" cy="6.4" r="1.4" stroke="none" /></>,
  facebook: <path d="M13.5 23v-8.1h2.72l.41-3.16H13.5V9.72c0-.92.25-1.54 1.57-1.54h1.68V5.35c-.29-.04-1.29-.12-2.45-.12-2.42 0-4.08 1.48-4.08 4.19v2.32H7.5v3.16h2.72V23h3.28z" />,
  x: <path d="M18.24 2.25h3.31l-7.23 8.26L22.83 21.75h-6.66l-5.22-6.82-5.97 6.82H1.66l7.73-8.83L1.17 2.25h6.83l4.72 6.24 5.52-6.24zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z" />,
  tiktok: <path d="M16.6 5.82A4.28 4.28 0 0 1 15.55 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.77a5.9 5.9 0 0 0-.77-.05 5.66 5.66 0 1 0 5.66 5.66V9.01a7.36 7.36 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.23-1.48z" />,
}
const PLATFORMS = ['linkedin', 'instagram', 'facebook', 'x', 'tiktok']
const Proof: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tilt = interpolate(frame, [0, 90], [0, -14], { extrapolateRight: 'clamp' })
  const title = spring({ frame, fps, config: { damping: 15, mass: 0.6, stiffness: 140 } })
  // One shared stacking context: chips at zIndex 0 orbit BEHIND the phone (zIndex 1)
  // across the top of the ellipse, and pass IN FRONT (zIndex 2) across the bottom.
  const chip = (i: number) => {
    const a = frame * 0.03 + (i * Math.PI * 2) / PLATFORMS.length
    const depth = Math.sin(a)            // -1 = fully behind, +1 = fully in front
    const behind = depth < 0
    const x = Math.cos(a) * 430
    const y = depth * 150
    const pop = spring({ frame: frame - 6 - i * 3, fps, config: { damping: 12, mass: 0.5, stiffness: 200 } })
    const scale = pop * interpolate(depth, [-1, 1], [0.72, 1.08])
    return (
      <div key={i} style={{
        position: 'absolute', left: '50%', top: '58%', zIndex: behind ? 0 : 2,
        transform: `translate(${x - 52}px, ${y}px) scale(${scale})`,
        width: 104, height: 104, borderRadius: 100,
        background: behind ? '#EADFC9' : BROWN,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: behind ? 'none' : '0 22px 44px -18px rgba(43,35,32,.45)',
        opacity: pop * interpolate(depth, [-1, 1], [0.55, 1]),
        filter: behind ? 'blur(1.2px)' : 'none',
      }}>
        <svg viewBox="0 0 24 24" width={52} height={52} fill={behind ? '#A08B72' : '#fff'} stroke={behind ? '#A08B72' : '#fff'}>
          {GLYPHS[PLATFORMS[i]]}
        </svg>
      </div>
    )
  }
  return (
    <AbsoluteFill style={{ background: CREAM, perspective: 1400 }}>
      <div style={{ position: 'absolute', top: 110, left: 0, right: 0, textAlign: 'center', opacity: title, zIndex: 3 }}>
        <div style={{ fontFamily: serif, fontSize: 84, color: INK }}>Posts. Images. Adverts. <span style={{ color: BROWN }}>Reels.</span></div>
        <div style={{ fontFamily: sans, fontSize: 34, color: '#6F6257', marginTop: 18, fontWeight: 600 }}>On-brand, every day - while you work.</div>
      </div>
      {/* chips behind */}
      {PLATFORMS.map((_, i) => chip(i)).filter((_, i) => {
        const a = frame * 0.03 + (i * Math.PI * 2) / PLATFORMS.length
        return Math.sin(a) < 0
      })}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 60, zIndex: 1 }}>
        <Phone rise={1} tilt={tilt} appear={-70} />
      </AbsoluteFill>
      {/* chips in front */}
      {PLATFORMS.map((_, i) => chip(i)).filter((_, i) => {
        const a = frame * 0.03 + (i * Math.PI * 2) / PLATFORMS.length
        return Math.sin(a) >= 0
      })}
    </AbsoluteFill>
  )
}

// ---------- 6: CTA ----------
const Cta: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const logo = spring({ frame, fps, config: { damping: 13, mass: 0.7, stiffness: 120 } })
  const line = spring({ frame: frame - 14, fps, config: { damping: 15, mass: 0.6, stiffness: 140 } })
  const chip = spring({ frame: frame - 30, fps, config: { damping: 12, mass: 0.5, stiffness: 180 } })
  return (
    <AbsoluteFill style={{ background: CREAM, alignItems: 'center', justifyContent: 'center', gap: 44 }}>
      <Img src={staticFile('promo/creslo-icon.png')} style={{
        width: 220, height: 220, borderRadius: 52,
        opacity: logo, transform: `scale(${interpolate(logo, [0, 1], [0.7, 1])})`,
        boxShadow: '0 40px 80px -40px rgba(43,35,32,.45)',
      }} />
      <div style={{ opacity: line, transform: `translateY(${interpolate(line, [0, 1], [24, 0])}px)`, textAlign: 'center' }}>
        <div style={{ fontFamily: serif, fontSize: 96, color: INK, lineHeight: 1.08 }}>Grow.<br />Without the grind.</div>
      </div>
      <div style={{
        opacity: chip, transform: `scale(${chip})`,
        fontFamily: sans, fontWeight: 700, fontSize: 34, color: '#fff', background: BROWN,
        borderRadius: 100, padding: '20px 46px', boxShadow: '0 24px 50px -24px rgba(138,90,51,.7)',
      }}>creslo.ai - start free</div>
    </AbsoluteFill>
  )
}

// ---------- timeline ----------
export const PromoVideo: React.FC = () => (
  <AbsoluteFill style={{ background: CREAM }}>
    <Sequence durationInFrames={55}><Hook /></Sequence>
    <Sequence from={55} durationInFrames={65}><SoIs /></Sequence>
    <Sequence from={120} durationInFrames={110}><Pain /></Sequence>
    <Sequence from={230} durationInFrames={155}><Turn /></Sequence>
    <Sequence from={385} durationInFrames={110}><Proof /></Sequence>
    <Sequence from={495} durationInFrames={90}><Cta /></Sequence>
  </AbsoluteFill>
)
