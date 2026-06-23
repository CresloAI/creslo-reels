import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { Beat } from './components/Beat'
import { buildBeats, TRANSITION_FRAMES, type ReelData, type CaptionStyle } from './lib/types'

// Caption looks the Captions component understands. Picked per reel below.
const CAPTION_STYLES: CaptionStyle[] = ['pop', 'karaoke', 'clean']

export const ReelVideo: React.FC<ReelData> = (reel) => {
  const { fps, durationInFrames } = useVideoConfig()
  const frame = useCurrentFrame()
  const accent = reel.brandColor || '#E8743B'
  const beats = buildBeats(reel)

  // Pick a caption look AND a transition look per reel, from the reel's own copy:
  // stable for a given reel, varied across different reels.
  const seedStr = String(reel.caption || (reel.hook && reel.hook.on_screen) || '')
  let seed = 0
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0
  // Honour the user's picked caption style when present and valid; otherwise fall back
  // to the per-reel hash-select so un-picked reels still vary.
  const captionStyle = CAPTION_STYLES.includes(reel.captionStyle as CaptionStyle)
    ? (reel.captionStyle as CaptionStyle)
    : CAPTION_STYLES[seed % CAPTION_STYLES.length]

  const presentations = [
    fade(),
    slide({ direction: 'from-right' }),
    slide({ direction: 'from-bottom' }),
    wipe({ direction: 'from-right' }),
  ]
  const presentation = presentations[seed % presentations.length]

  // Build an alternating Sequence / Transition list for a smooth cut between beats.
  const children: React.ReactNode[] = []
  beats.forEach((b, i) => {
    const frames = Math.max(1, Math.round(b.seconds * fps))
    if (i > 0) {
      children.push(
        <TransitionSeries.Transition
          key={`t${i}`}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
          presentation={presentation}
        />
      )
    }
    children.push(
      <TransitionSeries.Sequence key={`s${i}`} durationInFrames={frames}>
        <Beat
          text={b.text}
          isHook={b.isHook}
          clipUrl={b.clipUrl}
          accent={accent}
          index={i}
          durationInFrames={frames}
          captionStyle={captionStyle}
        />
      </TransitionSeries.Sequence>
    )
  })

  const progress = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <TransitionSeries>{children}</TransitionSeries>
      {/* trendy progress bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, background: 'rgba(255,255,255,0.18)' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: accent }} />
      </div>
    </AbsoluteFill>
  )
}
