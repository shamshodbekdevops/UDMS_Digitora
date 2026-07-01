# DIGITORA DMS — Add Live Camera Feed (MJPEG Relay)

## What's already working
- Jetson sends WebSocket packets (alarm_level, perclos, gps) ✅
- Dashboard shows real-time data ✅
- Jetson now also sends JPEG frames via HTTP POST to:
  `POST http://45.130.164.189:8000/api/video-frame/DGT-002/upload/`
  Body: `{ "frame": "<base64 JPEG>", "device_id": "DGT-002" }`

## What's missing
- Backend has no `/api/video-frame/` endpoint yet ❌
- Dashboard has no live camera component yet ❌

## Your job: add ONLY these two things. Do NOT touch anything else.

---

## PART 1 — Backend (Django)

### Step 1: Add django-redis to requirements if not present
In `requirements.txt`, make sure this line exists:
```
django-redis
```

### Step 2: Make sure Redis cache is configured in settings
In `backend/config/settings.py` (or wherever settings are), confirm
or add:
```python
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": os.getenv("REDIS_URL", "redis://redis:6379/0"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}
```

### Step 3: Create the video frame views
Create a new file `apps/dms/views_video.py`:

```python
import base64
import time
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['POST', 'OPTIONS'])
@permission_classes([AllowAny])
def upload_frame(request, device_id):
    """Jetson POSTs JPEG frame here every 250ms."""
    if request.method == 'OPTIONS':
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    frame_b64 = request.data.get('frame')
    if not frame_b64:
        return Response({'error': 'No frame'}, status=400)

    cache.set(f'vframe:{device_id}', frame_b64, timeout=5)
    cache.set(f'vframe_ts:{device_id}', time.time(), timeout=5)
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([AllowAny])
def get_frame(request, device_id):
    """Dashboard polls this every 200ms to get the latest frame."""
    frame_b64 = cache.get(f'vframe:{device_id}')
    ts = cache.get(f'vframe_ts:{device_id}')

    if not frame_b64:
        return Response({'frame': None, 'online': False})

    age = time.time() - (ts or 0)
    return Response({
        'frame': frame_b64,
        'online': age < 3.0,
        'age_ms': int(age * 1000),
    })
```

### Step 4: Register the URL routes
Find the main DMS urls file (`apps/dms/urls.py` or similar).
Add these two routes:

```python
from .views_video import upload_frame, get_frame

# Add to urlpatterns:
path('video-frame/<str:device_id>/upload/', upload_frame),
path('video-frame/<str:device_id>/', get_frame),
```

Make sure the prefix matches — the full URLs should be:
- `POST /api/video-frame/DGT-002/upload/`
- `GET  /api/video-frame/DGT-002/`

### Step 5: Add CORS headers for video endpoints
In Django settings, add the video-frame URLs to CORS allowed list,
or simply confirm `CORS_ALLOW_ALL_ORIGINS = True` is set
(acceptable for hackathon).

---

## PART 2 — Frontend (React)

### Step 1: Create LiveCameraFeed component
Create `frontend/src/components/LiveCameraFeed.tsx`:

