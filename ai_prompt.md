# DIGITORA DMS — Production Deploy Prompt

## CONTEXT

The project is a full-stack DMS (Driver Monitoring System) dashboard:
- Backend: Django + DRF + Channels + PostgreSQL + Redis (already running on VPS)
- Frontend: React + Vite + TypeScript (currently only runs locally)
- VPS IP: 45.130.164.189 (Kamatera, Singapore, Ubuntu 22.04)
- Backend is accessible at: http://45.130.164.189:8000
- Django admin works at: http://45.130.164.189:8000/admin/

The problem: Frontend only runs locally on the developer's laptop.
Goal: Make the full app (frontend + backend) accessible at
http://45.130.164.189 from ANY device on ANY network.

---

## CURRENT PROJECT STRUCTURE

```
UDMS_Digitora/
├── docker-compose.yml        ← currently has: db, redis, backend
├── .env                      ← already on server
├── backend/                  ← Django app
│   ├── Dockerfile
│   ├── requirements.txt
│   └── ...
└── frontend/                 ← React + Vite (NOT yet in docker-compose)
    ├── package.json
    ├── vite.config.ts        ← has proxy to localhost:8000
    ├── .env                  ← only has VITE_STREAM_BASE_URL=http://localhost:8080
    └── src/
```

Current `vite.config.ts` proxy (dev only, not used in production build):
```ts
proxy: {
  "/api": { target: "http://localhost:8000" },
  "/ws":  { target: "ws://localhost:8000", ws: true }
}
```

---

## WHAT YOU NEED TO DO

### STEP 1 — Create frontend environment files

Create `frontend/.env.production` with:
```
VITE_API_URL=http://45.130.164.189:8000
VITE_WS_URL=ws://45.130.164.189:8000
VITE_STREAM_BASE_URL=http://45.130.164.189:8080
```

Create `frontend/.env.development` (keep local dev working):
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_STREAM_BASE_URL=http://localhost:8080
```

### STEP 2 — Fix API/WebSocket URLs in frontend code

Search ALL frontend source files (`src/`) for hardcoded:
- `localhost:8000`
- `ws://localhost`
- `http://localhost`

Replace ALL of them with the environment variables:
- `import.meta.env.VITE_API_URL` for HTTP API calls
- `import.meta.env.VITE_WS_URL` for WebSocket connections
- `import.meta.env.VITE_STREAM_BASE_URL` for WebRTC video stream

Do NOT miss any hardcoded URLs — check every file in `src/`.

### STEP 3 — Create Nginx config for frontend serving

Create `nginx/nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name 45.130.164.189;
        root /usr/share/nginx/html;
        index index.html;

        # React SPA — all routes go to index.html
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Proxy API requests to Django backend
        location /api/ {
            proxy_pass http://backend:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Proxy WebSocket to Django Channels
        location /ws/ {
            proxy_pass http://backend:8000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_read_timeout 86400;
        }

        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### STEP 4 — Create frontend Dockerfile

Create `frontend/Dockerfile`:
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ../nginx/nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### STEP 5 — Update docker-compose.yml

Add `frontend` and `nginx` services to the existing `docker-compose.yml`.
Keep ALL existing services (db, redis, backend) UNCHANGED.
Only ADD these new services:

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: digitora-frontend
    restart: unless-stopped
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    container_name: digitora-nginx
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - frontend
      - backend
```

Also update the `backend` service to remove the direct port exposure
(since Nginx will proxy to it, we don't want port 8000 exposed directly
to the internet — only Nginx's port 80 should be public).
Change in backend service:
```yaml
# Remove or comment out:
# ports:
#   - "8000:8000"
# Keep it accessible within Docker network only (no ports: needed)
```

IMPORTANT: Port 8000 should still work for direct access during
transition — so keep `ports: ["8000:8000"]` for now, remove later.

### STEP 6 — Update ALLOWED_HOSTS in .env

The `.env` file on the server currently has:
```
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0,45.130.164.189
```

This is correct. But also check `backend/config/settings.py` or
wherever `ALLOWED_HOSTS` is defined — make sure it reads from the
environment variable, not hardcoded.

### STEP 7 — Add CORS settings for production

In Django settings, ensure `CORS_ALLOWED_ORIGINS` includes the
server IP. If using `django-cors-headers`, add:
```python
CORS_ALLOWED_ORIGINS = [
    "http://45.130.164.189",
    "http://45.130.164.189:8000",
    "http://localhost:5173",  # keep for local dev
    "http://localhost:3000",
]
```

Or use `CORS_ALLOW_ALL_ORIGINS = True` for hackathon (simpler).

### STEP 8 — Git push and server deploy commands

After making ALL the above changes, do the following:

**On the developer's laptop:**
```bash
git add .
git commit -m "feat: production deploy setup - nginx, docker, env"
git push origin main
```

**Then provide the exact commands to run on the server
(via SSH at 45.130.164.189):**
```bash
cd /root/UDMS_Digitora
git pull origin main
docker compose down
docker compose up -d --build
```

**Verify everything works:**
```bash
docker compose ps
docker compose logs nginx --tail=20
docker compose logs frontend --tail=20
docker compose logs backend --tail=20
```

### STEP 9 — Final verification

After deploy, these URLs should work:
- `http://45.130.164.189` → React dashboard (main app)
- `http://45.130.164.189/api/` → Django REST API
- `ws://45.130.164.189/ws/dms/` → WebSocket (for Jetson + dashboard)
- `http://45.130.164.189:8000/admin/` → Django admin (keep working)

---

## IMPORTANT NOTES

1. Do NOT break the existing backend — it's already running on the
   server and receiving WebSocket data from the Python DMS script.

2. The `windows.py` and `jetson.py` scripts connect to:
   `WS_HOST = "45.130.164.189"` on port `8000`
   This should keep working (don't remove port 8000 from backend).

3. After this deploy, ANY device (phone, tablet, laptop) connected
   to ANY network (WiFi, 4G, hotspot) can open:
   `http://45.130.164.189`
   and see the full real-time dashboard.

4. For the hackathon demo: the judges can open the dashboard on their
   own phones/laptops by simply visiting `http://45.130.164.189`
   — no local network, no special setup required.

---

Start with Step 1 and proceed through all steps in order.
After completing each step, confirm before moving to the next.