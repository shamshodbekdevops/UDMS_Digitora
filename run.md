# DIGITORA UDMS — Ishga tushirish

## Talablar (bir marta o'rnatiladi)

| Dastur | Versiya | Tekshirish |
|--------|---------|-----------|
| Docker Desktop | 24+ | `docker --version` |
| Node.js | 18+ | `node --version` |
| Python | 3.10+ | `python --version` |

---

## Birinchi marta ishga tushirish

### 1. Backend — Docker (PostgreSQL + Redis + Django)

```powershell
docker-compose up --build -d
```

> Build ~2 daqiqa oladi. Kutib turing.
> `DEBUG=True` bo'lsa backend avtomatik `--reload` bilan qayta yuklanadi.

### 2. Migration va seed data (faqat birinchi marta)

```powershell
# Barcha jadvallarni yaratish
docker-compose run --rm backend python manage.py makemigrations accounts dms
docker-compose run --rm backend python manage.py migrate

# Mock data ni tozalab, 2 ta real qurilma yaratish
docker-compose run --rm backend python manage.py seed_data
```

### 3. Frontend — npm

```powershell
cd frontend
npm install
npm run dev
```

### 4. Jetson live sender — venv (ixtiyoriy)

Real WebSocket data uchun (backend WS ga ulanadi va DB ga saqlaydi):

```powershell
# Root papkada (bir marta)
python -m venv .venv
.venv\Scripts\pip install -r requirements-mock.txt

# Har safar ishga tushirish uchun
.venv\Scripts\python jetson.py
```

---

## Keyingi safar ishga tushirish

```powershell
# 1. Backend (agar to'xtagan bo'lsa)
docker-compose up -d

# 2. Frontend (yangi terminal)
cd frontend
npm run dev

# 3. Jetson sender (yangi terminal, ixtiyoriy)
.venv\Scripts\python jetson.py
```

---

## URL manzillar

| Xizmat | URL |
|--------|-----|
| Dashboard (frontend) | http://localhost:5173 |
| Django API | http://localhost:8000/api/ |
| Django Admin | http://localhost:8000/admin/ |
| WebSocket | ws://localhost:8000/ws/dms/ |

---

## Login

| Foydalanuvchi | Parol | Roli |
|---------------|-------|------|
| `dispatcher` | `Admin1234!` | business (2 ta qurilma) |
| `admin` | `Admin1234!` | superuser (admin panel) |

---

## Foydali Docker buyruqlar

```powershell
# Container holatini ko'rish
docker-compose ps

# Backend log'larini kuzatish
docker-compose logs -f backend

# Hammasini to'xtatish
docker-compose stop

# Hammasini o'chirish (DB saqlanadi)
docker-compose down

# DB ni ham o'chirish (qayta boshlash)
docker-compose down -v
```

---

## Muammo yechimlari

**Backend restart qilmoqda?**
```powershell
docker-compose run --rm backend python manage.py makemigrations
docker-compose run --rm backend python manage.py migrate
docker-compose restart backend
```

**Port band?**
```powershell
# 8000-portni kim ishlatyapti
netstat -ano | findstr :8000
```

**Frontend dependency xato?**
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
npm install
```
