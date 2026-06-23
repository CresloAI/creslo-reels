import React from 'react'
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { loadFont } from '@remotion/google-fonts/Montserrat'
import type { CaptionStyle } from '../lib/types'

const { fontFamily } = loadFont()

export const Captions: React.FC<{
  text: string
  accent: string
  isHook: boolean
  style?: CaptionStyle
  durationInFrames: number
}> = ({ text, accent, isHook, style = 'pop', durationInFrames }) => {
  const frame = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return null

  const fontSize = isHook ? Math.round(width * 0.092) : Math.round(width * 0.068)
  const activeIdx = Math.min(words.length - 1, Math.floor((frame / Math.max(1, durationInFrames)) * words.length))

  const baseWrap: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: isHook ? '38%' : undefined,
    bottom: isHook ? undefined : '15%',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    gap: `${fontSize * 0.12}px ${fontSize * 0.28}px`,
    padding: `0 ${width * 0.08}px`,
    textAlign: 'center',
  }

  return (
    <div style={baseWrap}>
      {words.map((w, i) => {
        // staggered spring entrance
        const delay = i * 2
        const enter = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6, stiffness: 140 } })
        const translateY = interpolate(enter, [0, 1], [fontSize * 0.45, 0])
        const scale = interpolate(enter, [0, 1], [0.7, 1])
        const isActive = style !== 'clean' && i === activeIdx
        const activePop = isActive ? 1.08 : 1

        const wordStyle: React.CSSProperties = {
          display: 'inline-block',
          fontFamily,
          fontWeight: 800,
          fontSize,
          lineHeight: 1.04,
          letterSpacing: isHook ? '-0.01em' : '0.005em',
          textTransform: 'uppercase',
          color: isActive ? accent : '#ffffff',
          opacity: enter,
          transform: `translateY(${translateY}px) scale(${scale * activePop})`,
          WebkitTextStroke: `${Math.max(1, fontSize * 0.012)}px rgba(0,0,0,0.85)`,
          textShadow: '0 4px 18px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.7)',
          willChange: 'transform, opacity',
        }
        return <span key={i} style={wordStyle}>{w}</span>
      })}
    </div>
  )
}
