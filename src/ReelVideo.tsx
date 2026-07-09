import React from 'react'
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { Beat } from './components/Beat'
import { buildBeats, TRANSITION_FRAMES, CAPTION_STYLE_KEYS, type ReelData, type CaptionStyle } from './lib/types'

// The hash-select fallback (for an absent/invalid captionStyle) is limited to the
// original 3 styles, so the 5 newer styles only ever render when explicitly picked.
const FALLBACK_STYLES = ['pop', 'karaoke', 'clean'] as const

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
  const captionStyle = CAPTION_STYLE_KEYS.includes(reel.captionStyle as CaptionStyle)
    ? (reel.captionStyle as CaptionStyle)
    : FALLBACK_STYLES[seed % FALLBACK_STYLES.length]

  const presentations = [
    fade(),
    slide({ direction: 'from-right' }),
    slide({ direction: 'from-bottom' }),
    wipe({ direction: 'from-right' }),
  ]
  // Per-preset transitions: reel.transition (set by the mood preset) picks the presentation;
  // absent or unknown key -> the per-reel hash-select below. Keys are transition-type names.
  const TRANSITION_MAP = {
    'fade': fade(),
    'slide-from-right': slide({ direction: 'from-right' }),
    'slide-from-bottom': slide({ direction: 'from-bottom' }),
    'wipe-from-right': wipe({ direction: 'from-right' }),
  }
  const mapped = reel.transition ? TRANSITION_MAP[reel.transition] : undefined
  const presentation = mapped || presentations[seed % presentations.length]

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
          captionConfig={reel.captionConfig}
          emphasis={b.emphasis}
          zone={b.zone}
          beatType={b.beatType}
          poster={b.poster}
          brandName={reel.brandName}
          brandLogo={reel.brandLogo}
          brandWordmark={reel.brandWordmark}
          kenBurns={reel.kenBurns}
          grade={reel.grade}
        />
      </TransitionSeries.Sequence>
    )
  })

  const progress = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <TransitionSeries>{children}</TransitionSeries>
      {/* Audio (Studio v2 slice 5): background music bed + optional narration track,
          mixed into the render. Music ducks to 25% by default so voiceover reads. */}
      {reel.music && reel.music.url ? <Audio src={reel.music.url} volume={typeof reel.music.volume === 'number' ? reel.music.volume : 0.25} /> : null}
      {reel.voiceoverUrl ? <Audio src={reel.voiceoverUrl} /> : null}

      {/* trendy progress bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, background: 'rgba(255,255,255,0.18)' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: accent }} />
      </div>
    </AbsoluteFill>
  )
}
