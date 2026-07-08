import React from 'react'
import { AbsoluteFill, OffthreadVideo, Img, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'
import { Captions } from './Captions'
import type { CaptionStyle, StyleConfig } from '../lib/types'

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
  kenBurns?: { enabled?: boolean; intensity?: number } | null
  grade?: string | null
}> = ({ text, isHook, clipUrl, accent, index, durationInFrames, captionStyle, captionConfig, emphasis, zone, beatType, poster, brandName, brandLogo, kenBurns, grade }) => {
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
    const drift = frame * 0.15
    const dark = index % 2 === 1
    const bgA = dark ? shade(accent, -0.5) : shade(accent, 0.1)
    const bgB = dark ? shade(accent, -0.25) : shade(accent, -0.18)
    return (
      <AbsoluteFill style={{ opacity }}>
        <AbsoluteFill style={{ background: `radial-gradient(130% 100% at ${50 + Math.sin(drift * 0.08) * 14}% ${30 + Math.cos(drift * 0.06) * 10}%, ${bgA} 0%, ${bgB} 62%, ${shade(accent, dark ? -0.62 : -0.3)} 100%)` }} />
        {/* slow push-in keeps the type alive for the whole beat */}
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${1 + (frame / Math.max(1, durationInFrames)) * 0.05})` }}>
          <Captions text={text} accent={dark ? '#FFFFFF' : idealText(accent)} isHook style={captionStyle} durationInFrames={durationInFrames} captionConfig={captionConfig} emphasis={emphasis} />
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
  // Branded CTA end-card (Studio v2 slice 3, premium pass): the reel's closer.
  // Brand LOGO (when the brand has one) springs in above a spaced-caps name and a
  // shimmering accent rule; the CTA line renders big via Captions (keeping the reel's
  // typography) over a breathing glow so the card never sits still. No footage, no zones.
  if (beatType === 'cta') {
    const logoS = spring({ frame: frame - 2, fps, config: { damping: 12, mass: 0.6, stiffness: 160 } })
    const eyebrow = interpolate(frame, [4, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const rule = interpolate(frame, [8, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    const breathe = 1 + Math.sin(frame * 0.09) * 0.012
    const glow = 0.45 + Math.sin(frame * 0.13) * 0.18
    return (
      <AbsoluteFill style={{ opacity }}>
        <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 20%, ${shade(accent, -0.35)} 0%, ${shade(accent, -0.55)} 60%, ${shade(accent, -0.7)} 100%)` }} />
        {/* breathing accent glow behind the CTA line */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 900, height: 900, transform: 'translate(-50%, -50%)', background: `radial-gradient(circle, ${hexA(accent, 0.32)} 0%, transparent 62%)`, opacity: glow }} />
        <div style={{ position: 'absolute', top: '20%', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {brandLogo ? (
            <Img src={brandLogo} style={{
              width: 128, height: 128, borderRadius: 30, objectFit: 'cover',
              opacity: logoS, transform: `scale(${0.7 + 0.3 * logoS})`,
              boxShadow: '0 30px 60px -28px rgba(0,0,0,.6)',
            }} />
          ) : null}
          {brandName ? <div style={{ fontFamily: "'Arial', sans-serif", fontWeight: 800, fontSize: 27, letterSpacing: '0.34em', textTransform: 'uppercase', color: '#FFFFFF', opacity: eyebrow * 0.92, paddingLeft: '0.34em' }}>{brandName}</div> : null}
          <div style={{ width: 130 * rule, height: 5, borderRadius: 4, background: accent, opacity: rule, boxShadow: `0 0 ${12 + glow * 14}px ${hexA(accent, 0.8)}` }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${breathe})` }}>
          <Captions text={text} accent={accent} isHook style={captionStyle} durationInFrames={durationInFrames} captionConfig={captionConfig} emphasis={emphasis} />
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
