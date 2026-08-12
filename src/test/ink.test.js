// Reel caption ink audit — the readability gate for text beats.
//
// WHY THIS EXISTS
// On 2026-08-12 a live production bug was found by rendering a still and LOOKING at it:
// Silk + the `pop` caption preset rendered #FFFFFF text on a pale mint ground, barely
// readable. It had been live for every one of the nine light field styles.
//
// The cause was not a bad colour. `textCol` correctly resolved to dark ink. The bug was
// that the patch which applies that ink to the caption preset keyed off `tone === 'light'`,
// while the storyboard sets `field_style` WITHOUT `field_tone` — so `tone` fell back to
// deep/rich, the patch never ran, and the preset's cream stayed put.
//
// So this file checks TWO things, because the bug needed both to be caught:
//   1. THE RULE  — that the ink actually applied is the ground-appropriate one
//                  (catches "right colour computed, wrong colour used")
//   2. THE VALUE — that the applied ink clears 4.5:1 against the ground the style paints
//                  (catches "colour applied, still unreadable")
//
// A pure colour-maths test would have passed the buggy build. Rule 1 is the important one.
//
// It reads the real logic out of Beat.tsx rather than restating it, so drifting the
// component drifts the test — same approach as server/test/filter.test.js in the backend.
//
// Usage:  node src/test/ink.test.js      (exit 0 = pass, 1 = fail)

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'components', 'Beat.tsx');
const src = fs.readFileSync(SRC, 'utf8');

let failed = 0;
const fail = (msg) => { failed++; console.log('  FAIL ' + msg); };
const ok = (msg) => console.log('  ok   ' + msg);

