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

## Deploy / redeploy (verified)

The in-product export renders on **Remotion Lambda** from a bundle published to S3.
To (re)publish this composition:

```bash
npx remotion lambda sites create src/index.ts --site-name=creslo-reels --region=us-east-1
```

- **Run it from `C:\dev\creslo-reels`** — Remotion auto-loads `.env` here for the
  `REMOTION_AWS_ACCESS_KEY_ID` / `REMOTION_AWS_SECRET_ACCESS_KEY` creds.
- **Idempotent:** `--site-name=creslo-reels` overwrites the existing site **at the same
  serve URL** — `https://remotionlambda-useast1-anxcjdkwnh.s3.us-east-1.amazonaws.com/sites/creslo-reels/index.html`
  (this is exactly what the backend's `REMOTION_SERVE_URL` expects). It diffs against the
  live bundle and skips the upload if nothing changed (`Uploaded to S3 (Unchanged)`).
- **No function redeploy needed** while local Remotion stays at the deployed function's
  version (currently **4.0.479**, function `remotion-render-4-0-479-mem3008mb-disk10240mb-240sec`).
  Only run `npx remotion lambda functions deploy` if the Remotion version changes.
- ⚠️ **Any change to `ReelVideo` / `Captions` / `Beat` (or any composition logic) only reaches
  the exported video after this redeploy.** The in-app `@remotion/player` preview uses the
  frontend's copy and updates immediately, so preview and export can silently drift until you redeploy.

Verify the live state any time (read-only):

```bash
npx remotion lambda functions ls --region=us-east-1
npx remotion lambda sites ls --region=us-east-1
```

## Next

- Editor preview in-app via `@remotion/player` (same composition).
- Licensing note: free for individuals / companies of 3 or fewer; a company
  licence is needed once Creslo passes that.
