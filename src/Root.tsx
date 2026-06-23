import React from 'react'
import { Composition } from 'remotion'
import { ReelVideo } from './ReelVideo'
import { FPS, WIDTH, HEIGHT, totalDurationInFrames, type ReelData } from './lib/types'
import sample from './sample-reel.json'

export const RemotionRoot: React.FC = () => {
  return (
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
  )
}
