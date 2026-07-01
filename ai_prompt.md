# DIGITORA DMS — Prompt 4: UI/UX Effects & Final Polish

This is the FINAL enhancement pass. The project is functionally
complete. This prompt is purely about visual quality and UX polish —
making the difference between "good" and "impressive enough to win".

Go through EVERY page and component and apply the changes below.
Do not skip any section.

---

## ENHANCEMENT 1 — Audit and fix ALL remaining visual inconsistencies

Before adding new effects, do a consistency audit:
- Every card/panel must use the same border-radius (check that new
  pages added in Prompt 2/3 match the original dashboard)
- Every modal/dialog must have the glassmorphism treatment
  (`backdrop-filter: blur(20px)`, semi-transparent background)
- Every button must have the `scale(0.97)` press micro-interaction
- Every interactive card must have the `translateY(-2px)` hover lift
- Font usage must be consistent: Space Grotesk for headings, Inter
  for body, JetBrains Mono for all numbers/IDs/coordinates

Fix any inconsistencies found before proceeding.

---

## ENHANCEMENT 2 — Page transition animations

Currently, navigating between pages (sidebar links) is instant.
Add smooth page transitions using Framer Motion:
- Outgoing page: `opacity: 1 → 0`, `y: 0 → -8px`, 180ms ease-in
- Incoming page: `opacity: 0 → 1`, `y: 12px → 0`, 220ms ease-out
- Wrap the router outlet with a Framer Motion `AnimatePresence` +
  `motion.div` with these variants
- The transition should feel snappy, not slow — keep total duration
  under 400ms combined

---

## ENHANCEMENT 3 — Enhanced Galaxy background (night mode only)

The current Galaxy background has nebula gradients. Enhance it:

### Shooting stars
Add occasional shooting star animations — a thin bright line that
streaks across the background, fades in fast and out slow, at random
positions and angles. Frequency: 1 every 8-15 seconds (random
interval). Implement as a CSS `@keyframes` animation on a pseudo-element
or a small Canvas overlay. Max 1-2 shooting stars visible at once.

### Depth layers
Add a subtle `vignette` effect — a radial gradient overlay, dark at
the edges, transparent in the center, `pointer-events: none`, on top
of the star layer but below the UI. This adds visual depth and makes
the center content area feel more focused.

### Star density variation
Currently stars are likely uniform. Make them slightly denser toward
the bottom-right and sparser top-left — just adjust the distribution
logic slightly. This creates a more natural, asymmetric galaxy feel.

---

## ENHANCEMENT 4 — Alert modal improvements

The Level 3 alert modal needs two additions:

### Waveform animation while alert is active
While the Level 3 modal is open, show an animated audio waveform
visual below the alert message (even if no audio is playing — it's
purely decorative, reinforcing "ALARM" status). Simple implementation:
5-7 vertical bars, each animating `scaleY` between 0.3 and 1.0 with
different `animation-delay` values, colored in `--danger`.

### Auto-dismiss countdown
Add a subtle countdown indicator: if the dispatcher doesn't
acknowledge within 30 seconds, the modal pulses once more (the
entrance animation replays) to re-grab attention. Do NOT auto-close
the modal — just re-pulse it. Show a thin progress ring around the
"Acknowledge" button counting down the 30 seconds (resets if the
dispatcher hovers over the button, indicating they're looking at it).

---

## ENHANCEMENT 5 — Dashboard page micro-details

### Live indicator in header
Next to the "DIGITORA" logo, add a small animated "LIVE" badge:
a red dot (using `--danger` color) with a continuous, very subtle
pulse animation, followed by the text "LIVE". This communicates to
the dispatcher that the dashboard is actively receiving data.
When the WebSocket is disconnected, the dot turns gray and text
changes to "OFFLINE".

### Driver card — last seen timestamp
On each driver card in the dashboard list, add a small "Last seen:
X seconds ago" line below the driver name, updating every second
(use a `setInterval` that re-renders just this text — not the whole
card). Color it `--text-muted` when recent (< 30s), `--caution` when
stale (30s-2min), `--danger` when very stale (> 2min, suggesting
connection loss).

### Map — fit bounds on load
When the map loads, if there are multiple device markers, automatically
fit the map bounds to show all markers (Leaflet `map.fitBounds()`).
When a new marker appears (new device connects), smoothly pan to
include it.

---

## ENHANCEMENT 6 — Reports page chart polish

The Recharts charts added in Prompt 2 need visual polish:

- Chart background: transparent (no white box — the glassmorphism
  card provides the background)
- All axis text: `--text-muted` color, 11px, Inter font
- Grid lines: `--border` color, dashed, very subtle (opacity 0.4)
- Bar chart: add `radius={[4, 4, 0, 0]}` on bars (rounded top corners)
- Bar chart: add a subtle gradient fill (top: full color, bottom:
  60% opacity) — use Recharts `linearGradient` defs
- Pie chart: add `stroke="transparent"` to remove white gaps between
  slices
- All chart tooltips: glassmorphism style (already specified in
  Prompt 2, confirm it's actually applied consistently)
- Add a chart loading skeleton (shimmer, same style as other
  skeletons) that shows while data is fetching

---

## ENHANCEMENT 7 — Accessibility and UX quality-of-life

These don't affect visual design but improve UX score:

- All icon-only buttons must have `aria-label` and a shadcn/ui
  `Tooltip` that appears on hover (150ms delay)
- Keyboard navigation: pressing `Escape` closes any open modal,
  popover, or notification panel
- When a Level 3 alert arrives and notifications are ON, briefly
  change the browser tab title to "⚠️ ALERT — DIGITORA DMS" and
  restore it after 5 seconds (or when acknowledged)
- Add a "Jump to top" button that appears after scrolling 300px on
  long pages (History, Reports) — subtle, bottom-right corner,
  glassmorphism style

---

## FINAL CHECK

After all enhancements are applied:
1. Run the app and navigate through EVERY page
2. Toggle between dark and light mode — confirm smooth transition
   on all pages including the new ones
3. Confirm the Galaxy background shooting stars appear in dark mode
4. Trigger a mock Level 3 alert (via mock WebSocket or direct state
   manipulation) and confirm: modal animates correctly, waveform
   shows, countdown ring works, bell badge increments, tab title
   changes
5. Check that NO orange/carrot accent color remains anywhere
   (use browser DevTools color picker if needed)

Report what you find and fix anything that fails.