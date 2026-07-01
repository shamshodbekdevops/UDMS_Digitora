# DIGITORA DMS — Prompt 3: Login Galaxy + Final Polish

Do NOT touch anything from Prompt 1 or 2. Make ONLY these changes:

---

## CHANGE 1 — Login page: Remove moon, enhance Galaxy background

On the Login/Register page:
1. Remove the moon icon/emoji completely — from the theme toggle
   button AND any decorative moon in the background
2. Enhance the Galaxy background to be more vivid and realistic:
   - Increase star density (more stars, varied sizes: 1px, 1.5px, 2px)
   - Add 3-4 nebula gradient blobs (not just 2):
     * Purple: `radial-gradient(ellipse at 15% 10%, #2D1B69 0%, transparent 45%)`
     * Blue: `radial-gradient(ellipse at 85% 80%, #0E2A4A 0%, transparent 45%)`
     * Pink-purple: `radial-gradient(ellipse at 70% 20%, #3D1A5E 0%, transparent 35%)`
     * Teal: `radial-gradient(ellipse at 20% 75%, #0A3040 0%, transparent 40%)`
   - Stars must have 3 layers with different animation speeds:
     * Layer 1 (small stars, 0.5-1px): twinkle every 3-4s
     * Layer 2 (medium stars, 1-1.5px): twinkle every 5-7s
     * Layer 3 (bright stars, 2px): twinkle every 8-12s
   - Add 1-2 shooting star animations (CSS @keyframes):
     * A thin bright line that streaks diagonally across the screen
     * Appears randomly every 10-15 seconds
     * Duration: 0.8s (fast streak, slow fade)
   - The login card must use glassmorphism:
     `backdrop-filter: blur(24px) saturate(150%)`
     `background: rgba(15, 12, 35, 0.6)`
     `border: 1px solid rgba(138, 148, 255, 0.2)`

3. The UDMS logo (`rasm.png`) must be centered above the login card,
   large enough to be prominent (80-100px height)
4. Below the logo: "UDMS" in Space Grotesk bold, then "created by Digitora"
   in small muted text

---

## CHANGE 2 — Dashboard Galaxy background consistency

Apply the same enhanced Galaxy background from Change 1 to the main
dashboard layout (the background behind all panels).

The glassmorphism cards on the dashboard should show the nebula
through them — confirm `backdrop-filter: blur(20px)` is applied
to ALL cards, sidebars, and panels in dark mode.

In light mode, the background should be the "Atmosphere" gradient
(sky blue to white) — confirm this still works correctly after
the Galaxy enhancement.

---

## CHANGE 3 — Final cross-page consistency audit

Go through EVERY page one by one and fix:

1. Any page that doesn't have the Galaxy/Atmosphere background
2. Any card that doesn't have glassmorphism in dark mode
3. Any button that's missing the `scale(0.97)` press animation
4. Any interactive card missing `translateY(-2px)` hover effect
5. Any number (PERCLOS %, stats) not using JetBrains Mono font
6. Any heading not using Space Grotesk font
7. Any page missing the UDMS branding (should have been fixed in
   Prompt 1, but verify here)

Make a list of what you fixed in this audit and show it.

---

## CHANGE 4 — Performance check

After all changes:
1. Open the app in browser
2. Toggle dark/light mode 3 times — confirm smooth transition
3. Navigate to every page — confirm Galaxy background is consistent
4. Check browser console for any errors — fix any that appear
5. Confirm the map correctly switches tile layers with theme

Report what you found and fixed.

---

Complete all 4 changes. This is the FINAL prompt — make sure
everything is polished and production-ready for the hackathon demo.