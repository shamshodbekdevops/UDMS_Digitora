# DIGITORA DMS — Prompt 1: Quick Fixes (4 ta tuzatish)

Do NOT restructure anything. Make ONLY these exact changes:

---

## FIX 1 — Dark/Light mode: Map always shows dark

The Leaflet map always renders with a dark tile layer regardless of
the current theme. Fix it:
- LIGHT mode tile: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- DARK mode tile: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`

Listen to the theme state (Zustand or context) and swap the tile
layer when theme changes. The map should re-render with the correct
tiles immediately when theme is toggled.

Also audit ALL other components for dark/light issues — text colors,
borders, card backgrounds, chart axis colors. Fix anything that does
not properly respond to theme toggle.

---

## FIX 2 — Notification panel button text clipped

"Hammasini o'qilgan deb belgilash" button text is cut off in the corner.
Fix:
- Add `white-space: nowrap` to the button
- Give it proper padding and min-width
- Fix the panel header flex layout so button has enough space

---

## FIX 3 — Remove moon icon from theme toggle

Remove the moon emoji or SVG from the dark mode toggle button in the
header. Replace with a clean star/galaxy SVG icon. No moon anywhere.

---

## FIX 4 — Rebrand: "Digitora DMS" → "UDMS"

Search ALL files for "Digitora DMS", "DIGITORA DMS", logo/icon usage.
Replace everywhere:
- Main text: `UDMS` (large bold)
- Subtitle: `created by Digitora` (11px, var(--text-muted), below or beside)
- Logo image: `<img src="/rasm.png" alt="UDMS" />` (user will place the file)

Apply on: Login page, Dashboard sidebar, everywhere the brand appears.

---

Complete all 4 fixes, show result, then STOP.