import React from 'react'
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { TransitionSeries, linearTiming, type TransitionPresentation } from '@remotion/transitions'
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

  // ---- Reels v3 cut engine (2026-09-21, Daniel: premium cuts, "no AI slop") ----
  // The stock fade/slide/wipe set is gone. Cuts are UGC-native: whip pans with motion
  // blur, punch-in zoom snaps, and a drifting luma dissolve. Each CUT picks its own
  // presentation from the mood's family (ordered so consecutive cuts never repeat -
  // variety guard), seeded from the reel's copy so preview and render always agree,
  // and the landing cut into the final beat is always a punch. Legacy mood-preset
  // keys map onto the new families so existing reels upgrade automatically.
  // MUST stay identical to the mirror (creslo-frontend/src/remotion/ReelVideo.tsx).
  type CutPresentation = TransitionPresentation<Record<string, unknown>>
  const outCubic = (p: number) => 1 - Math.pow(1 - p, 3)
  const whipPan = (dir: 1 | -1): CutPresentation => ({
    component: ({ children, presentationDirection, presentationProgress }) => {
      const p = outCubic(presentationProgress)
      const blur = Math.sin(presentationProgress * Math.PI) * 22
      const x = presentationDirection === 'entering' ? (1 - p) * 100 * dir : -p * 100 * dir
      return <AbsoluteFill style={{ transform: `translateX(${x}%)`, filter: `blur(${blur}px)` }}>{children}</AbsoluteFill>
    },
    props: {},
  })
  const punchIn = (strength = 0.14): CutPresentation => ({
    component: ({ children, presentationDirection, presentationProgress }) => {
      const p = outCubic(presentationProgress)
      if (presentationDirection === 'exiting') {
        return <AbsoluteFill style={{ opacity: 1 - p, transform: `scale(${1 + 0.05 * p})` }}>{children}</AbsoluteFill>
      }
      return <AbsoluteFill style={{ transform: `scale(${1 + strength * (1 - p)})`, filter: `brightness(${1 + 0.16 * (1 - p)})` }}>{children}</AbsoluteFill>
    },
    props: {},
  })
  const lumaDrift = (): CutPresentation => ({
    component: ({ children, presentationDirection, presentationProgress }) => {
      const p = presentationProgress
      if (presentationDirection === 'exiting') {
        return <AbsoluteFill style={{ opacity: 1 - p, transform: `scale(${1 + 0.03 * p})` }}>{children}</AbsoluteFill>
      }
      return <AbsoluteFill style={{ opacity: p, transform: `scale(${1.035 - 0.035 * p})` }}>{children}</AbsoluteFill>
    },
    props: {},
  })
  // Families are ordered so the +3 step below never lands the same cut twice running.
  const KINETIC: CutPresentation[] = [whipPan(1), punchIn(), whipPan(-1), lumaDrift()]
  const SOFT: CutPresentation[] = [lumaDrift(), punchIn(0.08), lumaDrift(), punchIn(0.06)]
  const CUT_FAMILIES: Record<string, CutPresentation[]> = {
    kinetic: KINETIC,
    soft: SOFT,
    // Legacy keys -> upgraded equivalents (reels saved with old presets get new cuts).
    'fade': SOFT,
    'slide-from-right': KINETIC,
    'slide-from-bottom': KINETIC,
    'wipe-from-right': KINETIC,
  }
  const family = (reel.transition && CUT_FAMILIES[reel.transition]) || (seed % 2 === 0 ? KINETIC : SOFT)

  // Build an alternating Sequence / Transition list for a smooth cut between beats.
  const children: React.ReactNode[] = []
  beats.forEach((b, i) => {
    const frames = Math.max(1, Math.round(b.seconds * fps))
    if (i > 0) {
      const cut = i === beats.length - 1 ? punchIn(0.12) : family[(seed + i * 3) % family.length]
      children.push(
        <TransitionSeries.Transition
          key={`t${i}`}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
          presentation={cut}
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
          fieldTone={b.fieldTone || reel.fieldTone}
          fieldColor={b.fieldColor}
          fieldStyle={b.fieldStyle}
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
