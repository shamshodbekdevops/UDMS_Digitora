# DIGITORA DMS — Prompt 3: Settings & Notifications

This is an ADDITION to the existing project. Extend 2 existing
features. Use the same design system — do not introduce new patterns.

---

## FEATURE 1 — Notification toggle in Dashboard header

In the dashboard header, the notification bell (🔔) icon currently
has no toggle functionality.

**Add the following:**

### Bell icon behavior
- Clicking the bell opens a notification panel (shadcn/ui `Sheet`
  sliding in from the right, or an inline dropdown — your choice,
  whichever fits the existing header layout better)
- At the top of the panel: a toggle switch labeled
  "Enable notifications" (on/off)
- When OFF: bell icon gets a strikethrough slash overlay, no new
  notification popups appear (suppress all Level 2/3 alert modals
  and audio), persisted in `localStorage`
- When ON (default): bell icon is normal, alerts function as usual

### Notification panel content
- List of the last 20 notifications (pulled from `AlertEvent` via
  `GET /api/alert-events/?limit=20`)
- Each item: colored alarm badge, driver name, message, relative
  time ("3 minutes ago" — use a simple relative time formatter)
- Unread items have a subtle left border in the alarm level color
- "Mark all as read" button at the top
- Unread count badge on the bell icon (red dot with number, max "9+")

### Real-time: new WebSocket Level 2/3 events
- Append to the notification list automatically (no page refresh)
- Increment the unread count badge
- If notifications are ON: show the existing Level 3 modal AND play
  the audio signal

---

## FEATURE 2 — Settings page (full content)

The Settings page (`/settings`) currently exists but is mostly empty
or has placeholder content. Fill it with real, useful content divided
into these sections (use a left tab/nav + right content layout within
the page):

### Tab 1 — Profile
- Display name (editable text field)
- Email (read-only, from JWT/auth)
- Phone number (editable)
- Language preference (dropdown: Uzbek / English / Korean — connects
  to the existing i18n system, changing this should immediately switch
  the UI language)
- Save button → `PATCH /api/users/me/`

### Tab 2 — Account & Role
- Current role displayed prominently (large badge: "Free" or
  "Business" or "Admin")
- For Free users: an upgrade CTA card — "Upgrade to Business"
  with listed features and a "$49/month" price tag (UI only, no
  real payment — button shows "Contact sales" or a mailto link)
- For Business users: company name (editable), number of active
  devices (read-only, from `GET /api/devices/count/`)
- Account status: "Active" green badge

### Tab 3 — Billing (Business role only, hidden for Free/Admin)
- Current plan: "Business — $49/month"
- Next billing date: hardcoded or from a mock field (e.g.
  "August 1, 2026")
- Number of devices: current count vs plan limit (e.g. "3 / 10
  devices") shown as a progress bar using `--accent` color
- Usage this month: a simple bar showing "X alert events logged"
  vs a monthly cap
- Invoice history: a small table with 3-4 mock rows
  (Date, Amount, Status: "Paid" green badge, Download PDF link
  that shows a toast "PDF generation coming soon")
- Cancel plan button (red, opens a confirmation modal)

### Tab 4 — Notifications (settings, not the panel)
- Toggle: "Email alerts for Level 3 events" (on/off, saved via API)
- Toggle: "Browser push notifications" (on/off — request permission
  via `Notification.requestPermission()` if turned on)
- Toggle: "Sound alerts" (on/off, saved to localStorage)
- Alarm sensitivity: a slider or select for "Notify me at Level:"
  (1 / 2 / 3) — saves to localStorage

### Tab 5 — Devices
- List of all devices owned by the current user
  (`GET /api/devices/`)
- Each row: Device ID, status dot (online/offline), last seen
  timestamp, assigned driver name
- "Add device" button → opens a simple modal with Device ID +
  friendly name fields

**Visual for Settings:**
- Left tab nav uses the same sidebar style (glassmorphism, active
  state with accent color, Framer Motion layout animation on active
  indicator)
- Content area is a glassmorphism card
- All form inputs match the existing design system
- Section headings use `--text-muted`, slightly smaller than body

---

After completing both features, show me the result. Do NOT proceed to
Prompt 4 yet.