import React from 'react'
import { AbsoluteFill, OffthreadVideo, Img, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { loadFont as loadWordmarkSerif } from '@remotion/google-fonts/DMSerifDisplay'
import { Captions } from './Captions'
import type { CaptionStyle, StyleConfig } from '../lib/types'

// The wordmark serif — the same face as Creslo's own "Creslo." brand mark. Every
// brand's name renders in this editorial style on the CTA end-card.
const WORDMARK_FONT = loadWordmarkSerif('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily

function shade(hex: string, amt: number) {
  // lighten/darken a hex colour by amt (-1..1)
  const h = (hex || '#0F1115').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * amt)))
  r = f(r); g = f(g); b = f(b)
  return `rgb(${r},${g},${b})`
}

// Accent colour with alpha (mirror of the frontend's helper).
function hexA(hex: string, a: number) {
  const h = (hex || '#E8743B').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return `rgba(${r},${g},${b},${a})`
}

// Readable text colour for a solid brand-colour field (mirror of the frontend's helper).
function idealText(hex: string) {
  const h = (hex || '#E8743B').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#0F1115' : '#ffffff'
}

// CSS colour grades applied over the clip layer (driven by reel.grade). Absent -> no filter.
// MUST stay byte-identical to the frontend mirror src/remotion/ReelVideo.tsx.
const GRADE_PRESETS: Record<string, string> = {
  warm: 'sepia(0.15) brightness(1.05) saturate(1.1)',
  punchy: 'contrast(1.1) saturate(1.2)',
  editorial: 'contrast(1.05) saturate(0.9) brightness(1.02)',
  clean: 'brightness(1.03) saturate(1.05)',
  neutral: 'none',
}


