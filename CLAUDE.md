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

## PROOF CONSTANT (Daniel's standing order, 2026-07-10)
Nothing is handed to Daniel or shipped to users unproofed. Full law: Creslo/02
Product/Creslo-Creative-Doctrine.md sections 1.5-1.6. The short version:
1. BEFORE presenting any artifact: run the mechanical lint (markup balance, defined
   animations, rotate-flatten, smart-layer content zone) AND look at it.
2. AFTER any deploy (Vercel UI / Lambda site): the AGENT verifies the deployed result
   in the browser first - screenshots, self-critique, fix - THEN hands over. Daniel's
   eyes are for taste verdicts, never for catching defects.
3. Readability law: text always on a contrasting ground, never across a contrast
   boundary; angles under type <= 15 degrees; shadows must actually contrast.
