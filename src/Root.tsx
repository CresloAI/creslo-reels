import React from 'react'
import { Composition } from 'remotion'
import { ReelVideo } from './ReelVideo'
import { PromoVideo, PROMO_FPS, PROMO_W, PROMO_H, PROMO_FRAMES } from './PromoVideo'
import { FPS, WIDTH, HEIGHT, totalDurationInFrames, type ReelData } from './lib/types'
import sample from './sample-reel.json'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReelVideo"
        component={ReelVideo as React.FC<Record<string, unknown>>}
        durationInFrames={totalDurationInFrames(sample as ReelData)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={sample as unknown as Record<string, unknown>}
        calculateMetadata={({ props }) => ({
          durationInFrames: totalDurationInFrames(props as ReelData),
        })}
      />
      {/* Brand promo (local-first) - see PromoVideo.tsx. Rides in this repo so it
          shares the font pipeline; harmless to the deployed reels site. */}
      <Composition
        id="CresloPromo"
        component={PromoVideo}
        durationInFrames={PROMO_FRAMES}
        fps={PROMO_FPS}
        width={PROMO_W}
        height={PROMO_H}
      />
    </>
  )
}
