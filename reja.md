# DIGITORA DMS — Dashboard Loyiha Rejasi

> Driver Monitoring System uchun real-time fleet management dashboard.
> Hackathon Field Mission: *"Real-Time Institutional Back-Office (Admin Dashboard)"*

---

## 1. Loyiha maqsadi

Logistika kompaniyalari uchun haydovchilarning real vaqtda holatini (charchoq, chalg'ish, uyqu) kuzatuvchi, GPS joylashuvini ko'rsatuvchi, va xavfli holatlarda darhol pop-up ogohlantirish beruvchi veb-asoslangan boshqaruv paneli.

**Hakamlar e'tibori shu yerga qaratiladi**: dashboard dizayni va UX — eng yuqori og'irlikdagi baholash mezoni (Field Mission, 30 ball). Shuning uchun vizual sifat va foydalanuvchi tajribasi ustuvor.

---

## 2. Texnologik stack

### Backend
| Texnologiya | Vazifasi |
|---|---|
| Django + Django REST Framework | API, biznes logika, autentifikatsiya |
| Django Channels | WebSocket — real-time ma'lumot uzatish |
| PostgreSQL | Asosiy ma'lumotlar bazasi |
| Redis | Channels uchun message broker (WebSocket qatlami) |
| Docker + docker-compose | Konteynerizatsiya, bitta buyruq bilan deploy |

### Frontend
| Texnologiya | Vazifasi |
|---|---|
| React (Vite) | UI kutubxonasi, tezkor build |
| Node.js | Build vositasi, paket boshqaruvi (npm/pnpm) |
| TypeScript | Tip xavfsizligi |
| Tailwind CSS | Styling tizimi |
| shadcn/ui | Tayyor, professional UI komponentlar |
| Recharts | Grafiklar (PERCLOS tarixi, statistika) |
| Mapbox GL JS / Leaflet | Live xarita, GPS nuqtalari |
| react-i18next | Ko'p tillilik (UZ / EN / KO) |
| Zustand yoki Redux Toolkit | Global state boshqaruvi |
| Socket.IO client / native WebSocket | Backend bilan real-time aloqa |

---

## 3. Arxitektura sxemasi

```
┌─────────────┐      WebSocket       ┌──────────────────┐
│   Jetson    │ ───────────────────► │  Django Channels  │
│  (Edge AI)  │   JSON paket          │  (Redis orqali)   │
└─────────────┘                       └─────────┬─────────┘
                                                 │
                                       ┌─────────▼─────────┐
                                       │   PostgreSQL       │
                                       │ (Device, Alert,    │
                                       │  Session, User)    │
                                       └─────────┬─────────┘
                                                 │
                                       ┌─────────▼─────────┐
                                       │   DRF REST API     │
                                       │ (tarix, hisobot,   │
                                       │  CRUD)              │
                                       └─────────┬─────────┘
                                                 │
                              ┌──────────────────┴──────────────────┐
                              │                                      │
                    ┌─────────▼─────────┐                 ┌─────────▼─────────┐
                    │  React Dashboard   │ ◄──WebSocket──► │   Real-time Alert  │
                    │  (Business panel)  │   (live push)   │   Pop-up tizimi     │
                    └─────────────────────┘                 └─────────────────────┘
```

---

## 4. Foydalanuvchi rollari (SaaS model)

| Rol | Kirish huquqi | Asosiy ekran |
|---|---|---|
| **Free / Individual** | Faqat o'z qurilmasi | Shaxsiy statistika, tarix |
| **Business** | Barcha o'z fleet'i | To'liq dispetcher dashboard (xarita, ro'yxat, alert) |
| **Admin** | Barcha foydalanuvchilar | Tizim monitoring, billing ko'rinishi |

Ro'yxatdan o'tishda (`Register`) foydalanuvchi rolni tanlaydi — bu UI darajasida ko'rsatiladi, haqiqiy to'lov integratsiyasi hackathon doirasida shart emas.

---

## 5. Dizayn yo'nalishi

### 5.1. Umumiy uslub

