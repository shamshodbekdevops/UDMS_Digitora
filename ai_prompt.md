# DIGITORA DMS — Prompt 1: Quick Fixes

This is an ADDITION to the existing project. Do NOT restructure or
rewrite existing code. Make ONLY the changes listed below, nothing else.

---

## CHANGE 1 — Remove orange/carrot color everywhere

The existing UI uses an orange/carrot accent color (`#E8762C` or similar
orange shades) in many places — buttons, active states, badges, icons.

Replace ALL occurrences of this orange accent with `#2B6FE0` (blue) in
light mode and `#6C8EFF` (soft indigo-blue) in dark mode.

Keep the DANGER color (`#FF4757`) unchanged — that is an alarm color,
not an accent.
Keep the Digitora logo mark unchanged if it uses orange — brand logo
is exempt.

Search across ALL component files, CSS variables, Tailwind classes, and
inline styles. Do not leave any orange accent behind.

---

## CHANGE 2 — Remove moon icon from dark mode toggle

In the theme toggle button (dark/light mode switcher in the header),
remove the moon (🌙 or any moon SVG/icon). Replace with a simple
sun/star icon for light mode and a galaxy/stars icon (✦ or a clean
star SVG) for dark mode — or just use a clean toggle switch UI with
no icon at all. The moon specifically looks cheap and cliché for a
"Galaxy" themed dark mode.

---

## CHANGE 3 — Fix Role badge click in header

Currently, clicking the Role badge/chip in the top header area does
nothing.

Fix it: clicking the role badge should open a small dropdown popover
(use shadcn/ui `Popover` or `DropdownMenu`) showing:
- Current role (e.g. "Business")
- Current user email
- A "Switch role" option (for demo: just show a disabled item
  "Upgrade to Business" if already Business, or "Contact admin")
- A "Sign out" button at the bottom

The dropdown should match the existing glassmorphism card style.

---

After completing all 3 changes, show me the result. Do NOT proceed to
any other changes from other prompts yet.