import React from 'react'
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion'
import { TransitionSeries, linearTiming, type TransitionPresentation } from '@remotion/transitions'
import { Beat } from './components/Beat'
import { buildBeats, TRANSITION_FRAMES, CAPTION_STYLE_KEYS, type ReelData, type CaptionStyle } from './lib/types'

// The hash-select fallback (for an absent/invalid captionStyle) is limited to the
// original 3 styles, so the 5 newer styles only ever render when explicitly picked.
const FALLBACK_STYLES = ['pop', 'karaoke', 'clean'] as const

// ---- CUT PRESENTATIONS (Reels v3 cut engine) ----
// Module scope on purpose: a presentation's component must keep the same identity from frame to
// frame. Declared inside ReelVideo, each frame produced a brand-new component type and React
// tore down and rebuilt everything inside it - harmless on Lambda (every frame is rendered on its
// own) but in the browser preview the clip videos were destroyed and reloaded ~10 times a second,
// showing black and stalling playback. Found 2026-09-21. Output is unchanged: same maths, same
// props, only where the functions live. MUST stay identical to the mirror.
type CutPresentation = TransitionPresentation<Record<string, unknown>>
type CutProps<P> = { children: React.ReactNode; presentationDirection: 'entering' | 'exiting'; presentationProgress: number; passedProps: P }
const outCubic = (p: number) => 1 - Math.pow(1 - p, 3)
const WhipPanCut: React.FC<CutProps<{ dir: 1 | -1 }>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const dir = passedProps.dir
  const p = outCubic(presentationProgress)
  const blur = Math.sin(presentationProgress * Math.PI) * 22
  const x = presentationDirection === 'entering' ? (1 - p) * 100 * dir : -p * 100 * dir
  return <AbsoluteFill style={{ transform: `translateX(${x}%)`, filter: `blur(${blur}px)` }}>{children}</AbsoluteFill>
}
const PunchInCut: React.FC<CutProps<{ strength: number }>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const strength = passedProps.strength
  const p = outCubic(presentationProgress)
  if (presentationDirection === 'exiting') {
    return <AbsoluteFill style={{ opacity: 1 - p, transform: `scale(${1 + 0.05 * p})` }}>{children}</AbsoluteFill>
  }
  return <AbsoluteFill style={{ transform: `scale(${1 + strength * (1 - p)})`, filter: `brightness(${1 + 0.16 * (1 - p)})` }}>{children}</AbsoluteFill>
}
const LumaDriftCut: React.FC<CutProps<Record<string, never>>> = ({ children, presentationDirection, presentationProgress }) => {
  const p = presentationProgress
  if (presentationDirection === 'exiting') {
    return <AbsoluteFill style={{ opacity: 1 - p, transform: `scale(${1 + 0.03 * p})` }}>{children}</AbsoluteFill>
  }
  return <AbsoluteFill style={{ opacity: p, transform: `scale(${1.035 - 0.035 * p})` }}>{children}</AbsoluteFill>
}

