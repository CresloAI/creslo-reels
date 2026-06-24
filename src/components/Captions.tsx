import React from 'react'
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat'
import { loadFont as loadAnton } from '@remotion/google-fonts/Anton'
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono'
import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces'
import { loadFont as loadInter } from '@remotion/google-fonts/Inter'
import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins'
import { TRANSITION_FRAMES, type CaptionStyle, type StyleConfig } from '../lib/types'

// Each style loads ONE font, limited to latin + only the weights used.
const montserrat = loadMontserrat().fontFamily
const anton = loadAnton('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily
const jetbrains = loadJetBrainsMono('normal', { weights: ['400', '700'], subsets: ['latin'] }).fontFamily
const fraunces = loadFraunces('normal', { weights: ['600'], subsets: ['latin'] }).fontFamily
const inter = loadInter('normal', { weights: ['600', '800'], subsets: ['latin'] }).fontFamily
const poppins = loadPoppins('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily

// ===== STYLE_CONFIG: one data map driving every per-style visual decision. =====
// MUST stay byte-identical to the frontend mirror in src/remotion/ReelVideo.tsx
// (only the loadFont import lines differ). accent === 'brand' resolves to the reel's
// brandColor at render; a literal hex overrides it. inputProps.captionConfig can
// override any field per style (B7) with no redeploy.
const STYLE_CONFIG: Record<CaptionStyle, StyleConfig> = {
  pop: { font: montserrat, textColor: '#FFFFFF', accent: 'brand', weight: 800, uppercase: true, sizeMul: 1, placement: 'center', reveal: 'wordSpring', activeFx: 'color', stroke: true },
  karaoke: { font: montserrat, textColor: '#FFFFFF', accent: 'brand', weight: 800, uppercase: true, sizeMul: 1, placement: 'center', reveal: 'wordSpring', activeFx: 'color', stroke: true },
  clean: { font: montserrat, textColor: '#FFFFFF', accent: 'brand', weight: 800, uppercase: true, sizeMul: 1, placement: 'center', reveal: 'wordSpring', activeFx: 'none', stroke: true },
  bold_box: { font: anton, textColor: '#FFFFFF', accent: 'brand', weight: 400, uppercase: true, sizeMul: 1, placement: 'center', reveal: 'wordSpring', activeFx: 'box', stroke: true },
  typewriter: { font: jetbrains, textColor: '#D8FFE9', accent: 'brand', weight: 700, uppercase: false, sizeMul: 1, placement: 'center', reveal: 'typewriter', activeFx: 'none', stroke: true },
  lower_third: { font: fraunces, textColor: '#F5EFE0', accent: 'brand', weight: 600, uppercase: false, sizeMul: 1, placement: 'lowerThird', reveal: 'fade', activeFx: 'none', stroke: false, band: { fill: '#1A1A1F', accentEdge: 'brand' } },
  big_subtitle: { font: inter, textColor: '#FFFFFF', accent: 'brand', weight: 700, uppercase: false, sizeMul: 1.18, placement: 'center', reveal: 'wordSpring', activeFx: 'none', stroke: true },
  highlighter: { font: poppins, textColor: '#0F1115', accent: '#FFE14D', weight: 700, uppercase: false, sizeMul: 1, placement: 'center', reveal: 'wordSpring', activeFx: 'highlight', stroke: false },
}

// White or near-black depending on a colour's luminance (Bold Box block text).
function idealText(hex: string) {
  const h = (hex || '#E8743B').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#0F1115' : '#ffffff'
}
function hexA(hex: string, a: number) {
  const h = (hex || '#E8743B').replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return `rgba(${r},${g},${b},${a})`
}

export const Captions: React.FC<{
  text: string
  accent: string
  isHook: boolean
  style?: CaptionStyle
  durationInFrames: number
  captionConfig?: Partial<Record<CaptionStyle, Partial<StyleConfig>>>
}> = ({ text, accent, isHook, style = 'pop', durationInFrames, captionConfig }) => {
  const frame = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const full = String(text || '').trim()
  if (!full) return null
  const words = full.split(/\s+/).filter(Boolean)

  // B7 seam: per-style defaults, overridable by inputProps.captionConfig with no redeploy.
  const cfg: StyleConfig = { ...(STYLE_CONFIG[style] || STYLE_CONFIG.pop), ...(captionConfig?.[style] || {}) }
  const dec = cfg.accent === 'brand' ? accent : cfg.accent

  // Finish the reveal/highlight BEFORE the cross-scene transition starts, then hold.
  const revealFrames = Math.max(1, durationInFrames - TRANSITION_FRAMES)
  const progress = Math.min(1, frame / revealFrames)

  // ---- Typewriter: char-by-char up to progress, then hold + blinking cursor ----
  if (cfg.reveal === 'typewriter') {
    const fontSize = isHook ? Math.round(width * 0.078) : Math.round(width * 0.058)
    const shown = full.slice(0, Math.min(full.length, Math.round(progress * full.length)))
    const cursorOn = Math.floor(frame / Math.max(1, Math.round(fps / 2))) % 2 === 0
    return (
      <div style={{
        position: 'absolute', left: 0, right: 0,
        top: isHook ? '40%' : undefined, bottom: isHook ? undefined : '16%',
        padding: `0 ${width * 0.08}px`, textAlign: 'left',
        fontFamily: cfg.font, fontWeight: cfg.weight, fontSize, lineHeight: 1.2, color: cfg.textColor,
        WebkitTextStroke: cfg.stroke ? `${Math.max(1, fontSize * 0.01)}px rgba(0,0,0,0.85)` : undefined,
        textShadow: '0 4px 18px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.7)',
      }}>
        {shown}<span style={{ color: dec, opacity: cursorOn ? 1 : 0 }}>▍</span>
      </div>
    )
  }

  // ---- Lower Third: caption in a band pinned to the lower third (fade in) ----
  if (cfg.placement === 'lowerThird') {
    const fontSize = isHook ? Math.round(width * 0.062) : Math.round(width * 0.05)
    const appear = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' })
    const bandFill = cfg.band ? cfg.band.fill : 'rgba(0,0,0,0.62)'
    const edge = cfg.band ? (cfg.band.accentEdge === 'brand' ? accent : cfg.band.accentEdge) : dec
    return (
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: '14%',
        display: 'flex', justifyContent: 'center', padding: `0 ${width * 0.06}px`,
        opacity: appear, transform: `translateY(${interpolate(appear, [0, 1], [16, 0])}px)`,
      }}>
        <div style={{
          maxWidth: '88%', background: bandFill,
          borderLeft: `${Math.round(width * 0.012)}px solid ${edge}`, borderRadius: 8,
          padding: `${fontSize * 0.5}px ${fontSize * 0.7}px`,
          fontFamily: cfg.font, fontWeight: cfg.weight, fontSize, lineHeight: 1.25, color: cfg.textColor, textAlign: 'left',
        }}>{full}</div>
      </div>
    )
  }

  // ---- Word-map styles (wordSpring): pop, karaoke, clean, bold_box, big_subtitle, highlighter ----
  const fontSize = Math.round((isHook ? width * 0.092 : width * 0.068) * cfg.sizeMul)
  const activeIdx = Math.min(words.length - 1, Math.floor(progress * words.length))
  const wrap: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0,
    top: isHook ? '38%' : undefined, bottom: isHook ? undefined : '15%',
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center',
    gap: `${fontSize * 0.12}px ${fontSize * 0.28}px`, padding: `0 ${width * 0.08}px`, textAlign: 'center',
  }
  return (
    <div style={wrap}>
      {words.map((w, i) => {
        const enter = spring({ frame: frame - i * 2, fps, config: { damping: 14, mass: 0.6, stiffness: 140 } })
        const translateY = interpolate(enter, [0, 1], [fontSize * 0.45, 0])
        const grow = interpolate(enter, [0, 1], [0.7, 1])
        const isActive = cfg.activeFx !== 'none' && i === activeIdx
        const pop = isActive && (cfg.activeFx === 'color' || cfg.activeFx === 'highlight') ? 1.08 : 1
        const ws: React.CSSProperties = {
          display: 'inline-block', fontFamily: cfg.font, fontWeight: cfg.weight, fontSize, lineHeight: 1.04,
          letterSpacing: isHook ? '-0.01em' : '0.005em', textTransform: cfg.uppercase ? 'uppercase' : 'none',
          color: cfg.textColor, opacity: enter,
          transform: `translateY(${translateY}px) scale(${grow * pop})`,
          WebkitTextStroke: cfg.stroke ? `${Math.max(1, fontSize * 0.012)}px rgba(0,0,0,0.85)` : undefined,
          textShadow: '0 4px 18px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.7)',
          willChange: 'transform, opacity',
        }
        // Highlighter: every word gets a swipe (so dark text reads); active word fuller + pop.
        if (cfg.activeFx === 'highlight') {
          ws.background = hexA(dec, isActive ? 1 : 0.82)
          ws.padding = `0 ${fontSize * 0.14}px`
          ws.borderRadius = `${fontSize * 0.22}px`
        }
        if (isActive && cfg.activeFx === 'color') ws.color = dec
        if (isActive && cfg.activeFx === 'box') {
          ws.background = dec
          ws.color = idealText(dec)
          ws.padding = `0 ${fontSize * 0.16}px`
          ws.borderRadius = `${fontSize * 0.1}px`
          ws.WebkitTextStroke = undefined
        }
        return <span key={i} style={ws}>{w}</span>
      })}
    </div>
  )
}
