import React from 'react'
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat'
import { loadFont as loadAnton } from '@remotion/google-fonts/Anton'
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono'
import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces'
import { loadFont as loadInter } from '@remotion/google-fonts/Inter'
import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins'
import { loadFont as loadDMSerifDisplay } from '@remotion/google-fonts/DMSerifDisplay'
import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans'
import { loadFont as loadBebasNeue } from '@remotion/google-fonts/BebasNeue'
import { loadFont as loadArchivoBlack } from '@remotion/google-fonts/ArchivoBlack'
import { loadFont as loadArchivo } from '@remotion/google-fonts/Archivo'
import { loadFont as loadSpaceGrotesk } from '@remotion/google-fonts/SpaceGrotesk'
import { loadFont as loadPlayfairDisplay } from '@remotion/google-fonts/PlayfairDisplay'
import { loadFont as loadSourceSans3 } from '@remotion/google-fonts/SourceSans3'
import { loadFont as loadSyne } from '@remotion/google-fonts/Syne'
import { TRANSITION_FRAMES, type CaptionStyle, type StyleConfig } from '../lib/types'

// Each style loads ONE font, limited to latin + only the weights used.
const montserrat = loadMontserrat().fontFamily
const anton = loadAnton('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily
const jetbrains = loadJetBrainsMono('normal', { weights: ['400', '700'], subsets: ['latin'] }).fontFamily
const fraunces = loadFraunces('normal', { weights: ['600'], subsets: ['latin'] }).fontFamily
const inter = loadInter('normal', { weights: ['400', '600', '800'], subsets: ['latin'] }).fontFamily
const poppins = loadPoppins('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily

// v2 slice 2 - extra families for the mood-preset font pairings (body/display) + the
// slice-4 manual library. Loaded for their side-effect (registers the @font-face) and
// referenced by family-name string via captionConfig; weight-trimmed to what is used.
// MUST stay byte-identical to the frontend mirror src/remotion/ReelVideo.tsx.
loadDMSans('normal', { weights: ['600'], subsets: ['latin'] })
loadDMSerifDisplay('normal', { weights: ['400'], subsets: ['latin'] })
loadBebasNeue('normal', { weights: ['400'], subsets: ['latin'] })
loadArchivoBlack('normal', { weights: ['400'], subsets: ['latin'] })
loadArchivo('normal', { weights: ['400', '700'], subsets: ['latin'] })
loadSpaceGrotesk('normal', { weights: ['400', '700'], subsets: ['latin'] })
loadPlayfairDisplay('normal', { weights: ['400', '700'], subsets: ['latin'] })
loadSourceSans3('normal', { weights: ['400', '700'], subsets: ['latin'] })
loadSyne('normal', { weights: ['400', '700'], subsets: ['latin'] })

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

// Filler words the keyword-emphasis fallback skips so the time-sweep never lands on them.
// MUST stay byte-identical to the frontend mirror src/remotion/ReelVideo.tsx.
const CAPTION_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'from', 'by', 'with', 'as',
  'is', 'are', 'was', 'were', 'be', 'been', 'am', 'it', 'its', 'this', 'that', 'these', 'those',
  'i', 'you', 'your', 'we', 'our', 'my', 'me', 'he', 'she', 'they', 'them', 'his', 'her', 'their',
  'so', 'if', 'then', 'than', 'too', 'very', 'just', 'up', 'out', 'off', 'over', 'into', 'about',
])
const normWord = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '')

export const Captions: React.FC<{
  text: string
  accent: string
  isHook: boolean
  style?: CaptionStyle
  durationInFrames: number
  captionConfig?: Partial<Record<CaptionStyle, Partial<StyleConfig>>>
  emphasis?: number[]
}> = ({ text, accent, isHook, style = 'pop', durationInFrames, captionConfig, emphasis }) => {
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
    const fontSize = Math.round((isHook ? width * 0.062 : width * 0.05) * cfg.sizeMul)
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
  // Which word(s) to emphasise. Prefer the generation's keyword indices (bound-checked, so a
  // stale index from a post-generation on_screen edit is dropped); else keep the time-sweep but
  // over CONTENT words only, so it never lands on filler ("of/the/a/is").
  const validEmph = (emphasis || []).filter((n) => Number.isInteger(n) && n >= 0 && n < words.length)
  let emph: Set<number>
  if (validEmph.length) {
    emph = new Set(validEmph)
  } else {
    const content = words.map((_, i) => i).filter((i) => !CAPTION_STOPWORDS.has(normWord(words[i])))
    const pool = content.length ? content : words.map((_, i) => i)
    emph = new Set([pool[Math.min(pool.length - 1, Math.floor(progress * pool.length))]])
  }
  const wrap: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0,
    top: isHook ? '38%' : undefined, bottom: isHook ? undefined : '15%',
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center',
    gap: `${fontSize * 0.12}px ${fontSize * 0.28}px`, padding: `0 ${width * 0.08}px`, textAlign: 'center',
  }
  // ---- Centre fade: the whole caption fades in as a block (no per-word spring). Used by
  // Editorial Soft (reveal 'fade' on the centre path); keeps the body/display font pairing. ----
  if (cfg.reveal === 'fade') {
    const appear = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' })
    return (
      <div style={{ ...wrap, opacity: appear }}>
        {words.map((w, i) => (
          <span key={i} style={{
            display: 'inline-block', fontFamily: (cfg.fontSecondary && emph.has(i)) ? cfg.fontSecondary : cfg.font,
            fontWeight: cfg.weight, fontSize, lineHeight: 1.04,
            letterSpacing: isHook ? '-0.01em' : '0.005em', textTransform: cfg.uppercase ? 'uppercase' : 'none',
            color: cfg.textColor,
            WebkitTextStroke: cfg.stroke ? `${Math.max(1, fontSize * 0.012)}px rgba(0,0,0,0.85)` : undefined,
            textShadow: '0 4px 18px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.7)',
          }}>{w}</span>
        ))}
      </div>
    )
  }
  return (
    <div style={wrap}>
      {words.map((w, i) => {
        const enter = spring({ frame: frame - i * 2, fps, config: { damping: 14, mass: 0.6, stiffness: 140 } })
        const translateY = interpolate(enter, [0, 1], [fontSize * 0.45, 0])
        const grow = interpolate(enter, [0, 1], [0.7, 1])
        const isActive = cfg.activeFx !== 'none' && emph.has(i)
        const pop = isActive && (cfg.activeFx === 'color' || cfg.activeFx === 'highlight') ? 1.08 : 1
        // Font pairing: the emphasised (keyword) word uses the display font; the rest use the body font.
        const ws: React.CSSProperties = {
          display: 'inline-block', fontFamily: (cfg.fontSecondary && emph.has(i)) ? cfg.fontSecondary : cfg.font, fontWeight: cfg.weight, fontSize, lineHeight: 1.04,
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
