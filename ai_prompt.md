# DIGITORA DMS — Prompt 2: Map, Drivers, Translations (4 ta o'zgarish)

Do NOT touch anything from Prompt 1. Make ONLY these changes:

---

## CHANGE 1 — Map: Remove legend, add better info panel

Remove the current "LEGENDA" box (bottom-left of map) completely.

Replace with a clean floating info bar at the TOP of the map:
```
[ ● 4 Faol qurilma ]  [ ⚡ 2 Ogohlantirish ]  [ 🔴 1 Xavf ]
```
Style: glassmorphism card, small, horizontal, top-center of map.
Numbers update in real-time from WebSocket data.
Each stat is colored: green for active, orange for warning, red for danger.

---

## CHANGE 2 — Driver Online/Offline status fix

Currently drivers show "Ulangan" (connected) even when no data is
coming from the device. Fix this:

A driver/device is ONLINE only if:
- `LiveStatus.last_seen` is within the last 30 seconds

A driver/device is OFFLINE if:
- No data received for more than 30 seconds
- Or device has never sent data

In the driver card and driver list:
- Show green "● Online" badge when online
- Show gray "○ Offline" badge when offline
- Remove the current "Ulangan" static status

Update both the backend API response and the frontend display.

---

## CHANGE 3 — DGT-002 static GPS location

For the device with `device_id = "DGT-002"`, set a static GPS
location (used when real GPS data is 0,0 or missing):

```
Latitude:  41.309847
Longitude: 69.2686852
```
(Lotte City Hotel Tashkent Palace location)

In the frontend map component: if `gps.lat === 0 && gps.lon === 0`,
use these fallback coordinates for DGT-002 specifically.
Show the marker at this location on the map.

---

## CHANGE 4 — Full i18n for ALL pages

Currently some pages are not translated. Make ALL text translatable:

1. Go through EVERY page and component
2. Find any hardcoded Uzbek, English, or Korean text strings
3. Replace ALL of them with i18n translation keys using react-i18next
   `const { t } = useTranslation()` and `{t('key')}`
4. Add the translation keys to all 3 locale files: `uz.json`, `en.json`, `ko.json`

Pages that need special attention:
- Drivers page (all table headers, buttons, status labels)
- History page (filter labels, column headers, empty states)
- Reports page (chart titles, stat card labels)
- Settings page (all tab labels, form labels)
- Alert modal (all text inside)
- Driver detail page (all labels)

After adding keys, test by switching language in the header — ALL
text on ALL pages must change language immediately.

---

Complete all 4 changes, show result, then STOP.