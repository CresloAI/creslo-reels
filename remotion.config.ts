import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
Config.setCodec('h264')
Config.setOverwriteOutput(true)
// Vertical 9:16 reel quality.
Config.setConcurrency(null) // auto
