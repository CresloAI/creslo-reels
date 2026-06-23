# Creslo Reels — render engine (Remotion)

Premium, on-brand, animated-caption reels rendered from code. Same composition
will power the in-app live editor preview (Remotion Player) and the server export.

## Run locally (no AWS, no cost)

```bash
cd creslo-reels
npm install
npm run studio       # live, scrubbable preview in your browser
```

Render a real MP4:

```bash
npm run render:sample           # uses src/sample-reel.json
# or, with your own data:
npm run render -- --props=path/to/reel.json
```

Output lands in `out/reel.mp4`.

## What it does

- 9:16, 1080×1920, 30fps.
- Each beat: its stock clip with a slow Ken-Burns push (or a branded gradient if
  no clip), a legibility gradient, and animated captions.
- Captions: word-by-word spring entrance + active-word highlight in the brand
  colour. Styles: `pop` (default), `karaoke`, `clean` (set `captionStyle` in props).
- A trendy progress bar across the bottom.

## Props (what the Creslo backend will send)

See `src/sample-reel.json`. Key fields: `hook.on_screen`, `scenes[]`
(`on_screen`, `clip_url`, `seconds`), `brandColor`, `captionStyle`, `hookSeconds`.

Drop real Pexels `clip_url`s in to see it over footage; leave them `null` to see
the branded faceless style.

## Next

- Editor preview in-app via `@remotion/player` (same composition).
- Server render via Remotion Lambda for in-product export.
- Licensing note: free for individuals / companies of 3 or fewer; a company
  licence is needed once Creslo passes that.