```tsx
import { useEffect, useRef, useState, useCallback } from 'react';

interface Props {
  deviceId: string;
  alarmLevel?: number;
  className?: string;
}

export function LiveCameraFeed({ deviceId, alarmLevel = 0, className }: Props) {
  const [frame, setFrame]   = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const timerRef            = useRef<ReturnType<typeof setInterval>>();
  const failCount           = useRef(0);

  const API = import.meta.env.VITE_API_URL ?? 'http://45.130.164.189:8000';

  const fetchFrame = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/video-frame/${deviceId}/`, {
        signal: AbortSignal.timeout(800),
      });
      const data = await res.json();
      if (data.frame) {
        setFrame(data.frame);
        setOnline(data.online ?? true);
        failCount.current = 0;
      } else {
        setOnline(false);
      }
    } catch {
      failCount.current += 1;
      if (failCount.current > 3) setOnline(false);
    }
  }, [API, deviceId]);

  useEffect(() => {
    fetchFrame();
    timerRef.current = setInterval(fetchFrame, 250);
    return () => clearInterval(timerRef.current);
  }, [fetchFrame]);

  const borderCol =
    alarmLevel >= 3 ? 'var(--danger)'
    : alarmLevel === 2 ? 'var(--warning)'
    : alarmLevel === 1 ? 'var(--caution)'
    : 'var(--border)';

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        border: `2px solid ${borderCol}`,
        background: 'var(--surface)',
        aspectRatio: '4/3',
        transition: 'border-color 0.3s',
      }}
    >
      {frame ? (
        <img
          src={`data:image/jpeg;base64,${frame}`}
          alt="Jonli kamera"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          decoding="async"
        />
      ) : (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 8, color: 'var(--text-muted)',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5">
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            <line x1="1" y1="1" x2="23" y2="23"
              stroke="var(--danger)" strokeWidth="1.5"/>
          </svg>
          <span style={{ fontSize: 13 }}>Kamera oflayn</span>
        </div>
      )}

      {/* LIVE / OFFLINE badge */}
      <div style={{
        position: 'absolute', top: 8, right: 8,
        padding: '2px 8px', borderRadius: 20,
        fontSize: 11, fontWeight: 700,
        background: online
          ? 'rgba(61,220,132,0.15)'
          : 'rgba(255,71,87,0.15)',
        color: online ? 'var(--safe)' : 'var(--danger)',
        border: `1px solid ${online ? 'var(--safe)' : 'var(--danger)'}`,
        backdropFilter: 'blur(8px)',
        letterSpacing: '0.5px',
      }}>
        {online ? '● LIVE' : '○ OFFLINE'}
      </div>

      {/* Red banner when alarm level 3 */}
      {alarmLevel >= 3 && online && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '6px 12px',
          background: 'rgba(255,71,87,0.85)',
          backdropFilter: 'blur(4px)',
          color: '#fff', fontSize: 12, fontWeight: 700,
          textAlign: 'center', letterSpacing: '0.5px',
        }}>
          ⚠ XAVF ANIQLANDI
        </div>
      )}
    </div>
  );
}
```

### Step 2: Add to Driver Detail page
In the Driver Detail page (`/drivers/:id` or similar), import and add:

```tsx
import { LiveCameraFeed } from '@/components/LiveCameraFeed';

// Place this at the top of the driver detail content,
// above or beside the PERCLOS chart:
<LiveCameraFeed
  deviceId={device.device_id}
  alarmLevel={device.alarm_level ?? 0}
/>
```

### Step 3: Add small thumbnail to Dashboard driver cards
In the driver card component in the main dashboard, add a small
thumbnail version (optional but impressive for demo):

```tsx
<LiveCameraFeed
  deviceId={device.device_id}
  alarmLevel={device.alarm_level ?? 0}
  className="driver-card-camera"
/>
```

Add to CSS / Tailwind:
```css
.driver-card-camera {
  width: 100%;
  max-height: 140px;
  margin-bottom: 8px;
}
```

---

## PART 3 — Deploy

After making ALL changes above:

```bash
# On laptop:
git add .
git commit -m "feat: live camera MJPEG relay via server"
git push origin main

# On server (SSH):
cd /root/UDMS_Digitora
git pull origin main
docker compose up -d --build
```

Check it works:
```bash
# Should return {"frame": null, "online": false} when Jetson is off:
curl http://45.130.164.189:8000/api/video-frame/DGT-002/

# Should return {"frame": "<base64>", "online": true} when Jetson is running:
# Start jetson.py, wait 2 seconds, then curl again
```

---

## IMPORTANT RULES

1. Do NOT modify any existing views, models, or components
2. Do NOT change WebSocket logic
3. Do NOT change any existing URL routes — only ADD new ones
4. The video feed failing must never crash the dashboard —
   it should just show "Kamera oflayn" gracefully
5. Complete Part 1 first and confirm the API works with curl,
   then do Part 2