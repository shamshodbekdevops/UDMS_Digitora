# DIGITORA DMS — Prompt 2: New Pages (History, Reports, Drivers)

This is an ADDITION to the existing project. Add 3 new pages/sections.
Use the EXACT same design system already in the project (glassmorphism
cards, CSS variables, Framer Motion, same fonts, same color tokens).
Do not introduce new design patterns — extend what already exists.

---

## PAGE 1 — History (`/history`)

Add a "Tarix" (History) page accessible from the sidebar.

**Content:**
- A filterable, paginated table of all `AlertEvent` records from the
  backend (`GET /api/alert-events/` with query params)
- Columns: Timestamp, Driver name, Device ID, Alarm level (colored
  badge — use `--safe`/`--caution`/`--warning`/`--danger` tokens),
  PERCLOS %, Message, GPS location (lat/lon as small text)
- Filters at the top: date range picker, alarm level multi-select,
  device/driver select dropdown
- Each row is clickable — expands inline (accordion style) to show
  full details: all telemetry fields, a mini PERCLOS sparkline if
  multiple events exist for that session
- Export button (top right): exports current filtered view as CSV
  (client-side, using plain JS `Blob` — no backend needed for this)

**Visual:**
- Table rows use glassmorphism card style (not a plain HTML table) —
  each row is a subtle card with hover lift effect
- Alarm level badge pulses once on hover (reuse Risk Pulse animation
  logic, single pulse, not continuous)
- Empty state: a clean illustration placeholder with text
  "No events found for the selected filters"

---

## PAGE 2 — Reports (`/reports`)

Add a "Hisobot" (Reports) page accessible from the sidebar.

**Content — 4 sections on one page:**

### Section A — Summary cards (top row)
4 stat cards: Total drivers, Total alerts today, Average PERCLOS
(fleet-wide, last 24h), Most at-risk driver (name + alarm count).
Numbers use count-up animation on page load (reuse existing count-up
pattern from the project).

### Section B — Bar chart: Alerts by driver
Recharts `BarChart` — X axis: driver names, Y axis: alert count.
Bars are colored by the driver's worst alarm level today
(`--caution`, `--warning`, `--danger`). Clicking a bar filters
Section D to that driver.

### Section C — Pie chart: Alarm level distribution
Recharts `PieChart` — slices for Level 0/1/2/3 counts (last 7 days).
Use exact colors: `--safe`, `--caution`, `--warning`, `--danger`.
Show percentage labels inside slices. On hover, slice expands slightly
(Recharts built-in `activeShape`). Legend below the chart.

### Section D — Live data table
Same component as the History table but pre-filtered to "today" and
without the date filter (since this is a "today's report" view).
Syncs with WebSocket — new events append to the top of the table in
real time with a brief highlight animation (`background` flash from
`--warning`/`--danger` to transparent over 1.5s).

**Visual:**
- All 4 sections on one scrollable page with clear section headings
- Charts use the same glassmorphism card wrapper as everything else
- Chart grid lines and axis labels use `--text-muted` color
- Chart tooltip uses the glassmorphism style (`backdrop-blur`,
  `--surface-elevated` background, `--border` border)

---

## PAGE 3 — Drivers (`/drivers`)

Add a "Haydovchilar" (Drivers) page accessible from the sidebar.
Clicking "Drivers" in the sidebar opens this page.

**Content:**

### Driver list (main view)
- Grid of driver cards (3 columns desktop, 2 tablet, 1 mobile)
- Each card shows: avatar (initials-based, colored by role/status),
  driver name, assigned vehicle plate, device ID, current status
  (Online/Offline badge), total alerts this week
- Search bar at the top (filters cards in real time, client-side)
- "Add Driver" button (top right, primary style with `--accent` color)

### Add / Edit Driver (modal, not a new page)
When "Add Driver" is clicked OR a driver card's edit icon is clicked,
open a shadcn/ui `Dialog` modal with this form:
- Full name (text input)
- Vehicle plate (text input)
- Device ID (select from unassigned devices, fetched from
  `GET /api/devices/?unassigned=true`)
- Phone number (text input, optional)
- Notes (textarea, optional)
- Submit button: "Save" (POST to `POST /api/drivers/` for new,
  PATCH to `PATCH /api/drivers/{id}/` for edit)

### Delete confirmation
Clicking the delete (trash) icon on a card opens a small confirmation
popover (NOT a full modal — use shadcn/ui `Popover`): "Delete
[driver name]? This cannot be undone." with Cancel and Delete buttons.
DELETE request to `DELETE /api/drivers/{id}/`.

### Driver detail (clicking driver name/avatar)
Navigates to `/drivers/{id}` — reuse the existing Driver Detail page,
just link it from here.

**Visual:**
- Driver cards use the same glassmorphism style
- Avatar: a circle with the driver's initials, background color
  derived from the driver name string (consistent hash → one of 6
  preset `--accent` shade variants) — never a random color on re-render
- Status badge (Online/Offline) is a small colored dot + text, same
  pattern as the device status dots already in the project
- Card hover: `translateY(-3px)` lift + `--border-glow` intensifies
  (same micro-interaction pattern as existing cards)
- Empty state for search: "No drivers match your search"
- Empty state for no drivers yet: "No drivers added yet" + prominent
  "Add your first driver" CTA button

---

## BACKEND ADDITIONS NEEDED

Add these DRF endpoints if they don't already exist:
- `GET/POST /api/drivers/` — list and create
- `GET/PATCH/DELETE /api/drivers/{id}/` — retrieve, update, delete
- `GET /api/devices/?unassigned=true` — devices without a driver

Add a `Driver` model if it doesn't exist:
```
Driver
  - full_name (CharField)
  - vehicle_plate (CharField)
  - device (OneToOneField Device, nullable)
  - phone (CharField, nullable)
  - notes (TextField, nullable)
  - owner (ForeignKey User)
  - created_at
```

---

After completing all 3 pages, show me the result. Do NOT proceed to
Prompt 3 yet.