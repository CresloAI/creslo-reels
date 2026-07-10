// Shape of a reel — matches what the Creslo backend produces.
// Subject-aware caption placement: the vertical band with the LEAST important
// content in the clip (backend vision pass at clip-match time). Captions anchor
// here so they never cover the clip's main subject. Absent -> legacy anchors.
export type CaptionZone = 'top' | 'middle' | 'bottom'
export type ReelScene = {
  on_screen?: string
  voiceover?: string
  clip_url?: string | null
  poster?: string | null
  clip_id?: number | string | null
  seconds?: number
  // Keyword-emphasis: indices into on_screen.split(/\s+/).filter(Boolean) - the word(s) to emphasise.
  emphasis?: number[]
  caption_zone?: CaptionZone
  // Kinetic text beat (slice 1) / branded CTA end-card (slice 3): no footage needed.
  // 'mockup' (slice 4): the scene's poster image inside a phone frame (their website/menu).
  beat_type?: 'clip' | 'text' | 'cta' | 'mockup'
  // Per-beat field-tone override (the storyboard's ↻ layout swap on text/CTA beats);
  // wins over reel.fieldTone for this beat only.
  field_tone?: 'light' | 'rich' | 'deep'
  // Per-beat field COLOUR override (the storyboard edit popup): the beat's stage
  // re-derives from this hex instead of the brand colour.
  field_color?: string | null
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
  // Optional display font for the emphasised (keyword) word; the rest use `font`.
  fontSecondary?: string
  textColor: string
  accent: string
  weight: number
  uppercase: boolean
  sizeMul: number
  placement: 'center' | 'lowerThird'
  reveal: 'wordSpring' | 'typewriter' | 'fade'
  // strike/underline (Studio v2 slice 2): animated accent sweep on the emphasised word.
  activeFx: 'none' | 'color' | 'box' | 'highlight' | 'strike' | 'underline'
  stroke: boolean
  band?: { fill: string; accentEdge: string }
}

export type ReelData = {
  hook?: { on_screen?: string; voiceover?: string; clip_url?: string | null; poster?: string | null; emphasis?: number[] } | null
  scenes?: ReelScene[]
  caption?: string
  hashtags?: string[]
  audio?: string | null
  // Look & feel
  brandColor?: string
  // Brand display name + logo for the CTA end-card (slice 3).
  brandName?: string
  brandLogo?: string | null
  // The brand's NAME-STYLE mark image (brands.wordmark_url). When present the CTA
  // end-card shows this exact mark; otherwise the name renders in the serif wordmark style.
  brandWordmark?: string | null
  // Field tone for text beats: 'light' cream editorial / 'rich' saturated mid /
  // 'deep' jewel. Set by mood presets or the planner's look choice; absent = classic
  // alternating rich/deep. The CTA end-card always uses 'deep'.
  fieldTone?: 'light' | 'rich' | 'deep'
  // Audio plumbing (slice 5): background music + optional narration, mixed at render.
  music?: { url?: string; volume?: number } | null
  voiceoverUrl?: string | null
  captionStyle?: CaptionStyle
  captionConfig?: Partial<Record<CaptionStyle, Partial<StyleConfig>>>
  hookSeconds?: number
  // v2 inert plumbing (passed through buildReelRenderProps; the render half consumes these
  // later. Absent -> current behaviour). Shapes are placeholders, refined when each is built.
  transition?: string
  header?: { text?: string; enabled?: boolean } | null
  grade?: string | null
  kenBurns?: { enabled?: boolean; intensity?: number } | null
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
  emphasis?: number[]
  zone?: CaptionZone
  beatType?: 'clip' | 'text' | 'cta' | 'mockup'
  poster?: string | null
  fieldTone?: 'light' | 'rich' | 'deep'
  fieldColor?: string | null
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
      emphasis: (hook && hook.emphasis) || [],
      zone: (hook && (hook as { caption_zone?: CaptionZone }).caption_zone) || (scenes[0] ? scenes[0].caption_zone : undefined),
    })
  }
  for (const s of scenes) {
    beats.push({
      text: s.on_screen || '',
      isHook: false,
      clipUrl: s.clip_url || null,
      seconds: Math.max(1.5, Math.min(10, Number(s.seconds) || 3)),
      emphasis: s.emphasis || [],
      zone: s.caption_zone,
      beatType: (s.beat_type === 'text' || s.beat_type === 'cta' || s.beat_type === 'mockup') ? s.beat_type : 'clip',
      poster: s.poster || null,
      fieldTone: (s.field_tone === 'light' || s.field_tone === 'rich' || s.field_tone === 'deep') ? s.field_tone : undefined,
      fieldColor: (typeof s.field_color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(s.field_color)) ? s.field_color : undefined,
    })
  }
  if (!beats.length) beats.push({ text: '', isHook: true, clipUrl: null, seconds: 3, emphasis: [] })
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
