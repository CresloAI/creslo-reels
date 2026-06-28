import React from 'react'
import { AbsoluteFill, OffthreadVideo, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
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
  kenBurns?: { enabled?: boolean; intensity?: number } | null
  grade?: string | null
}> = ({ text, isHook, clipUrl, accent, index, durationInFrames, captionStyle, captionConfig, emphasis, kenBurns, grade }) => {
  const frame = useCurrentFrame()
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

      <Captions text={text} accent={accent} isHook={isHook} style={captionStyle} durationInFrames={durationInFrames} captionConfig={captionConfig} emphasis={emphasis} />
    </AbsoluteFill>
  )
}
