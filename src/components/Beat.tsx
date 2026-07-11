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

// ===== FieldStage: keyed background TREATMENTS behind text/CTA beats. =====
// Lookbook designs promoted into the composition (2026-07-10). Every style derives
// entirely from the beat hue so ANY brand colour works; light-ground styles are
// flagged in FIELD_LIGHT_STYLES so the type flips to dark ink (readability law).
// 'mesh' (default) = BrandField v3, which honours the tone. Deterministic layers
// only (sin/cos of frame) — identical on every render.
// MUST stay byte-identical in both composition mirrors.
export const FIELD_LIGHT_STYLES = new Set(['silk', 'rays', 'paper', 'marble', 'gallery', 'linen', 'dawn', 'halftone', 'leak'])
const FieldStage: React.FC<{ styleKey?: string | null; accent: string; frame: number; tone?: 'light' | 'rich' | 'deep' }> = ({ styleKey, accent, frame, tone }) => {
  const a = accent
  const grain = <AbsoluteFill style={{ backgroundImage: GRAIN_URI, backgroundSize: '160px 160px', opacity: 0.05, mixBlendMode: 'overlay' }} />
  const sweepX = ((frame % 150) / 150) * 240 - 70
  const sweep = (op: number) => (
    <div style={{ position: 'absolute', top: '-25%', bottom: '-25%', width: '34%', left: `${sweepX}%`, transform: 'rotate(14deg)', mixBlendMode: 'screen', background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,${op * 0.5}) 38%, rgba(255,255,255,${op}) 50%, rgba(255,255,255,${op * 0.5}) 62%, transparent 100%)` }} />
  )
  switch (styleKey) {
    case 'silk': // Cream Silk — pale satin of the hue, breathing light, slow polish pass
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `linear-gradient(152deg, ${shade(a, 0.8)} 0%, ${shade(a, 0.62)} 52%, ${shade(a, 0.42)} 100%)` }} />
          <AbsoluteFill style={{ background: `radial-gradient(70% 50% at 78% 22%, rgba(255,255,255,${0.55 + Math.sin(frame * 0.05) * 0.2}), transparent 65%)` }} />
          {sweep(0.35)}
          {grain}
        </AbsoluteFill>
      )
    case 'espresso': // Espresso Glow — deep roast radial with one breathing ember
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 24%, ${shade(a, -0.28)} 0%, ${shade(a, -0.55)} 58%, ${shade(a, -0.75)} 100%)` }} />
          <AbsoluteFill style={{ background: `radial-gradient(60% 44% at 50% 42%, ${hexA(shade(a, 0.3), 0.28 + Math.sin(frame * 0.06) * 0.14)}, transparent 70%)` }} />
          {grain}
        </AbsoluteFill>
      )
    case 'bokeh': { // Bokeh Depth — out-of-focus lights drifting through depth
      const discs = [
        { x: 12 + Math.sin(frame * 0.012) * 10, y: 14 + Math.cos(frame * 0.01) * 8, s: 34, c: shade(a, 0.45), o: 0.5 },
        { x: 78 + Math.cos(frame * 0.011) * 8, y: 30 + Math.sin(frame * 0.013) * 9, s: 20, c: '#ffffff', o: 0.38 },
        { x: 70 + Math.sin(frame * 0.009) * 9, y: 78 + Math.cos(frame * 0.012) * 7, s: 44, c: shade(a, 0.3), o: 0.32 },
        { x: 22 + Math.cos(frame * 0.014) * 7, y: 66 + Math.sin(frame * 0.011) * 8, s: 14, c: '#ffffff', o: 0.42 },
      ]
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 30%, ${shade(a, -0.2)}, ${shade(a, -0.6)} 75%)` }} />
          {discs.map((d, i) => (
            <div key={i} style={{ position: 'absolute', left: `calc(${d.x}% - ${d.s / 2}%)`, top: `calc(${d.y}% - ${d.s / 4}%)`, width: `${d.s}%`, aspectRatio: '1', borderRadius: '50%', filter: 'blur(30px)', background: `radial-gradient(circle, ${hexA(d.c, d.o)}, transparent 70%)` }} />
          ))}
          {grain}
        </AbsoluteFill>
      )
    }
    case 'horizon': // Horizon Grid — full-length grid racing from a high glowing horizon
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `linear-gradient(180deg, ${shade(a, -0.78)} 0%, ${shade(a, -0.55)} 42%, ${shade(a, -0.25)} 100%)` }} />
          <div style={{
            position: 'absolute', left: '-40%', right: '-40%', bottom: '-4%', height: '96%',
            backgroundImage: `linear-gradient(${hexA(shade(a, 0.35), 0.28)} 1.5px, transparent 1.5px), linear-gradient(90deg, ${hexA(shade(a, 0.35), 0.28)} 1.5px, transparent 1.5px)`,
            backgroundSize: '110px 110px', backgroundPosition: `0px ${(frame * 1.4) % 110}px`,
            transform: 'perspective(700px) rotateX(58deg)', transformOrigin: '50% 0%',
            maskImage: 'linear-gradient(180deg, transparent 0%, black 30%)', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 30%)',
          }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '22%', height: 1, background: `linear-gradient(90deg, transparent 14%, ${hexA(shade(a, 0.4), 0.4)} 50%, transparent 86%)` }} />
          <div style={{ position: 'absolute', width: '44%', aspectRatio: '1', left: '28%', top: '8%', borderRadius: '50%', filter: 'blur(30px)', background: `radial-gradient(circle, ${hexA(shade(a, 0.3), 0.4)}, transparent 65%)` }} />
          {grain}
        </AbsoluteFill>
      )
    case 'embers': { // Ember Field — sparks rising through the dark
      const layers = [
        { size: '110px 160px', speed: 0.5, dot: 1.6, c: shade(a, 0.42), o: 0.9 },
        { size: '70px 120px', speed: 0.8, dot: 1.2, c: shade(a, 0.25), o: 0.7 },
        { size: '50px 90px', speed: 1.1, dot: 1, c: '#fffdf8', o: 0.8 },
      ]
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 28%, ${shade(a, -0.42)}, ${shade(a, -0.78)} 80%)` }} />
          {layers.map((l, i) => (
            <AbsoluteFill key={i} style={{ backgroundImage: `radial-gradient(${hexA(l.c, l.o)} ${l.dot}px, transparent ${l.dot}px)`, backgroundSize: l.size, backgroundPosition: `${10 + i * 30}px ${-(frame * l.speed) % 200}px` }} />
          ))}
          <AbsoluteFill style={{ background: `radial-gradient(55% 38% at 50% 52%, ${hexA(shade(a, 0.1), 0.25 + Math.sin(frame * 0.08) * 0.12)}, transparent 70%)` }} />
          {grain}
        </AbsoluteFill>
      )
    }
    case 'aurora': // Aurora Ribbon — slow ribbons of the hue flowing round the frame
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `linear-gradient(180deg, ${shade(a, -0.75)}, ${shade(a, -0.5)})` }} />
          <div style={{ position: 'absolute', inset: '-30%', filter: 'blur(28px)', transform: `rotate(${(frame * 0.4) % 360}deg) scale(1.6)`, background: `conic-gradient(from 90deg, transparent 0deg, ${hexA(shade(a, 0.25), 0.5)} 60deg, ${hexA(shade(a, 0.5), 0.6)} 100deg, ${hexA(shade(a, 0.05), 0.4)} 150deg, transparent 210deg)` }} />
          <div style={{ position: 'absolute', inset: '-30%', filter: 'blur(34px)', transform: `rotate(${-(frame * 0.28) % 360}deg) scale(1.6)`, background: `conic-gradient(from 270deg, transparent 0deg, rgba(245,236,222,0.28) 70deg, transparent 140deg)` }} />
          {grain}
        </AbsoluteFill>
      )
    case 'rays': // Ray Fan — art-deco sunburst slowly wheeling on the pale hue
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: shade(a, 0.78) }} />
          <div style={{ position: 'absolute', inset: '-60% -60% -20% -60%', transform: `rotate(${(frame * 0.12) % 360}deg)`, background: `repeating-conic-gradient(from 0deg at 50% 50%, ${hexA(shade(a, 0.42), 0.4)} 0 9deg, transparent 9deg 18deg)` }} />
          <AbsoluteFill style={{ background: `radial-gradient(62% 42% at 50% 46%, ${hexA(shade(a, 0.85), 0.95)}, ${hexA(shade(a, 0.8), 0.3)} 78%)` }} />
          {grain}
        </AbsoluteFill>
      )
    case 'paper': { // Paper Strata — the hue's ramp as rolling layers along the base
      const wob = (i: number) => Math.sin(frame * 0.04 + i * 1.4) * 6
      const bands = [
        { top: 68, c: shade(a, 0.55) }, { top: 76, c: shade(a, 0.3) },
        { top: 84, c: shade(a, 0) }, { top: 91, c: shade(a, -0.35) },
      ]
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `linear-gradient(180deg, ${shade(a, 0.82)} 0%, ${shade(a, 0.66)} 70%)` }} />
          {bands.map((b, i) => (
            <div key={i} style={{ position: 'absolute', left: '-6%', right: '-6%', top: `${b.top}%`, bottom: '-2%', background: b.c, borderRadius: `${46 + wob(i)}% ${54 - wob(i)}% 0 0 / 26px 22px 0 0`, boxShadow: '0 -8px 24px -12px rgba(60,38,18,.35)' }} />
          ))}
          {grain}
        </AbsoluteFill>
      )
    }
    case 'spot': { // Spotlight Stage — a swinging theatre beam and its pool of light
      const swing = Math.sin(frame * 0.03) * 7
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `radial-gradient(130% 110% at 50% 110%, ${shade(a, -0.5)}, ${shade(a, -0.8)} 75%)` }} />
          <div style={{ position: 'absolute', left: '20%', right: '20%', top: '-4%', height: '78%', transformOrigin: '50% 0%', transform: `rotate(${swing}deg)`, clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)', filter: 'blur(14px)', background: 'linear-gradient(180deg, rgba(245,236,222,.38), rgba(245,236,222,.05) 80%, transparent)' }} />
          <div style={{ position: 'absolute', left: '14%', right: '14%', bottom: '14%', height: '9%', borderRadius: '50%', filter: 'blur(12px)', background: `radial-gradient(ellipse, ${hexA(shade(a, 0.35), 0.35 + Math.sin(frame * 0.05) * 0.12)}, transparent 70%)` }} />
          {grain}
        </AbsoluteFill>
      )
    }
    case 'marble': // Marble Veins — polished stone with drifting veins and a polish pass
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `linear-gradient(150deg, ${shade(a, 0.82)} 0%, ${shade(a, 0.7)} 60%, ${shade(a, 0.56)} 100%)` }} />
          <AbsoluteFill style={{ transform: `translate(${Math.sin(frame * 0.01) * 3}%, ${Math.cos(frame * 0.012) * 2}%)`, background: `linear-gradient(118deg, transparent 42%, ${hexA(shade(a, -0.1), 0.16)} 46%, transparent 50%, transparent 66%, ${hexA(shade(a, -0.35), 0.1)} 70%, transparent 74%)`, filter: 'blur(2px)' }} />
          <AbsoluteFill style={{ transform: `translate(${Math.cos(frame * 0.009) * -3}%, ${Math.sin(frame * 0.011) * 2}%)`, background: `linear-gradient(64deg, transparent 30%, ${hexA(shade(a, 0.1), 0.14)} 34%, transparent 38%)`, filter: 'blur(3px)' }} />
          {sweep(0.3)}
          {grain}
        </AbsoluteFill>
      )
    case 'gallery': // Gallery Paper — matte paper, hairline frame, museum calm
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: shade(a, 0.8) }} />
          <AbsoluteFill style={{ background: `radial-gradient(130% 100% at 50% 50%, transparent 55%, ${hexA(shade(a, -0.4), 0.14)} 100%)` }} />
          <div style={{ position: 'absolute', left: '7%', right: '7%', top: '7%', bottom: '7%', border: `2px solid ${hexA(shade(a, -0.3), 0.3 + Math.sin(frame * 0.05) * 0.1)}`, borderRadius: 6 }} />
          {grain}
        </AbsoluteFill>
      )
    case 'linen': // Linen Bands — drifting tonal stripes, woven-fabric texture
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `linear-gradient(90deg, ${shade(a, 0.66)} 0px, ${shade(a, 0.66)} 90px, ${shade(a, 0.76)} 90px, ${shade(a, 0.76)} 270px)`, backgroundSize: '270px 100%', backgroundPosition: `${(frame * 0.5) % 270}px 0` }} />
          <AbsoluteFill style={{ background: `radial-gradient(80% 55% at 50% 34%, rgba(255,255,255,.5), transparent 70%)` }} />
          {grain}
        </AbsoluteFill>
      )
    case 'dawn': // First Light — sunrise horizon in the hue, warm start-of-day energy
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `linear-gradient(180deg, ${shade(a, 0.8)} 0%, ${shade(a, 0.62)} 46%, ${shade(a, 0.3)} 78%, ${a} 130%)` }} />
          <AbsoluteFill style={{ background: `radial-gradient(90% 32% at 50% 74%, ${hexA(a, 0.35 + Math.sin(frame * 0.045) * 0.12)}, transparent 70%)` }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: '71%', height: 2, background: `linear-gradient(90deg, transparent 10%, ${hexA(shade(a, -0.35), 0.5)} 50%, transparent 90%)` }} />
          {grain}
        </AbsoluteFill>
      )
    case 'satin': // Satin Sweep — polished satin with a confident recurring light pass
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `linear-gradient(135deg, ${shade(a, -0.08)} 0%, ${shade(a, -0.35)} 50%, ${shade(a, -0.58)} 100%)` }} />
          <AbsoluteFill style={{ background: `radial-gradient(90% 60% at 30% 20%, ${hexA(shade(a, 0.35), 0.3)}, transparent 65%)` }} />
          {sweep(0.4)}
          {grain}
        </AbsoluteFill>
      )
    case 'halftone': // Halftone Fade — drifting print dots dissolving into the pale hue
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: shade(a, 0.78) }} />
          <AbsoluteFill style={{ backgroundImage: `radial-gradient(${hexA(shade(a, -0.3), 0.4)} 2px, transparent 2px)`, backgroundSize: '22px 22px', backgroundPosition: `${(frame * 0.4) % 22}px 0`, maskImage: 'linear-gradient(200deg, black 20%, transparent 68%)', WebkitMaskImage: 'linear-gradient(200deg, black 20%, transparent 68%)' }} />
          <AbsoluteFill style={{ background: `radial-gradient(70% 45% at 50% 60%, ${hexA(shade(a, 0.85), 0.75)}, transparent 72%)` }} />
          {grain}
        </AbsoluteFill>
      )
    case 'ink': { // Ink Bloom — drops blooming and dissolving in dark water
      const bloom = (off: number, x: number, y: number, s: number, c: string) => {
        const p = ((frame + off) % 200) / 200
        return <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: `${s}%`, aspectRatio: '1', borderRadius: '50%', filter: 'blur(16px)', background: `radial-gradient(circle, ${hexA(c, 0.45)}, transparent 62%)`, transform: `translate(-50%,-50%) scale(${0.3 + p * 1.4})`, opacity: (1 - p) * 0.8 }} />
      }
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `radial-gradient(120% 100% at 50% 30%, ${shade(a, -0.45)}, ${shade(a, -0.78)} 80%)` }} />
          {bloom(0, 26, 24, 56, shade(a, 0.25))}
          {bloom(70, 76, 72, 48, shade(a, 0.42))}
          {bloom(140, 50, 86, 40, '#f5ecde')}
          {grain}
        </AbsoluteFill>
      )
    }
    case 'ribbon': // Ribbon Weave — crossing satin ribbons drifting on the diagonal
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `linear-gradient(165deg, ${shade(a, -0.15)}, ${shade(a, -0.55)})` }} />
          <div style={{ position: 'absolute', left: '-30%', right: '-30%', top: '14%', height: '15%', filter: 'blur(2px)', background: `linear-gradient(90deg, ${hexA(shade(a, 0.4), 0.15)}, ${hexA(shade(a, 0.4), 0.5)}, ${hexA(shade(a, 0.4), 0.15)})`, transform: `rotate(-14deg) translateX(${Math.sin(frame * 0.02) * 4}%)` }} />
          <div style={{ position: 'absolute', left: '-30%', right: '-30%', top: '70%', height: '12%', background: `linear-gradient(90deg, rgba(245,236,222,.1), rgba(245,236,222,.35), rgba(245,236,222,.1))`, transform: `rotate(9deg) translateX(${Math.cos(frame * 0.017) * 4}%)` }} />
          <div style={{ position: 'absolute', left: '-30%', right: '-30%', bottom: '4%', height: '16%', filter: 'blur(2px)', background: `linear-gradient(90deg, ${hexA(shade(a, 0.2), 0.2)}, ${hexA(shade(a, 0.2), 0.55)}, ${hexA(shade(a, 0.2), 0.2)})`, transform: `rotate(-7deg) translateX(${Math.sin(frame * 0.014) * 5}%)` }} />
          {grain}
        </AbsoluteFill>
      )
    case 'velvet': // Velvet Rim — near-black hue, one breathing rim of light
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `radial-gradient(140% 120% at 50% 120%, ${shade(a, -0.55)}, ${shade(a, -0.82)} 70%)` }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '40%', background: `linear-gradient(180deg, ${hexA(shade(a, 0.25), 0.25 + Math.sin(frame * 0.045) * 0.12)}, transparent)` }} />
          <div style={{ position: 'absolute', left: '8%', right: '8%', top: '9%', height: 1.5, background: `linear-gradient(90deg, transparent, ${hexA(shade(a, 0.42), 0.8)}, transparent)`, boxShadow: `0 0 14px ${hexA(shade(a, 0.42), 0.6)}` }} />
          {grain}
        </AbsoluteFill>
      )
    case 'leak': // Light Leak — warm analogue leaks drifting across pale film
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `linear-gradient(170deg, ${shade(a, 0.8)}, ${shade(a, 0.66)})` }} />
          <div style={{ position: 'absolute', width: '60%', height: '130%', left: '-16%', top: '-16%', filter: 'blur(24px)', background: `linear-gradient(90deg, transparent, ${hexA(shade(a, 0.2), 0.5)}, transparent)`, transform: `rotate(-16deg) translateX(${Math.sin(frame * 0.02) * 10}%)` }} />
          <div style={{ position: 'absolute', width: '40%', height: '130%', right: '-10%', top: '-10%', filter: 'blur(26px)', background: `linear-gradient(90deg, transparent, ${hexA(shade(a, 0.45), 0.55)}, transparent)`, transform: `rotate(-14deg) translateX(${Math.cos(frame * 0.016) * -8}%)` }} />
          {grain}
        </AbsoluteFill>
      )
    case 'starfall': { // Starfall — shooting streaks over a still starfield
      const streak = (off: number, top: number, w: number, o: number) => {
        const p = ((frame + off) % 170) / 170
        return <div style={{ position: 'absolute', width: `${w}%`, height: 2, left: `${-25 + p * 150}%`, top: `${top}%`, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${hexA('#f5ecde', o)})`, transform: 'rotate(24deg)', opacity: p < 0.08 ? p * 10 : (1 - p) }} />
      }
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `linear-gradient(200deg, ${shade(a, -0.8)}, ${shade(a, -0.55)} 70%, ${shade(a, -0.4)})` }} />
          <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(245,236,222,.9) 1px, transparent 1px)', backgroundSize: '70px 110px', opacity: 0.5 }} />
          {streak(0, 12, 22, 0.9)}
          {streak(60, 26, 16, 0.7)}
          {streak(110, 7, 13, 0.6)}
          {streak(140, 78, 15, 0.55)}
          {grain}
        </AbsoluteFill>
      )
    }
    case 'mosaic': // Mosaic Twinkle — tiled squares twinkling round a focus pool
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: shade(a, -0.6) }} />
          <AbsoluteFill style={{ backgroundImage: `conic-gradient(${hexA(shade(a, 0.25), 0.28)} 90deg, transparent 90deg 180deg, ${hexA(shade(a, 0.25), 0.28)} 180deg 270deg, transparent 270deg)`, backgroundSize: '44px 44px', opacity: 0.35 + Math.sin(frame * 0.06) * 0.18 }} />
          <AbsoluteFill style={{ backgroundImage: `conic-gradient(transparent 90deg, ${hexA(shade(a, -0.3), 0.4)} 90deg 180deg, transparent 180deg 270deg, ${hexA(shade(a, -0.3), 0.4)} 270deg)`, backgroundSize: '44px 44px', opacity: 0.35 - Math.sin(frame * 0.06) * 0.18 }} />
          <AbsoluteFill style={{ background: `radial-gradient(70% 48% at 50% 50%, ${hexA(shade(a, -0.62), 0.92)}, ${hexA(shade(a, -0.62), 0.15)} 80%)` }} />
          {grain}
        </AbsoluteFill>
      )
    case 'rings': { // Pulse Rings — sonar rings radiating from the message
      const ring = (off: number) => {
        const p = ((frame + off) % 120) / 120
        return <div style={{ position: 'absolute', left: '50%', top: '50%', width: '70%', aspectRatio: '1', borderRadius: '50%', border: `1.5px solid ${hexA(shade(a, 0.4), 0.7)}`, transform: `translate(-50%,-50%) scale(${0.2 + p * 1.5})`, opacity: (1 - p) * 0.8 }} />
      }
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `radial-gradient(120% 100% at 50% 40%, ${shade(a, -0.28)}, ${shade(a, -0.6)} 70%)` }} />
          {ring(0)}{ring(40)}{ring(80)}
          <AbsoluteFill style={{ background: `radial-gradient(46% 26% at 50% 50%, ${hexA(shade(a, -0.55), 0.75)}, transparent 75%)` }} />
          {grain}
        </AbsoluteFill>
      )
    }
    case 'nebula': { // Nebula Smoke — morphing clouds with pinprick stars
      const m = (i: number) => 46 + Math.sin(frame * 0.02 + i) * 10
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: `radial-gradient(130% 100% at 50% 100%, ${shade(a, -0.5)}, ${shade(a, -0.8)} 78%)` }} />
          <div style={{ position: 'absolute', width: '90%', height: '52%', left: '-6%', top: '8%', filter: 'blur(26px)', background: `radial-gradient(closest-side, ${hexA(shade(a, 0.25), 0.5)}, transparent)`, borderRadius: `${m(0)}% ${100 - m(0)}% ${m(2)}% ${100 - m(2)}%`, transform: `translate(${Math.sin(frame * 0.014) * 5}%, ${Math.cos(frame * 0.012) * 4}%) scale(${1.1 + Math.sin(frame * 0.016) * 0.12})` }} />
          <div style={{ position: 'absolute', width: '80%', height: '46%', right: '-10%', top: '34%', filter: 'blur(28px)', background: 'radial-gradient(closest-side, rgba(245,236,222,.26), transparent)', borderRadius: `${m(3)}% ${100 - m(3)}% ${m(1)}% ${100 - m(1)}%`, transform: `translate(${Math.cos(frame * 0.011) * -5}%, ${Math.sin(frame * 0.013) * 4}%)` }} />
          <AbsoluteFill style={{ backgroundImage: 'radial-gradient(rgba(255,253,248,.9) 1px, transparent 1px)', backgroundSize: '60px 90px', opacity: 0.5 }} />
          {grain}
        </AbsoluteFill>
      )
    }
    case 'chrome': // Chrome Flow — molten metal swirl of the hue
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ background: shade(a, -0.7) }} />
          <div style={{ position: 'absolute', inset: '-40%', filter: 'blur(22px) saturate(1.1)', transform: `rotate(${(frame * 0.5) % 360}deg)`, background: `conic-gradient(${shade(a, -0.45)}, ${shade(a, 0)}, ${shade(a, 0.5)}, ${shade(a, 0.85)}, ${shade(a, 0.25)}, ${shade(a, -0.3)}, ${shade(a, -0.45)})` }} />
          <AbsoluteFill style={{ background: `radial-gradient(70% 55% at 50% 50%, transparent 40%, ${hexA(shade(a, -0.78), 0.75)} 100%)` }} />
          {grain}
        </AbsoluteFill>
      )
    default: // 'mesh' — BrandField v3 (honours the tone)
      return <BrandField accent={a} frame={frame} tone={tone} />
  }
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
  // Per-beat field STYLE (storyboard edit popup): keyed FieldStage treatment. Absent = mesh.
  fieldStyle?: string | null
  kenBurns?: { enabled?: boolean; intensity?: number } | null
  grade?: string | null
}> = ({ text, isHook, clipUrl, accent, index, durationInFrames, captionStyle, captionConfig, emphasis, zone, beatType, poster, brandName, brandLogo, brandWordmark, fieldTone, fieldColor, fieldStyle, kenBurns, grade }) => {
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
    // Ink follows the STYLE's ground when a treatment is set (light styles → dark type),
    // otherwise the mesh tone logic.
    const textCol = (fieldStyle && fieldStyle !== 'mesh')
      ? (FIELD_LIGHT_STYLES.has(fieldStyle) ? shade(fx, -0.55) : '#FFFFFF')
      : (tone === 'light' ? shade(fx, -0.52) : (tone === 'deep' ? '#FFFFFF' : idealText(fx)))
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
        <FieldStage styleKey={fieldStyle} accent={fx} frame={frame} tone={tone} />
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
        {/* the CTA accepts DARK-ground styles/tones only: the identity lockup (cream
            wordmark, glowing rule) needs a dark ground — light styles fall back to mesh */}
        <FieldStage styleKey={(fieldStyle && !FIELD_LIGHT_STYLES.has(fieldStyle)) ? fieldStyle : 'mesh'} accent={fx} frame={frame} tone={fieldTone === 'rich' ? 'rich' : 'deep'} />
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
