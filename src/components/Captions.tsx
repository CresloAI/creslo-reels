import React from 'react'
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat'
import { loadFont as loadAnton } from '@remotion/google-fonts/Anton'
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono'
import { loadFont as loadFraunces } from '@remotion/google-fonts/Fraunces'
import { loadFont as loadInter } from '@remotion/google-fonts/Inter'
import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins'
import type { CaptionStyle } from '../lib/types'

// pop/karaoke/clean keep Montserrat exactly as before. New styles each load ONE font,
// limited to latin + only the weights used, to keep the bundle/render lean.
const montserrat = loadMontserrat().fontFamily
const anton = loadAnton('normal', { weights: ['400'], subsets: ['latin'] }).fontFamily
const jetbrains = loadJetBrainsMono('normal', { weights: ['400', '700'], subsets: ['latin'] }).fontFamily
const fraunces = loadFraunces('normal', { weights: ['600'], subsets: ['latin'] }).fontFamily
const inter = loadInter('normal', { weights: ['600', '800'], subsets: ['latin'] }).fontFamily
const poppins = loadPoppins('normal', { weights: ['600', '700'], subsets: ['latin'] }).fontFamily

const STYLE_FONT: Record<CaptionStyle, string> = {
  pop: montserrat, karaoke: montserrat, clean: montserrat,
  bold_box: anton, typewriter: jetbrains, lower_third: fraunces,
  big_subtitle: inter, highlighter: poppins,
}

type WordActive = 'none' | 'color' | 'box' | 'highlighter'
type WordCfg = { uppercase: boolean; weight: number; sizeMul?: number; active: WordActive }
// Config for the word-map styles. typewriter/lower_third are handled by dedicated
// layouts below but kept here so the Record covers every CaptionStyle key.
const WORD_CFG: Record<CaptionStyle, WordCfg> = {
  pop: { uppercase: true, weight: 800, active: 'color' },
  karaoke: { uppercase: true, weight: 800, active: 'color' },
  clean: { uppercase: true, weight: 800, active: 'none' },
  bold_box: { uppercase: true, weight: 400, active: 'box' },
  big_subtitle: { uppercase: false, weight: 600, sizeMul: 1.18, active: 'none' },
  highlighter: { uppercase: false, weight: 700, active: 'highlighter' },
  typewriter: { uppercase: false, weight: 700, active: 'none' },
  lower_third: { uppercase: false, weight: 600, active: 'none' },
}

// White or near-black text depending on the accent's luminance (Bold Box block).
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
}> = ({ text, accent, isHook, style = 'pop', durationInFrames }) => {
  const frame = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const full = String(text || '').trim()
  if (!full) return null
  const words = full.split(/\s+/).filter(Boolean)
  const font = STYLE_FONT[style] || montserrat

  // ---- Typewriter: char-by-char reveal as spoken + blinking cursor (mono) ----
  if (style === 'typewriter') {
    const fontSize = isHook ? Math.round(width * 0.078) : Math.round(width * 0.058)
    const revealed = Math.min(full.length, Math.max(0, Math.round((frame / Math.max(1, durationInFrames)) * full.length)))
    const shown = full.slice(0, revealed)
    const cursorOn = Math.floor(frame / Math.max(1, Math.round(fps / 2))) % 2 === 0
    return (
      <div style={{
        position: 'absolute', left: 0, right: 0,
        top: isHook ? '40%' : undefined, bottom: isHook ? undefined : '16%',
        padding: `0 ${width * 0.08}px`, textAlign: 'left',
        fontFamily: font, fontWeight: 700, fontSize, lineHeight: 1.2, color: '#ffffff',
        WebkitTextStroke: `${Math.max(1, fontSize * 0.01)}px rgba(0,0,0,0.85)`,
        textShadow: '0 4px 18px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.7)',
      }}>
        {shown}<span style={{ opacity: cursorOn ? 1 : 0 }}>▍</span>
      </div>
    )
  }

  // ---- Lower Third: caption pinned to a lower band, editorial serif ----
  if (style === 'lower_third') {
    const fontSize = isHook ? Math.round(width * 0.062) : Math.round(width * 0.05)
    const appear = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' })
    return (
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: '14%',
        display: 'flex', justifyContent: 'center', padding: `0 ${width * 0.06}px`,
        opacity: appear, transform: `translateY(${interpolate(appear, [0, 1], [16, 0])}px)`,
      }}>
        <div style={{
          maxWidth: '88%', background: 'rgba(0,0,0,0.62)',
          borderLeft: `${Math.round(width * 0.012)}px solid ${accent}`, borderRadius: 8,
          padding: `${fontSize * 0.5}px ${fontSize * 0.7}px`,
          fontFamily: font, fontWeight: 600, fontSize, lineHeight: 1.25, color: '#ffffff', textAlign: 'left',
        }}>{full}</div>
      </div>
    )
  }

  // ---- Word-map styles: pop, karaoke, clean, bold_box, big_subtitle, highlighter ----
  const cfg = WORD_CFG[style] || WORD_CFG.pop
  const fontSize = Math.round((isHook ? width * 0.092 : width * 0.068) * (cfg.sizeMul || 1))
  const activeIdx = Math.min(words.length - 1, Math.floor((frame / Math.max(1, durationInFrames)) * words.length))

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
        const scale = interpolate(enter, [0, 1], [0.7, 1])
        const isActive = cfg.active !== 'none' && i === activeIdx
        const pop = isActive && cfg.active === 'color' ? 1.08 : 1

        const wordStyle: React.CSSProperties = {
          display: 'inline-block', fontFamily: font, fontWeight: cfg.weight, fontSize, lineHeight: 1.04,
          letterSpacing: isHook ? '-0.01em' : '0.005em', textTransform: cfg.uppercase ? 'uppercase' : 'none',
          color: '#ffffff', opacity: enter,
          transform: `translateY(${translateY}px) scale(${scale * pop})`,
          WebkitTextStroke: `${Math.max(1, fontSize * 0.012)}px rgba(0,0,0,0.85)`,
          textShadow: '0 4px 18px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.7)',
          willChange: 'transform, opacity',
        }
        if (isActive && cfg.active === 'color') wordStyle.color = accent
        if (isActive && cfg.active === 'box') {
          wordStyle.background = accent
          wordStyle.color = idealText(accent)
          wordStyle.padding = `0 ${fontSize * 0.16}px`
          wordStyle.borderRadius = `${fontSize * 0.1}px`
          wordStyle.WebkitTextStroke = '0'
        }
        if (isActive && cfg.active === 'highlighter') {
          wordStyle.background = hexA(accent, 0.45)
          wordStyle.padding = `0 ${fontSize * 0.14}px`
          wordStyle.borderRadius = `${fontSize * 0.22}px`
        }
        return <span key={i} style={wordStyle}>{w}</span>
      })}
    </div>
  )
}
