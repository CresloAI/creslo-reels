// Shape of a reel — matches what the Creslo backend produces.
export type ReelScene = {
  on_screen?: string
  voiceover?: string
  clip_url?: string | null
  poster?: string | null
  clip_id?: number | string | null
  seconds?: number
}

// Single source of truth for caption-style keys. The union AND the render-side
// validation list (ReelVideo.tsx) both derive from this, so adding a style is one edit.
export const CAPTION_STYLE_KEYS = ['pop', 'karaoke', 'clean', 'bold_box', 'typewriter', 'lower_third', 'big_subtitle', 'highlighter'] as const
export type CaptionStyle = typeof CAPTION_STYLE_KEYS[number]

// Per-style visual config — the data the Captions render reads for every visual
// decision. accent is a literal hex OR the sentinel 'brand' (= reel.brandColor).
// A future inputProps.captionConfig can override any field per style (B7) with no redeploy.
export type StyleConfig = {
  font: string
  textColor: string
  accent: string
  weight: number
  uppercase: boolean
  sizeMul: number
  placement: 'center' | 'lowerThird'
  reveal: 'wordSpring' | 'typewriter' | 'fade'
  activeFx: 'none' | 'color' | 'box' | 'highlight'
  stroke: boolean
  band?: { fill: string; accentEdge: string }
}

export type ReelData = {
  hook?: { on_screen?: string; voiceover?: string; clip_url?: string | null; poster?: string | null } | null
  scenes?: ReelScene[]
  caption?: string
  hashtags?: string[]
  audio?: string | null
  // Look & feel
  brandColor?: string
  captionStyle?: CaptionStyle
  captionConfig?: Partial<Record<CaptionStyle, Partial<StyleConfig>>>
  hookSeconds?: number
}

export const FPS = 30
export const WIDTH = 1080
export const HEIGHT = 1920

// Frames each cross-scene transition overlaps. Shared between the composition
// and calculateMetadata so the final runtime always matches the timeline.
export const TRANSITION_FRAMES = 8

// One place that decides beat order + durations, used by both the
// composition and calculateMetadata so the timeline always matches.
export type Beat = {
  text: string
  isHook: boolean
  clipUrl?: string | null
  seconds: number
}

export function buildBeats(reel: ReelData): Beat[] {
  const scenes = Array.isArray(reel.scenes) ? reel.scenes : []
  const hook = reel.hook || null
  const hookText = (hook && hook.on_screen) ? hook.on_screen : ''
  const beats: Beat[] = []
  if (hookText) {
    beats.push({
      text: hookText,
      isHook: true,
      // The hook uses its OWN clip when the backend supplies one, so it never
      // repeats beat 1's footage. Falls back to scene 1 only if none was set.
      clipUrl: (hook && hook.clip_url) ? hook.clip_url : (scenes[0] ? scenes[0].clip_url : null),
      seconds: Math.max(1.5, Math.min(5, Number(reel.hookSeconds) || 2.5)),
    })
  }
  for (const s of scenes) {
    beats.push({
      text: s.on_screen || '',
      isHook: false,
      clipUrl: s.clip_url || null,
      seconds: Math.max(1.5, Math.min(10, Number(s.seconds) || 3)),
    })
  }
  if (!beats.length) beats.push({ text: '', isHook: true, clipUrl: null, seconds: 3 })
  return beats
}

export function totalDurationInFrames(reel: ReelData): number {
  const beats = buildBeats(reel)
  // Sum the per-beat frames the way the composition does, then subtract the
  // overlap each transition steals so duration matches the rendered timeline.
  const seqFrames = beats.reduce((sum, b) => sum + Math.max(1, Math.round(b.seconds * FPS)), 0)
  const transitions = Math.max(0, beats.length - 1) * TRANSITION_FRAMES
  return Math.max(FPS, seqFrames - transitions)
}