**Yo'nalish**: Zamonaviy "command center" estetikasi — avtomobil sanoati va logistika dasturlari (Tesla fleet, Samsara, Geotab) uslubiga yaqin, lekin o'ziga xos rang sxemasi bilan. Generic "dashboard template" ko'rinishidan qochish — bu hakamlarga darhol sezilib qoladi.

**Signature element**: Markazda joylashgan **"Risk Pulse"** — har bir haydovchi kartasi ustida nafas oluvchi (pulse) indikator, real-time alarm darajasiga qarab rangi va tezligi o'zgaradi. Bu — DIGITORA'ning vizual identifikatori, hech bir boshqa dashboard'da yo'q signature detal.

### 5.2. Rang palitasi

**Tungi rejim (asosiy, default)**:
| Nomi | Hex | Vazifa |
|---|---|---|
| Background | `#0A0E14` | Asosiy fon, deep navy-black |
| Surface | `#131A24` | Kartalar, panellar |
| Surface elevated | `#1C2531` | Modal, dropdown |
| Border | `#2A3441` | Ajratuvchi chiziqlar |
| Accent (Digitora Orange) | `#E8762C` | Brend rangi, asosiy CTA |
| Safe (Normal) | `#3DDC84` | Level 0 |
| Caution (Chalg'ish) | `#F2C94C` | Level 1 |
| Warning (Mikro-uyqu) | `#FF8A3D` | Level 2 |
| Danger (Mutlaq xavf) | `#FF4757` | Level 3 |
| Text primary | `#E8EDF4` | Asosiy matn |
| Text muted | `#7C8B9C` | Ikkinchi darajali matn |

**Kunduzgi rejim**:
| Nomi | Hex | Vazifa |
|---|---|---|
| Background | `#F7F8FA` | Asosiy fon |
| Surface | `#FFFFFF` | Kartalar |
| Border | `#E2E6EB` | Chiziqlar |
| Accent | `#D85F1C` | Brend rangi (biroz to'qroq, kontrast uchun) |
| Text primary | `#171A1F` | Asosiy matn |
| Text muted | `#5C6670` | Ikkinchi darajali matn |

Safe/Caution/Warning/Danger ranglari ikkala rejimda ham bir xil qoladi (xavfsizlik ranglarini o'zgartirish noto'g'ri — bu universal til bo'lishi kerak).

### 5.3. Tipografiya

| Rol | Shrift | Vazifa |
|---|---|---|
| Display (sarlavhalar) | **Space Grotesk** | Texnik, zamonaviy, "instrument panel" hissi |
| Body (matn) | **Inter** | O'qish uchun eng toza, ko'p tillilikni (UZ/EN/KO) yaxshi qo'llaydi |
| Mono (raqamlar, ID) | **JetBrains Mono** | GPS koordinatalar, device ID, vaqt — "data" hissi beradi |

### 5.4. Layout konsepsiyasi

```
┌────────────────────────────────────────────────────────────┐
│  LOGO   Qidirish          [Til] [Tema] [Bildirishnoma] [User]│
├──────────┬─────────────────────────────────────┬────────────┤
│          │                                     │            │
│  Sidebar │      Live Xarita (markaz, katta)    │  Faol      │
│  - Fleet │                                     │  Alertlar  │
│  - Tarix │                                     │  paneli    │
│  - Hisob │                                     │            │
│          ├─────────────────────────────────────┤            │
│          │   Haydovchilar ro'yxati (kartalar)  │            │
│          │   [Risk Pulse] [Ism] [Status] [GPS]  │            │
└──────────┴─────────────────────────────────────┴────────────┘
```

Pop-up alert — markazda, modal sifatida, Level 3 hodisada **ekranni qisman to'sib**, e'tiborni majburiy tortadi (dispetcher e'tiborsiz qoldira olmasligi kerak).

### 5.5. Motion / Animatsiya

- **Risk Pulse**: CSS animatsiya, alarm darajasiga qarab tezlashadi (Level 0 — sokin, Level 3 — tez, nervous pulse)
- **Pop-up kirishi**: scale + fade, 200ms, e'tiborni tortadigan lekin keskin bo'lmagan
- **Xarita marker yangilanishi**: smooth transition, "sakrash" emas, oqim kabi harakat
- Ortiqcha animatsiyadan saqlanish — har bir harakat ma'noli bo'lishi kerak (skill qoidasi)

---

## 6. Ko'p tillilik (i18n)

| Til | Kod | Maqsad auditoriya |
|---|---|---|
| O'zbek | `uz` | Asosiy mahalliy bozor, default til |
| Ingliz | `en` | Xalqaro hakamlar, KOICA dasturi |
| Koreys | `ko` | KOICA (Koreya hamkorligi dasturi) — muhim, chunki dastur Koreya ODA dasturi doirasida |

`react-i18next` orqali amalga oshiriladi, til almashtirish — header'da bayroq/dropdown ko'rinishida, foydalanuvchi tanlovi `localStorage`'da saqlanadi.

---

## 7. Asosiy sahifalar / ekranlar

| Sahifa | Tavsif | Ustuvorlik |
|---|---|---|
| **Login / Register** | Rol tanlash (Free/Business), til tanlash | Yuqori |
| **Business Dashboard** | Xarita + ro'yxat + real-time alert | **Eng yuqori** (Field Mission talabi) |
| **Driver Detail** | Bitta haydovchining batafsil tarixi, grafiklar | O'rta |
| **Alert History** | O'tgan hodisalar jurnali, filtrlash | O'rta |
| **Free / Individual Panel** | Soddalashtirilgan shaxsiy ko'rinish | Past |
| **Admin Panel** | Tizim holati, foydalanuvchilar ro'yxati | Past |
| **Settings** | Til, tema, profil | Past |

---

## 8. Real-time ma'lumot oqimi

```
Jetson → WebSocket → Django Channels → Redis → barcha ulangan dashboard'lar

JSON paket namunasi:
{
  "device_id": "DGT-001",
  "driver_name": "Shamshod",
  "timestamp": "2026-06-30T14:32:05Z",
  "alarm_level": 2,
  "alarm_msg": "MIKRO-UYQU! Ko'z yumiq (5s)",
  "perclos": 0.42,
  "gps": { "lat": 39.654, "lon": 66.975, "speed": 62.0 },
  "cabin": { "temp": 27.5, "humidity": 48 }
}
```

Level 2/3 paketlar **darhol** push qilinadi, Level 0/1 esa 5-10s intervalda (trafikni tejash uchun).

---

## 9. Loyihalash bosqichlari (taxminiy tartib)

1. **Backend skeleton** — Django loyihasi, model (`Device`, `Driver`, `AlertEvent`, `User`), Docker-compose (Django + PostgreSQL + Redis)
2. **WebSocket consumer** — Jetson'dan qabul qilish, Redis orqali tarqatish
3. **DRF API** — autentifikatsiya, tarix so'rovlari, CRUD
4. **React skeleton** — Vite loyihasi, routing, i18n, tema tizimi (dark/light)
5. **Dashboard UI** — xarita, ro'yxat, Risk Pulse komponenti
6. **Pop-up Alert tizimi** — WebSocket eventga bog'langan modal
7. **Driver Detail + grafiklar** — Recharts integratsiyasi
8. **Jetson integratsiyasi** — `jetson.py` ga WebSocket client qo'shish
9. **Demo repetitsiyasi** — lokal tarmoqda to'liq oqimni sinash
10. **VPS deploy** — Docker-compose orqali production'ga chiqarish

---

## 10. Hal qilinishi kerak bo'lgan ochiq savollar

- [ ] Xarita provayderi: Mapbox (chiroyli, lekin API key kerak) yoki Leaflet + OpenStreetMap (bepul, sodda)?
- [ ] Device autentifikatsiyasi: hozircha oddiy `device_id`, keyinroq token-based xavfsizlikka o'tish rejalashtirilgan
- [ ] Snapshot-rasm funksiyasi (Level 3 alertda kamera kadri saqlash) — birinchi bosqichda kiritilmaydi, vaqt qolsa qo'shiladi

---

*Hujjat versiyasi: 1.0 — Hackathon tayyorgarlik bosqichi*