// ===== BrandField: the premium brand-colour stage behind text/CTA beats. =====
// Layers (back to front): deep radial base -> perspective floor grid drifting toward
// the viewer -> two huge blurred glow orbs on slow orbits -> floating twinkling
// particles -> vignette -> film grain. Pure CSS/SVG, cheap per frame.
// MUST stay byte-identical in both composition mirrors.
const GRAIN_URI = "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22/></filter><rect width=%22160%22 height=%22160%22 filter=%22url(%23n)%22 opacity=%220.5%22/></svg>')"
const BrandField: React.FC<{ accent: string; frame: number; dark?: boolean; tone?: 'light' | 'rich' | 'deep' }> = ({ accent, frame, dark, tone }) => {
  // v3 (field tones): three polarities of the SAME brand-colour stage.
  //   'light' — cream editorial ground (the brand-banner aesthetic): pale tints of the
  //             brand colour, deep-brand accents carrying the detail. For brands whose
  //             premium register is bright (cafés, salons, cream-and-brown identities).
  //   'rich'  — the saturated mid default. 'deep' — jewel tone, never murky black.
  // Chosen per reel via reel.fieldTone (mood presets + the planner set it).
  const t = tone || (dark ? 'deep' : 'rich')
  const base = t === 'light' ? shade(accent, 0.6) : (t === 'deep' ? shade(accent, -0.32) : shade(accent, -0.06))
  const deep = t === 'light' ? shade(accent, 0.38) : (t === 'deep' ? shade(accent, -0.5) : shade(accent, -0.24))
  const lift = t === 'light' ? shade(accent, 0.78) : (t === 'deep' ? shade(accent, -0.1) : shade(accent, 0.24))
  const hot = t === 'light' ? shade(accent, -0.05) : shade(accent, 0.42)
  // Deterministic particle field (no randomness - identical on every render).
  const parts = Array.from({ length: 16 }, (_, i) => {
    const px = ((i * 61) % 97) / 97 * 100
    const seed = (i * 37) % 83
    const py = ((seed / 83) * 120 - ((frame * (0.25 + (i % 5) * 0.08)) % 120) + 120) % 120 - 10
    const tw = 0.35 + 0.3 * Math.sin(frame * 0.06 + i * 1.7)
    const size = 3 + (i % 4) * 2.5
    return { px, py, tw, size }
  })
  // Large soft bokeh discs drifting through depth (deterministic).
  const bokeh = [
    { x: 14 + Math.sin(frame * 0.008) * 6, y: 26 + Math.cos(frame * 0.01) * 5, s: 150, o: 0.16 },
    { x: 80 + Math.cos(frame * 0.009) * 5, y: 14 + Math.sin(frame * 0.012) * 6, s: 100, o: 0.13 },
    { x: 68 + Math.sin(frame * 0.007) * 7, y: 74 + Math.cos(frame * 0.011) * 4, s: 190, o: 0.1 },
  ]
  // Cinematic light sweep: a soft diagonal beam panning across every ~5s.
  const sweepX = ((frame % 150) / 150) * 240 - 70
  return (
    <AbsoluteFill>
      {/* gradient-mesh base: three colour poles instead of one flat radial */}
      <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 22%, ${lift} 0%, ${base} 55%, ${deep} 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(70% 55% at ${22 + Math.sin(frame * 0.012) * 8}% ${20 + Math.cos(frame * 0.01) * 6}%, ${hexA(hot, 0.5)} 0%, transparent 65%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(80% 60% at ${78 + Math.cos(frame * 0.011) * 7}% ${76 + Math.sin(frame * 0.013) * 6}%, ${hexA(shade(accent, -0.6), 0.55)} 0%, transparent 60%)` }} />
      {/* perspective floor grid, accent-tinted, drifting toward the viewer */}
      <div style={{
        position: 'absolute', left: '-40%', right: '-40%', bottom: '-4%', height: '46%',
        backgroundImage: `linear-gradient(${hexA(hot, 0.2)} 1.5px, transparent 1.5px), linear-gradient(90deg, ${hexA(hot, 0.2)} 1.5px, transparent 1.5px)`,
        backgroundSize: '110px 110px',
        backgroundPosition: `0px ${(frame * 0.6) % 110}px`,
        transform: 'perspective(700px) rotateX(62deg)', transformOrigin: '50% 0%',
        maskImage: 'linear-gradient(180deg, transparent 0%, black 45%)',
        WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 45%)',
      }} />
      {/* glowing horizon line where the grid meets the field */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: '42%', height: 2, background: `linear-gradient(90deg, transparent 8%, ${hexA(hot, 0.55)} 50%, transparent 92%)`, boxShadow: `0 0 26px ${hexA(hot, 0.6)}`, opacity: 0.5 + Math.sin(frame * 0.05) * 0.15 }} />
      {/* glow orbs on slow orbits */}
      <div style={{
        position: 'absolute', width: 860, height: 860, borderRadius: 860, filter: 'blur(110px)',
        background: hexA(hot, 0.5), opacity: 0.55,
        left: `calc(${18 + Math.sin(frame * 0.014) * 12}% - 430px)`, top: `calc(${16 + Math.cos(frame * 0.011) * 8}% - 430px)`,
      }} />
      <div style={{
        position: 'absolute', width: 560, height: 560, borderRadius: 560, filter: 'blur(100px)',
        background: t === 'light' ? hexA(accent, 0.3) : hexA('#FFFFFF', 0.26), opacity: 0.45,
        right: `calc(${10 + Math.cos(frame * 0.017) * 10}% - 280px)`, bottom: `calc(${20 + Math.sin(frame * 0.013) * 9}% - 280px)`,
      }} />
      {/* soft bokeh depth */}
      {bokeh.map((b, i) => (
        <div key={`b${i}`} style={{
          position: 'absolute', left: `calc(${b.x}% - ${b.s / 2}px)`, top: `calc(${b.y}% - ${b.s / 2}px)`,
          width: b.s, height: b.s, borderRadius: b.s, filter: 'blur(26px)',
          background: `radial-gradient(circle, ${hexA('#FFFFFF', b.o)} 0%, transparent 70%)`,
        }} />
      ))}
      {/* cinematic light sweep */}
      <div style={{
        position: 'absolute', top: '-25%', bottom: '-25%', width: '34%', left: `${sweepX}%`,
        transform: 'rotate(14deg)', mixBlendMode: 'screen',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 38%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.07) 62%, transparent 100%)',
      }} />
      {/* floating particles */}
      {parts.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${p.px}%`, top: `${p.py}%`, width: p.size, height: p.size,
          borderRadius: 100, background: i % 3 === 0 ? hot : '#FFFFFF', opacity: p.tw,
          boxShadow: `0 0 ${p.size * 3}px ${i % 3 === 0 ? hexA(hot, 0.9) : hexA('#FFFFFF', 0.7)}`,
        }} />
      ))}
      {/* light vignette + grain (framing, not darkness; warm brown on the light tone) */}
      <AbsoluteFill style={{ background: `radial-gradient(115% 85% at 50% 45%, transparent 60%, ${t === 'light' ? 'rgba(90,58,30,0.14)' : 'rgba(0,0,0,0.28)'} 100%)` }} />
      <AbsoluteFill style={{ backgroundImage: GRAIN_URI, backgroundSize: '160px 160px', opacity: 0.05, mixBlendMode: 'overlay' }} />
    </AbsoluteFill>
  )
}

