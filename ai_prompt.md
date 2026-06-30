# DIGITORA DMS Dashboard — Claude Code Prompt

> Bu faylni Claude Code (yoki Cursor) ga to'liq nusxalab bering.
> Loyiha katta bo'lgani uchun, AI'dan **bosqichma-bosqich** ishlashni so'rang —
> pastdagi "Ishlash tartibi" bo'limidagi har bir bosqichni alohida xabar
> sifatida yuborish tavsiya etiladi (bittada hammasini so'ramang).

---

## LOYIHA KONTEKSTI

Men **DIGITORA UDMS** — Driver Monitoring System uchun real-time fleet
management dashboard qurmoqchiman. Bu tizim yuk mashinalaridagi Jetson
Nano qurilmasidan (kamera + AI orqali haydovchi charchog'ini aniqlaydi)
ma'lumot oladi va buni dispetcherlarga real-time ko'rsatadi.

Bu **hackathon loyihasi** (KOICA ODA Program), asosiy baholanadigan qism —
**dashboard dizayni va UX**. Shuning uchun vizual sifat va real-time
funksionallik eng muhim ustuvorlik.

To'liq texnik va dizayn talablari quyida — har bir bo'limni diqqat bilan
o'qib, ko'rsatmalarga qat'iy amal qiling.

---

## TEXNOLOGIK STACK (qat'iy, o'zgartirmang)

**Backend:**
- Django + Django REST Framework
- Django Channels (WebSocket, Redis backend orqali)
- PostgreSQL
- Docker + docker-compose

**Frontend:**
- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion (animatsiya va mikro-interaksiyalar uchun — pastdagi
  "Maxsus effektlar" bo'limida batafsil)
- Recharts (grafiklar uchun)
- Leaflet + react-leaflet (xarita, OpenStreetMap — Mapbox API key talab
  qilmaydigan variant)
- react-i18next (3 til: uz, en, ko)
- Zustand (global state)
- native WebSocket API (Socket.IO emas — Django Channels bilan to'g'ridan
  to'g'ri ishlaydi)

---

## MA'LUMOTLAR MODELI

Quyidagi Django modellarini yarating:

```
Device
  - device_id (CharField, unique, masalan "DGT-001")
  - driver_name (CharField)
  - vehicle_plate (CharField)
  - owner (ForeignKey User)
  - is_active (Boolean)
  - created_at

AlertEvent
  - device (ForeignKey Device)
  - alarm_level (IntegerField, 0-3)
  - alarm_msg (TextField)
  - perclos (FloatField)
  - gps_lat, gps_lon, gps_speed (FloatField, nullable)
  - cabin_temp, cabin_humidity (FloatField, nullable)
  - timestamp (DateTimeField, auto_now_add)

LiveStatus
  - device (OneToOneField Device)
  - alarm_level (IntegerField)
  - last_seen (DateTimeField)
  - gps_lat, gps_lon, gps_speed (FloatField, nullable)
  - perclos (FloatField)
  -- Bu jadval har doim "hozirgi holat"ni saqlaydi, dashboard ochilganda
     darhol shu yerdan dastlabki holat yuklanadi (WebSocket ulanguncha
     bo'sh ekran ko'rsatmaslik uchun)

User (Django built-in User'ni AbstractUser orqali kengaytiring)
  - role (CharField, choices: "free", "business", "admin")
  - company_name (CharField, nullable, faqat business uchun)
```

---

## RANG PALITASI VA VIZUAL KONSEPSIYA

Bu loyihaning eng muhim qismi — ranglar va effektlar **shablon emas,
o'ziga xos** bo'lishi shart. Quyidagi ikkita rejim butunlay boshqa
hissiyot beradi, lekin bir xil darajada professional.

### TUNGI REJIM — "Galaktika" (DEFAULT)

Konsepsiya: chuqur kosmik fon, yulduzlar, nebula-uslubidagi gradient
dog'lar, shisha-effekt (glassmorphism) panellar. Bu — oddiy "dark mode"
emas, balki **kosmik boshqaruv markazi** hissi.

```
--bg-deep:         #05060F   (eng chuqur fon, asosiy canvas)
--bg-nebula-1:     radial-gradient(ellipse at 20% 0%, #1B1542 0%, transparent 50%)
--bg-nebula-2:     radial-gradient(ellipse at 80% 100%, #0E2A4A 0%, transparent 50%)
--surface:         rgba(20, 22, 38, 0.65)   (glassmorphism panel, backdrop-blur bilan)
--surface-elevated:rgba(28, 30, 50, 0.78)
--border:          rgba(138, 148, 255, 0.15)
--border-glow:     rgba(138, 148, 255, 0.4)  (hover holatda)
--accent:          #E8762C   (Digitora Orange, brend rangi o'zgarmaydi)
--star-dim:        rgba(255, 255, 255, 0.4)
--star-bright:     rgba(255, 255, 255, 0.9)
--safe:            #3DDC84
--caution:         #F2C94C
--warning:         #FF8A3D
--danger:          #FF4757
--text-primary:    #EDEFFC
--text-muted:      #8A8FB5
```

**Galaktika fon qatlamlari** (z-index tartibida, eng orqadan oldinga):
1. `--bg-deep` — qattiq fon rangi
2. Ikkita `radial-gradient` nebula dog'i (binafsha va ko'k), sokin
   "drift" animatsiyasi bilan (40s+ davr, deyarli sezilmas harakat)
3. CSS yoki Canvas orqali yaratilgan **yulduzlar qatlami** — kichik
   nuqtalar, ba'zilari sekin `twinkle` (yorqinlik pulsatsiyasi) bilan
4. Asosiy UI kontent — barcha panellar `backdrop-filter: blur(20px)`
   bilan **shisha effekti**da, orqadagi nebula/yulduzlar ko'rinib turadi

### KUNDUZGI REJIM — "Atmosfera" (havorang, oq, ko'k)

Konsepsiya: ochiq, toza, havo va bulut hissi beruvchi — lekin sovuq
klinik oq emas, **iliq-havo** uyg'unligi.

```
--bg-sky:          linear-gradient(180deg, #EAF4FF 0%, #F7FBFF 60%, #FFFFFF 100%)
--surface:         rgba(255, 255, 255, 0.85)   (yengil shisha effekti bu yerda ham)
--surface-elevated:#FFFFFF
--border:          #D6E7F7
--border-glow:     #A9CCEF
--accent:          #2B6FE0   (kunduzgi rejimda accent ko'kka almashadi,
                              Digitora Orange faqat logo/brend belgisida qoladi)
--accent-warm:     #D85F1C   (logo va brend uchun saqlanadi)
--safe:            #1FAE6E
--caution:         #D9A300
--warning:         #E06A1F
--danger:          #E0383F
--text-primary:    #14202E
--text-muted:      #5A7088
```

Kunduzgi rejimda fon — yumshoq tepadan-pastga gradient (osmon hissi),
panellar yengil soyalar (`box-shadow: 0 4px 24px rgba(43,111,224,0.08)`)
bilan "suzib turgan" ko'rinishda.

### Tailwind sozlash

CSS variable'larni `:root` va `.dark` selektorlarida belgilang,
`darkMode: 'class'` strategiyasi bilan. Nebula gradient va yulduz
qatlamini alohida `<div className="cosmic-bg">` komponent sifatida,
asosiy layout orqasida `position: fixed; inset: 0; z-index: -1` bilan
joylashtiring.

---

## MAXSUS EFFEKTLAR (UI/UX kuchaytirish — eng muhim baholanadigan qism)

Quyidagi effektlar — dashboard'ni "AI yaratgan shablon" emas, **qo'lda
ishlangan professional mahsulot** darajasiga olib chiqadi. Hammasini
albatta qo'shing, hech birini tushirib qoldirmang:

1. **Glassmorphism panellar** (tungi rejim): har bir karta, sidebar,
   modal — `backdrop-filter: blur(20px) saturate(140%)`,
   yarim-shaffof fon, nozik border-glow. Orqada nebula ko'rinib turadi.

2. **Yulduzlar parallaks effekti**: sichqoncha harakatlanganda fon
   yulduzlari juda sekin, deyarli sezilmas tarzda qarshi yo'nalishda
   siljiydi (`transform: translate()`, mouse position'ga bog'liq,
   `requestAnimationFrame` orqali silliq).

3. **Risk Pulse + Glow halqasi**: avval tasvirlangan pulse indikator,
   endi qo'shimcha — Level 2/3 da atrofida `box-shadow` orqali
   **tarqaluvchi nur halqasi** (radar effekti kabi, `@keyframes`
   bilan kengayib-xiralashib boruvchi halqa).

4. **Xarita marker — "radar ping"**: GPS xaritada har bir faol
   qurilma markeri atrofida, xuddi radar ekranidagi kabi, davriy
   tarqaluvchi halqa animatsiyasi (`scale` + `opacity` fade).

5. **Raqamlarning "count-up" animatsiyasi**: PERCLOS foizi, statistika
   raqamlari o'zgarganda, eski qiymatdan yangisiga **silliq sanab
   o'tadi** (0'dan emas, joriy qiymatdan), oddiy `requestAnimationFrame`
   counter orqali — sakrab o'zgarish emas.

6. **Skeleton loading holati**: ma'lumot hali kelmagan paytda, oddiy
   "Loading..." emas, **shimmer effektli** skeleton blocklar (gradient
   chap-o'ngga siljiydigan, glassmorphism uslubida).

7. **Level 3 Alert modal kirishi**: oddiy fade emas — markazdan
   "expand" (`scale(0.85)` → `scale(1)`, `cubic-bezier` overshoot
   bilan, 280ms), fon **qorong'ilashadi va blur** oladi
   (`backdrop-filter: blur(8px)`), va modal atrofida qisqa, bir
   martalik "pulse ring" o'tadi (e'tiborni tortish uchun).

8. **Tema almashtirish o'tishi**: dark↔light almashtirilganda, butun
   sahifa darhol o'zgarmasin — barcha rang xususiyatlariga
   `transition: background-color 400ms, border-color 400ms` qo'shing,
   silliq o'tish hissi uchun.

9. **Sidebar faol element indikatori**: tanlangan menyu punkti
   yonida, vertikal chiziq emas, balki **siljib boruvchi accent
   "blob"** (`layoutId` yoki shunga o'xshash, Framer Motion bilan
   amalga oshirilishi mumkin — agar loyihaga Framer Motion qo'shsangiz,
   bu effekt uchun ayni mos).

10. **Mikro-interaksiyalar**: tugmalar bosilganda `scale(0.97)`,
    kartalar hover qilinganda `translateY(-2px)` + border-glow
    kuchayishi — barchasi 150-200ms, sezilarli lekin keskin bo'lmagan.

**Kutubxona tavsiyasi**: yuqoridagi effektlarning katta qismi uchun
**Framer Motion** (`framer-motion`) qo'shing — bu React'da animatsiya
uchun standart, professional vosita, qo'lda CSS keyframes yozishdan
ko'ra ishonchliroq natija beradi.

---

## TIPOGRAFIYA

- Display/sarlavhalar: **Space Grotesk** (Google Fonts)
- Body matn: **Inter** (Google Fonts)
- Raqamlar/ID/koordinatalar: **JetBrains Mono** (Google Fonts)

---

## SIGNATURE VIZUAL ELEMENT: "Risk Pulse"

Bu loyihaning eng muhim, o'ziga xos UI elementi — uni alohida e'tibor
bilan yarating (yuqoridagi "Maxsus effektlar" bo'limidagi 3-band bilan
birga ishlaydi):

Har bir haydovchi kartasida, ismning yonida **nafas oluvchi (pulse)
doira indikator** bo'lishi kerak:
- Level 0: sokin, sekin pulse (2.5s davr), rangi `--safe`, glow yo'q
- Level 1: biroz tezroq (1.8s), rangi `--caution`, juda nozik glow
- Level 2: tezroq, sezilarli (1.0s), rangi `--warning`, o'rtacha glow
  halqasi
- Level 3: tez, nervous pulse (0.4s), rangi `--danger`, kuchli
  tarqaluvchi "radar" glow halqasi (2-3 qatlam, ketma-ket kechikish
  bilan kengayadi — `animation-delay` orqali)

CSS `@keyframes` orqali amalga oshiring, `animation-duration` ni
alarm_level'ga qarab inline style orqali dinamik o'zgartiring. Tungi
rejimda glow ranglar yorqinroq ko'rinadi (qora fonda neon hissi),
kunduzgi rejimda yumshoqroq, soya-asoslangan bo'lsin.

---

## LAYOUT STRUKTURASI

```
┌────────────────────────────────────────────────────────────┐
│ LOGO  [Qidiruv]      [Til▾][Tema☾][Bildirishnoma🔔][User▾]  │  ← Header
├──────────┬─────────────────────────────────────┬────────────┤
│ Sidebar  │                                     │  Faol      │
│ - Fleet  │      Live Xarita (Leaflet)          │  Alertlar  │
│ - Tarix  │      barcha qurilmalar GPS marker   │  paneli    │
│ - Hisobot│                                     │  (scroll)  │
│          ├─────────────────────────────────────┤            │
│          │  Haydovchilar ro'yxati (kartalar)   │            │
│          │  [Pulse][Ism][Status][PERCLOS][GPS] │            │
└──────────┴─────────────────────────────────────┴────────────┘
```

Level 3 alert kelganda — **markaziy modal** (shadcn/ui Dialog), ekranni
qisman to'sib, dispetcher e'tiborini majburiy tortadi. Modal: device
nomi, alarm matni, vaqt, GPS joylashuv, va "Ko'rdim / Tasdiqlash"
tugmasi.

---

## WEBSOCKET PROTOKOLI

Backend `ws://<host>/ws/dms/` consumer yarating:
- Jetson qurilmalar shu kanalga ulanib, JSON paket yuboradi
- Dashboard (React) ham shu kanalga ulanadi, faqat **tinglaydi**
  (broadcast)
- Backend har kelgan paketni: (1) `AlertEvent` jadvaliga yozadi, (2)
  `LiveStatus` ni yangilaydi, (3) barcha ulangan dashboard client'larga
  shu paketni qayta yuboradi (Channels group orqali)

JSON format:
```json
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

React tomonida: WebSocket ulanish uzilsa, avtomatik qayta ulanishga
harakat qiluvchi (`reconnect with backoff`) custom hook yarating
(`useWebSocket.ts`), chunki demo paytida tarmoq beqaror bo'lishi
mumkin — bu juda muhim, e'tiborsiz qoldirmang.

---

## FOYDALANUVCHI ROLLARI

- **Free**: faqat o'ziga tegishli `Device` ko'rinadi, soddalashtirilgan
  shaxsiy panel
- **Business**: o'ziga tegishli barcha `Device` lar (fleet), to'liq
  dashboard
- **Admin**: barcha foydalanuvchilar va qurilmalar

Login/Register sahifasida rol tanlash UI elementi bo'lsin (radio
button: "Shaxsiy foydalanuvchi" / "Biznes / Logistika kompaniyasi").
Haqiqiy to'lov integratsiyasi kerak emas — faqat "Business — $X/oy"
degan ko'rsatkich UI'da ko'rinsin.

---

## KO'P TILLILIK

3 til: `uz` (default), `en`, `ko`. `react-i18next` bilan. Header'da til
almashtirish dropdown'i (bayroq ikonkasi + til nomi). Barcha UI matni
(tugmalar, sarlavhalar, alert xabarlari) tarjima kalitlari orqali
yozilsin, hech qanday qattiq-kodlangan matn bo'lmasin.

---

## ISHLASH TARTIBI (Claude Code uchun bosqichlar)

Iltimos, loyihani quyidagi tartibda, **har bosqichni alohida tugatib**
qiling, keyingisiga o'tishdan oldin natijani menga ko'rsating:

1. **Backend skeleton**: Django loyihasi, yuqoridagi modellar,
   `docker-compose.yml` (Django + PostgreSQL + Redis xizmatlari)
2. **WebSocket consumer**: Django Channels consumer, routing, group
   broadcast logikasi
3. **DRF API**: autentifikatsiya (JWT yoki session), Device/AlertEvent
   uchun CRUD endpointlari, tarix so'rovlari uchun filtrlash
4. **React skeleton**: Vite + TypeScript loyihasi, Tailwind + shadcn/ui
   + Framer Motion o'rnatish, routing (`react-router-dom`), i18n
   sozlash
5. **Dizayn tizimi asosi**: bu bosqichni alohida, puxta bajaring —
   CSS variable'lar (ikkala rejim uchun), `cosmic-bg` fon komponenti
   (nebula + yulduzlar, parallaks bilan), tema almashtirish mexanizmi
   (Zustand + `localStorage`), glassmorphism baza klasslari. Bu
   bosqich tugagach, oddiy bo'sh sahifada fon va tema almashtirish
   to'g'ri ishlayotganini ko'rsating — keyingi bosqichlar shu
   asosga quriladi.
6. **Dashboard sahifasi**: Leaflet xarita (radar-ping markerlar
   bilan), haydovchilar ro'yxati (kartalar, Risk Pulse + glow bilan),
   WebSocket hook ulanishi, skeleton loading holatlari
7. **Pop-up Alert tizimi**: Level 3 kelganda modal ochiluvchi
   mexanizm (Framer Motion bilan expand+blur kirish effekti), ovozli
   signal (browser Audio API, ixtiyoriy)
8. **Driver Detail sahifasi**: bitta qurilma tarixi, Recharts orqali
   PERCLOS va alarm tarixi grafigi, count-up raqam animatsiyasi
9. **Login/Register**: rol tanlash, til tanlash, JWT autentifikatsiya
   bilan bog'lash — bu sahifa ham to'liq dizayn tizimidan foydalansin
   (oddiy forma emas)
10. **Polish**: responsive tekshiruv, barcha mikro-interaksiyalarni
    yakuniy sinash, xato xabarlari, performance tekshiruvi (glow/blur
    effektlari sekinlatmayotganini tasdiqlash)

---

## MUHIM ESLATMALAR

- Dizaynni **generic admin template** ko'rinishidan saqlang — bu
  hakamlar tomonidan baholanadigan asosiy mezon, shablon ko'rinish
  past ball oladi. "Maxsus effektlar" bo'limidagi barcha effektlar
  shu sababdan **majburiy**, ixtiyoriy emas.
- Har bir komponent **responsive** bo'lishi kerak (mobil ham), lekin
  asosiy demo desktop monitorda ko'rsatiladi — desktop tajribasi
  ustuvor.
- Animatsiyalar **maqsadli** bo'lishi kerak — har biri foydalanuvchi
  e'tiborini to'g'ri narsaga yo'naltirishi yoki holatni tushuntirishi
  kerak (masalan Risk Pulse — xavf darajasini "his qildiradi").
  Shunchaki bezak uchun animatsiya qo'shmang, lekin yuqorida
  sanalgan 10 ta maxsus effektning barchasi — funksional maqsadga
  ega, shuning uchun kiritilishi shart.
- Performance: glassmorphism (`backdrop-filter: blur()`) va yulduzlar
  qatlami ko'p elementda ishlatilsa GPU yukini oshiradi — yulduzlar
  qatlamini bitta fon komponentida markazlashtiring (har bir kartada
  emas), va `will-change: transform` dan ortiqcha foydalanmang.
- Real backend bo'lmasa ham frontend ishlay olishi uchun, boshlang'ich
  bosqichda **mock WebSocket data** generator yarating (test uchun,
  keyin haqiqiy backend bilan almashtiriladi).

Tayyor bo'lsangiz, 1-bosqichdan boshlang.