// ---------------------------------------------------------------------------
// Colour maths — mirrors of Beat.tsx's own helpers.
// shade() is ADDITIVE (v + 255*amt), not multiplicative. Getting that wrong makes
// every number in this file meaningless, so it is asserted against source below.
// ---------------------------------------------------------------------------
const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
const hex2 = (h) => {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const shade = (h, a) => { const [r, g, b] = hex2(h); return [cl(r + 255 * a), cl(g + 255 * a), cl(b + 255 * a)]; };
const lum = (c) => {
  const v = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const parseCol = (c) => (Array.isArray(c) ? c : hex2(c));

// ---------------------------------------------------------------------------
// GUARD 0 — the assumptions this file is built on must still hold in source.
// ---------------------------------------------------------------------------
console.log('\nGuards (source assumptions)');

if (/const f = \(v: number\) => Math\.max\(0, Math\.min\(255, Math\.round\(v \+ 255 \* amt\)\)\)/.test(src)) {
  ok('shade() is still additive (v + 255*amt)');
} else {
  fail('shade() changed shape — every ratio in this file is now suspect. Re-derive before trusting it.');
}

const lightSet = (src.match(/FIELD_LIGHT_STYLES = new Set\(\[([^\]]*)\]/) || [])[1];
if (!lightSet) {
  fail('could not read FIELD_LIGHT_STYLES from Beat.tsx');
}
const LIGHT = lightSet ? lightSet.split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : [];
ok(`FIELD_LIGHT_STYLES read from source: ${LIGHT.length} styles`);

// ---------------------------------------------------------------------------
// RULE 1 — the ink that is actually APPLIED to the caption.
// This is the bug that shipped. `groundIsLight` must consider the STYLE, not just
// the tone, or a light style with a deep/rich tone keeps the preset's cream.
// ---------------------------------------------------------------------------
console.log('\nRule 1 — is the ground-appropriate ink actually applied?');

const hasGroundIsLight = /const groundIsLight = tone === 'light' \|\| \(!!fieldStyle && FIELD_LIGHT_STYLES\.has\(fieldStyle\)\)/.test(src);
if (hasGroundIsLight) ok('groundIsLight considers the field STYLE, not only the tone');
else fail('groundIsLight no longer accounts for light field styles — this is the exact 2026-08-12 bug. '
        + 'A light style with tone deep/rich will keep the preset cream on a cream ground.');

if (/if \(groundIsLight && cfg\)/.test(src)) ok('the caption-colour patch is gated on groundIsLight');
else fail('the caption-colour patch is no longer gated on groundIsLight');

// Simulate the component's decision. The groundIsLight EXPRESSION is lifted verbatim
// out of Beat.tsx and evaluated here, rather than restated — a restated copy would have
// stayed green against the very bug this file exists to catch (proven: reverting the fix
// in a temp copy left the simulation passing while only the regex guard fired). Reading
// the real expression means drifting the component drifts the test.
const groundExpr = (src.match(/const groundIsLight = ([^\n]+)/) || [])[1];
if (!groundExpr) fail('could not lift the groundIsLight expression out of Beat.tsx');
const evalGroundIsLight = groundExpr
  ? new Function('tone', 'fieldStyle', 'FIELD_LIGHT_STYLES', 'return (' + groundExpr.trim() + ');')
  : () => true;

function appliedInk(fieldStyle, fieldTone, index, accent) {
  const tone = fieldTone || (index % 2 === 1 ? 'deep' : 'rich');
  const textCol = (fieldStyle && fieldStyle !== 'mesh')
    ? (LIGHT.includes(fieldStyle) ? shade(accent, -0.55) : [255, 255, 255])
    : (tone === 'light' ? shade(accent, -0.52) : (tone === 'deep' ? [255, 255, 255] : null));
  const groundIsLight = evalGroundIsLight(tone, fieldStyle, new Set(LIGHT));
  // The preset's cream is only overridden when the component thinks the ground is light.
  const PRESET_CREAM = [245, 239, 224];
  return groundIsLight ? textCol : PRESET_CREAM;
}

// The ground each light style paints in the caption band (~35-65% height). Read off the
// gradients in Beat.tsx; the value is the ground the TEXT sits on, not the darkest pixel
// anywhere in the frame — an earlier ad-hoc version of this check used the latter and
// wrongly reported every brand colour as failing.
const BAND = {
  silk: 0.62, rays: 0.78, paper: 0.71, marble: 0.72, gallery: 0.80,
  linen: 0.66, dawn: 0.55, halftone: 0.78, leak: 0.73, papercut: 0.72,
};

for (const s of LIGHT) {
  if (BAND[s] === undefined) {
    fail(`light style '${s}' has no caption-band ground recorded in this test — add it, `
       + 'or the style ships unaudited.');
  }
}

let ruleMisses = 0;
for (const style of LIGHT) {
  for (const tone of [undefined, 'light', 'rich', 'deep']) {
    for (const index of [0, 1]) {
      const ink = appliedInk(style, tone, index, '#31695E');
      const isCream = ink[0] > 200 && ink[1] > 200 && ink[2] > 190;
      if (isCream) {
        ruleMisses++;
        fail(`${style} + tone=${tone || '(unset)'} + index=${index} applies CREAM ink on a light ground`);
      }
    }
  }
}
if (!ruleMisses) ok(`all ${LIGHT.length} light styles apply dark ink across every tone (incl. unset)`);

// ---------------------------------------------------------------------------
// RULE 2 — is the applied ink actually readable on that ground?
// Swept across the whole RGB cube, because brand colours are EXTRACTED from customer
// websites (backend /api/brand/palette), not chosen from a preset list. Any colour a
// real site yields must work.
// ---------------------------------------------------------------------------
console.log('\nRule 2 — does the applied ink clear 4.5:1 on the ground it sits on?');

const NEED = 4.5;
let worst = { r: Infinity };
let checked = 0;
for (let r = 0; r < 256; r += 17) {
  for (let g = 0; g < 256; g += 17) {
    for (let b = 0; b < 256; b += 17) {
      const brand = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
      for (const style of LIGHT) {
        if (BAND[style] === undefined) continue;
        const ink = parseCol(appliedInk(style, undefined, 0, brand));
        const ground = shade(brand, BAND[style]);
        const rr = ratio(ink, ground);
        checked++;
        if (rr < worst.r) worst = { r: rr, brand, style };
      }
    }
  }
}
if (worst.r >= NEED) {
  ok(`${checked.toLocaleString()} combinations checked — worst ${worst.r.toFixed(2)}:1 (${worst.brand} on ${worst.style})`);
} else {
  fail(`worst ${worst.r.toFixed(2)}:1 < ${NEED} — brand ${worst.brand} on ${worst.style}`);
}

// ---------------------------------------------------------------------------
// RULE 3 — dark styles must NOT get dark ink (the inverse failure).
// ---------------------------------------------------------------------------
console.log('\nRule 3 — dark styles keep light ink');

const ALL_STYLES = [...new Set([...(src.match(/case '([a-z]+)':/g) || []).map((m) => m.slice(6, -2))])];
const DARK = ALL_STYLES.filter((s) => !LIGHT.includes(s));
let darkMisses = 0;
for (const style of DARK) {
  const ink = parseCol(appliedInk(style, undefined, 0, '#31695E'));
  if (lum(ink) < 0.5) { darkMisses++; fail(`dark style '${style}' applies dark ink`); }
}
if (!darkMisses) ok(`${DARK.length} dark styles all apply light ink`);

// ---------------------------------------------------------------------------
console.log('');
if (failed) {
  console.error(`${failed} FAILURE(S). Do not deploy the Lambda site in this state — `
    + 'captions would ship unreadable to customers.');
  process.exit(1);
}
console.log('Reel caption ink: OK.');
