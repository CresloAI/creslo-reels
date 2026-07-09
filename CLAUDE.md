# creslo-reels — agent guide

## PRIME DIRECTIVE: NEVER DESIGN BLIND
Full doctrine: `C:\Users\HP User\iCloudDrive\Creslo\02 Product\Creslo-Creative-Doctrine.md`.
Any visual change to compositions in this repo MUST be verified by looking at rendered
frames before it is reported as done. The deployed interactive Remotion Studio (last
deployed bundle) is at:
https://remotionlambda-useast1-anxcjdkwnh.s3.us-east-1.amazonaws.com/sites/creslo-reels/index.html
(compositions ReelVideo + CresloPromo; props editable — exercise beat_type text/cta/mockup,
brandColor/brandName/brandLogo). For uncommitted changes: `npm run studio` locally, or flag
"needs visual verification after redeploy" explicitly in your report.

## Mirror discipline
Captions.tsx / Beat.tsx / ReelVideo.tsx / lib/types.ts shared sections MUST stay
byte-identical with creslo-frontend/src/remotion/* (the live preview). Every composition
change requires a Lambda site redeploy to affect customer renders:
`npx remotion lambda sites create src/index.ts --site-name=creslo-reels`

## Brand rule
The Creslo logo is ALWAYS the rounded-square OUTLINE containing the serif "C." mark.