export const ReelVideo: React.FC<ReelData> = (reel) => {
  const { fps } = useVideoConfig()
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
  // The three cut presentations are defined ONCE at module scope (see CUT PRESENTATIONS above
  // ReelVideo). Building them in here made a new component type on every frame, which made
  // React remount the whole scene - clip <video> included - many times a second in the
  // browser preview. whipPan / punchIn / lumaDrift below only choose the props.
  const whipPan = (dir: 1 | -1): CutPresentation => ({ component: WhipPanCut as any, props: { dir } })
  const punchIn = (strength = 0.14): CutPresentation => ({ component: PunchInCut as any, props: { strength } })
  const lumaDrift = (): CutPresentation => ({ component: LumaDriftCut as any, props: {} })
  // Families are ordered so the +3 step below never lands the same cut twice running.
  // Each cut carries its KIND so the SFX layer knows what sound rides under it.
  type Cut = { kind: 'whip' | 'punch' | 'drift'; p: CutPresentation }
  const KINETIC: Cut[] = [{ kind: 'whip', p: whipPan(1) }, { kind: 'punch', p: punchIn() }, { kind: 'whip', p: whipPan(-1) }, { kind: 'drift', p: lumaDrift() }]
  const SOFT: Cut[] = [{ kind: 'drift', p: lumaDrift() }, { kind: 'punch', p: punchIn(0.08) }, { kind: 'drift', p: lumaDrift() }, { kind: 'punch', p: punchIn(0.06) }]
  const CUT_FAMILIES: Record<string, Cut[]> = {
    kinetic: KINETIC,
    soft: SOFT,
    // Legacy keys -> upgraded equivalents (reels saved with old presets get new cuts).
    'fade': SOFT,
    'slide-from-right': KINETIC,
    'slide-from-bottom': KINETIC,
    'wipe-from-right': KINETIC,
  }
  const family = (reel.transition && CUT_FAMILIES[reel.transition]) || (seed % 2 === 0 ? KINETIC : SOFT)

  // Cut bookkeeping (phase 4 SFX): transition i starts where sequence i begins,
  // i.e. cumulative frames minus the overlaps. Selected ONCE here so the visual
  // cut and its sound can never disagree.
  const seqFrames = beats.map(b => Math.max(1, Math.round(b.seconds * fps)))
  const cuts: { at: number; cut: Cut }[] = []
  const beatStarts: number[] = []
  {
    let s = 0
    beats.forEach((b, i) => {
      if (i > 0) {
        s -= TRANSITION_FRAMES
        const cut: Cut = i === beats.length - 1 ? { kind: 'punch', p: punchIn(0.12) } : family[(seed + i * 3) % family.length]
        cuts.push({ at: s, cut })
      }
      beatStarts.push(s)
      s += seqFrames[i]
    })
  }

  // Speech-synced captions (phase 9): the voiceover plays from frame 0, so a beat's
  // spoken span (seconds on the track) converts to frames LOCAL to that beat by
  // subtracting the beat's start. Only offered when the narration is actually in the
  // mix — without voiceoverUrl the timings describe audio nobody hears.
  const vt = (reel.voiceoverUrl && reel.voiceoverTiming && Array.isArray(reel.voiceoverTiming.beats)) ? reel.voiceoverTiming.beats : null
  const speechFor = (i: number): { start: number; end: number } | undefined => {
    const b = vt && vt[i]
    if (!b || !Number.isFinite(b.s) || !Number.isFinite(b.e) || b.e <= b.s) return undefined
    return { start: Math.round(b.s * fps) - beatStarts[i], end: Math.round(b.e * fps) - beatStarts[i] }
  }

  // Build an alternating Sequence / Transition list for a smooth cut between beats.
  const children: React.ReactNode[] = []
  beats.forEach((b, i) => {
    const frames = seqFrames[i]
    if (i > 0) {
      children.push(
        <TransitionSeries.Transition
          key={`t${i}`}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
          presentation={cuts[i - 1].cut.p}
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
          speech={speechFor(i)}
        />
      </TransitionSeries.Sequence>
    )
  })


  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <TransitionSeries>{children}</TransitionSeries>
      {/* SFX on cuts (Reels v3 phase 4): whoosh under whips, a soft hit under punches,
          a riser into the final beat; dissolves stay silent. Fail-open by design —
          without reel.sfxBase (env-gated server-side) no sound is referenced, so a
          render can never 404 on an asset that hasn't been generated yet.
          MUST stay identical to the mirror. */}
      {reel.sfxBase ? cuts.map((c, n) => {
        const final = n === cuts.length - 1
        const file = final ? 'sfx-riser.mp3' : c.cut.kind === 'whip' ? 'sfx-whoosh.mp3' : c.cut.kind === 'punch' ? 'sfx-punch.mp3' : null
        if (!file) return null
        const from = Math.max(0, final ? c.at - Math.round(fps * 0.8) : c.at - 2)
        return (
          <Sequence key={`sfx${n}`} from={from} durationInFrames={Math.round(fps * (final ? 2.2 : 1.5))}>
            <Audio src={`${reel.sfxBase}/${file}`} volume={final ? 0.4 : 0.32} />
          </Sequence>
        )
      }) : null}
      {/* Audio (Studio v2 slice 5): background music bed + optional narration track,
          mixed into the render. Music ducks to 25% by default so voiceover reads. */}
      {reel.music && reel.music.url ? <Audio src={reel.music.url} volume={typeof reel.music.volume === 'number' ? reel.music.volume : 0.25} /> : null}
      {reel.voiceoverUrl ? <Audio src={reel.voiceoverUrl} /> : null}

      {/* The burnt-in progress bar came out here on 2026-09-23 (Daniel). It was drawn INTO the
          video, so it followed the reel onto Instagram and TikTok, where no other reel has one -
          and those platforms draw their own. The live preview still has its scrub line, which is
          ours and stays on the page only. MUST stay identical to the app's copy. */}
    </AbsoluteFill>
  )
}