export const Beat: React.FC<{
  text: string
  isHook: boolean
  clipUrl?: string | null
  accent: string
  index: number
  durationInFrames: number
  captionStyle?: CaptionStyle
  captionConfig?: Partial<Record<CaptionStyle, Partial<StyleConfig>>>
  emphasis?: number[]
  zone?: 'top' | 'middle' | 'bottom'
  beatType?: 'clip' | 'text' | 'cta' | 'mockup'
  poster?: string | null
  brandName?: string
  brandLogo?: string | null
  brandWordmark?: string | null
  fieldTone?: 'light' | 'rich' | 'deep'
  // Per-beat field COLOUR override (storyboard edit popup): the whole text/CTA stage
  // re-derives from this hue instead of the brand colour. Absent = brand colour.
  fieldColor?: string | null
  kenBurns?: { enabled?: boolean; intensity?: number } | null
  grade?: string | null
}> = ({ text, isHook, clipUrl, accent, index, durationInFrames, captionStyle, captionConfig, emphasis, zone, beatType, poster, brandName, brandLogo, brandWordmark, fieldTone, fieldColor, kenBurns, grade }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  // A failed clip fetch (e.g. a Pexels CDN 503) flips this so the beat degrades to the branded
  // gradient instead of failing the whole reel.
  const [clipFailed, setClipFailed] = React.useState(false)

  // Quick fade-in for a clean cut into each beat.
  const opacity = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: 'clamp' })
  // Slow Ken Burns push; alternate direction per beat for variety. Intensity from reel.kenBurns
  // (absent -> 1 = current default; enabled:false or 0 -> static; >1 -> more dramatic).
  const dir = index % 2 === 0 ? 1 : -1
  const kbI = kenBurns ? (kenBurns.enabled === false ? 0 : (typeof kenBurns.intensity === 'number' ? kenBurns.intensity : 1)) : 1
  const k = Math.max(0, kbI)
  const scale = interpolate(frame, [0, durationInFrames], [1 + 0.06 * k, 1 + 0.16 * k], { extrapolateRight: 'clamp' })
  const panX = interpolate(frame, [0, durationInFrames], [0, 22 * dir * k], { extrapolateRight: 'clamp' })
  // Colour grade over the clip layer (reel.grade -> GRADE_PRESETS). Absent -> no filter.
  const gradeFilter = grade && GRADE_PRESETS[grade] ? GRADE_PRESETS[grade] : undefined

  // Kinetic text beat (Studio v2 slice 1): the words ARE the scene. A slowly drifting
  // brand-colour field (alternating polarity per beat for rhythm) with the caption
  // rendered at hook scale. Footage and caption zones don't apply here.
  // MUST stay byte-identical to the frontend mirror src/remotion/ReelVideo.tsx.
  if (beatType === 'text') {
    // Field tone: the reel-level look (mood preset / planner choice) wins; without one,
    // beats alternate rich/deep as before. Type colour tracks the tone - deep brand
    // ink on the light cream field, white on deep, auto-contrast on rich.
    const tone = fieldTone || (index % 2 === 1 ? 'deep' : 'rich')
    // fx: the hue this beat's stage derives from — per-beat colour override or brand.
    const fx = (fieldColor && /^#[0-9a-fA-F]{3,8}$/.test(fieldColor)) ? fieldColor : accent
    const textCol = tone === 'light' ? shade(fx, -0.52) : (tone === 'deep' ? '#FFFFFF' : idealText(fx))
    // On the light field, preset text colours designed for dark grounds (cream/white)
    // would vanish - override textColor to the tone's ink for this beat only.
    let cfg = captionConfig
    if (tone === 'light' && cfg) {
      const patched: any = {}
      for (const k of Object.keys(cfg)) { const v = (cfg as any)[k]; patched[k] = v && v.textColor ? { ...v, textColor: textCol } : v }
      cfg = patched
    }
    return (
      <AbsoluteFill style={{ opacity }}>
        <BrandField accent={fx} frame={frame} tone={tone} />
        {/* slow push-in keeps the type alive for the whole beat */}
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 + (frame / Math.max(1, durationInFrames)) * 0.05})` }}>
          <Captions text={text} accent={textCol} isHook style={captionStyle} durationInFrames={durationInFrames} captionConfig={cfg} emphasis={emphasis} />
        </div>
      </AbsoluteFill>
    )
  }



  // Website/mockup beat (Studio v2 slice 4): the scene's poster image (their website,
  // menu, booking page - any tall screenshot) inside a phone frame, slowly scrolling.
  if (beatType === 'mockup') {
    const scroll = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateRight: 'clamp' })
    const rise = interpolate(frame, [0, 12], [60, 0], { extrapolateRight: 'clamp' })
    return (
      <AbsoluteFill style={{ opacity }}>
        <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 15%, ${shade(accent, -0.3)} 0%, ${shade(accent, -0.52)} 60%, ${shade(accent, -0.68)} 100%)` }} />
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '58%', aspectRatio: '9 / 18.5', position: 'relative', transform: `translateY(${rise}px)` }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 54, background: '#141210', boxShadow: '0 50px 100px -40px rgba(0,0,0,.6), inset 0 0 0 3px rgba(255,255,255,.08)' }} />
            <div style={{ position: 'absolute', inset: 10, borderRadius: 46, overflow: 'hidden', background: '#fff' }}>
              {poster ? (
                <Img src={poster} style={{ width: '100%', height: 'auto', minHeight: '100%', objectFit: 'cover', objectPosition: `50% ${scroll}%` }} />
              ) : (
                <AbsoluteFill style={{ background: `linear-gradient(160deg, ${shade(accent, 0.25)}, ${shade(accent, -0.1)})` }} />
              )}
            </div>
            <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', width: '26%', height: 22, borderRadius: 100, background: '#141210' }} />
          </div>
        </AbsoluteFill>
        <Captions text={text} accent={accent} isHook={false} style={captionStyle} durationInFrames={durationInFrames} captionConfig={captionConfig} emphasis={emphasis} />
      </AbsoluteFill>
    )
  }
  // Branded CTA end-card (Studio v2, agency pass): the reel's closer as an EDITORIAL
  // LOCKUP — no container box. The logo levitates in free space, the brand name
  // renders as a serif WORDMARK with an accent full stop (the "Creslo." mark style,
  // every brand gets the same treatment in its own colour), a hairline gradient rule
  // draws beneath it, and the CTA line breathes over the glow. 0.6-1.2s ease-outs;
  // nothing sits still. No footage, no zones.
  if (beatType === 'cta') {
    // fx: per-beat colour override or brand — the whole card (field, glow, rule,
    // wordmark dot) re-derives from it so the hue swap stays harmonised.
    const fx = (fieldColor && /^#[0-9a-fA-F]{3,8}$/.test(fieldColor)) ? fieldColor : accent
    const logoS = spring({ frame: frame - 2, fps, config: { damping: 13, mass: 0.7, stiffness: 120 } })
    const nameS = spring({ frame: frame - 9, fps, config: { damping: 16, mass: 0.8, stiffness: 110 } })
    const rule = interpolate(frame, [16, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const breathe = 1 + Math.sin(frame * 0.09) * 0.012
    const glow = 0.45 + Math.sin(frame * 0.13) * 0.18
    const float = Math.sin(frame * 0.045) * 7 // slow levitation of the whole lockup
    const name = String(brandName || '').trim()
    const endsPunct = /[.!?]$/.test(name)
    // Wordmark scales to the name so long business names never clip at 1080 wide.
    const nameSize = Math.min(84, Math.max(46, Math.round(1000 / Math.max(8, name.length))))
    return (
      <AbsoluteFill style={{ opacity }}>
        {/* the CTA accepts rich/deep tone overrides (storyboard ↻) but never light:
            the identity lockup (cream wordmark, glowing rule) needs a dark ground */}
        <BrandField accent={fx} frame={frame} tone={fieldTone === 'rich' ? 'rich' : 'deep'} />
        {/* breathing accent glow behind the CTA line */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 900, height: 900, transform: 'translate(-50%, -50%)', background: `radial-gradient(circle, ${hexA(fx, 0.3)} 0%, transparent 62%)`, opacity: glow }} />
        {/* identity lockup — floats free, no panel */}
        <div style={{ position: 'absolute', top: '14%', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, transform: `translateY(${float}px)` }}>
          {brandLogo ? (
            <Img src={brandLogo} style={{
              width: 150, height: 150, borderRadius: 36, objectFit: 'cover',
              opacity: logoS, transform: `scale(${0.72 + 0.28 * logoS}) translateY(${(1 - logoS) * 34}px)`,
              boxShadow: `0 46px 90px -36px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.15), 0 0 70px ${hexA(shade(fx, 0.42), 0.3)}`,
            }} />
          ) : null}
          {brandWordmark ? (
            <div style={{ overflow: 'hidden', padding: '0.1em 0.12em' }}>
              {/* the brand's REAL wordmark image (brands.wordmark_url) rising through a mask */}
              <Img src={brandWordmark} style={{
                maxWidth: 640, maxHeight: 150, objectFit: 'contain', display: 'block',
                opacity: nameS, transform: `translateY(${(1 - nameS) * 60}px)`,
                filter: 'drop-shadow(0 10px 34px rgba(0,0,0,.35))',
              }} />
            </div>
          ) : name ? (
            <div style={{ overflow: 'hidden', padding: '0.1em 0.12em' }}>
              {/* serif wordmark rising through a mask — the brand's "name style" moment */}
              <div style={{
                fontFamily: WORDMARK_FONT, fontWeight: 400, fontSize: nameSize, lineHeight: 1.06,
                color: '#FFFFFF', whiteSpace: 'nowrap', textShadow: '0 10px 44px rgba(0,0,0,.4)',
                opacity: nameS, transform: `translateY(${(1 - nameS) * 108}%)`,
              }}>
                {name}{endsPunct ? '' : <span style={{ color: shade(fx, 0.45) }}>.</span>}
              </div>
            </div>
          ) : null}
          <div style={{ width: 210 * rule, height: 3, borderRadius: 4, background: `linear-gradient(90deg, transparent, ${shade(fx, 0.4)}, transparent)`, opacity: rule, boxShadow: `0 0 ${14 + glow * 16}px ${hexA(shade(fx, 0.4), 0.9)}` }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${breathe})` }}>
          <Captions text={text} accent={fx} isHook style={captionStyle} durationInFrames={durationInFrames} captionConfig={captionConfig} emphasis={emphasis} />
        </div>
      </AbsoluteFill>
    )
  }
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: '#000' }}>
      <AbsoluteFill style={{ transform: `scale(${scale}) translateX(${panX}px)`, filter: gradeFilter }}>
        {clipUrl && !clipFailed ? (
          <OffthreadVideo src={clipUrl} muted onError={() => setClipFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <AbsoluteFill
            style={{
              background: `radial-gradient(120% 90% at 50% 18%, ${shade(accent, 0.18)} 0%, ${shade(accent, -0.2)} 55%, ${shade(accent, -0.55)} 100%)`,
            }}
          />
        )}
      </AbsoluteFill>

      {/* legibility gradient */}
      <AbsoluteFill
        style={{
          background: isHook
            ? 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.15) 65%, rgba(0,0,0,0.45) 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      <Captions text={text} accent={accent} isHook={isHook} style={captionStyle} durationInFrames={durationInFrames} captionConfig={captionConfig} emphasis={emphasis} zone={zone} />
    </AbsoluteFill>
  )
}
