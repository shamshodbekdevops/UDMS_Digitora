"""
DIGITORA DMS — Windows / Jetson Real-time Detection Script
===========================================================
Haydovchi holatini real vaqtda kuzatadi.
- Webcam orqali MediaPipe Face Mesh → PERCLOS hisoblash
- WebSocket orqali alarm paketlarini DIGITORA backend ga yuboradi
- aiortc orqali WebRTC video oqimini brauzerga uzatadi

O'rnatish:
    pip install -r requirements-windows.txt

Ishlatish:
    python windows.py [--device 0]  (0 = birinchi kamera)
"""

# ── Sozlanadigan konstantalar (deploy oldidan o'zgartiring) ─────────────────
DEVICE_ID  = "DGT-001"   # Backend DB dagi ro'yxatdan o'tgan qurilma ID si
VIDEO_PORT = 8080         # WebRTC signaling server porti (har Jetson uchun boshqacha)
WS_HOST    = "192.168.1.104"  # Django backend host
WS_PORT    = 8000         # Django backend port
# ─────────────────────────────────────────────────────────────────────────────

import argparse
import asyncio
import json
import math
import os
import sys
import threading
import time
import urllib.request
from collections import deque
from datetime import datetime, timezone

import cv2
import numpy as np

# Ba'zi Windows konsollarida (masalan, cp1251 kodlash) emoji/strelka belgilar
# print() chaqirilganda UnicodeEncodeError bilan butun skriptni qulatadi.
# stdout/stderr ni UTF-8 ga majburlab, bu xatoni butunlay oldini olamiz.
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import mediapipe as mp
    from mediapipe.tasks.python import vision as mp_vision
    from mediapipe.tasks.python.core.base_options import BaseOptions as _MpBaseOptions
except ImportError:
    sys.exit("MediaPipe o'rnatilmagan. Ishlatish:  pip install mediapipe")

# Yangi mediapipe build'larida (0.10.x, Python 3.12) eski mp.solutions.face_mesh
# API'si butunlay olib tashlangan — faqat Tasks API (FaceLandmarker) qoladi.
# Model fayli birinchi ishga tushirishda avtomatik yuklab olinadi.
_MODEL_DIR  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
_MODEL_PATH = os.path.join(_MODEL_DIR, "face_landmarker.task")
_MODEL_URL  = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)


def _ensure_face_landmarker_model() -> str:
    if not os.path.exists(_MODEL_PATH):
        os.makedirs(_MODEL_DIR, exist_ok=True)
        print(f"[DMS] FaceLandmarker modeli topilmadi, yuklab olinmoqda…\n      {_MODEL_URL}")
        urllib.request.urlretrieve(_MODEL_URL, _MODEL_PATH)
        print(f"[DMS] Model saqlandi → {_MODEL_PATH}")
    return _MODEL_PATH

try:
    import websockets
except ImportError:
    sys.exit("websockets o'rnatilmagan. Ishlatish:  pip install websockets")


# ══════════════════════════════════════════════════════════════════════════════
# SECTION A — Umumiy frame buffer (detection loop ↔ WebRTC oqimi)
# ══════════════════════════════════════════════════════════════════════════════

_frame_lock = threading.Lock()
_shared_frame: np.ndarray | None = None


def _update_shared_frame(frame: np.ndarray) -> None:
    global _shared_frame
    with _frame_lock:
        _shared_frame = frame.copy()


def _get_shared_frame() -> np.ndarray | None:
    with _frame_lock:
        return _shared_frame.copy() if _shared_frame is not None else None


# ══════════════════════════════════════════════════════════════════════════════
# SECTION B — WebRTC Video Stream Server  (aiortc + aiohttp)
#             Asosiy detection loopni to'smasligi uchun alohida thread da ishlaydi
# ══════════════════════════════════════════════════════════════════════════════

WEBRTC_AVAILABLE = False

try:
    import av
    from aiohttp import web as _web
    from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack as _VST

    _peer_connections: set[RTCPeerConnection] = set()

    # ── VideoStreamTrack — umumiy buferdan frame tortib oladi ───────────────
    class _LiveFrameTrack(_VST):
        kind = "video"

        async def recv(self) -> av.VideoFrame:
            pts, time_base = await self.next_timestamp()
            raw = _get_shared_frame()
            if raw is None:
                raw = np.zeros((480, 640, 3), dtype=np.uint8)
            # OpenCV BGR → WebRTC RGB
            rgb = cv2.cvtColor(raw, cv2.COLOR_BGR2RGB)
            vf = av.VideoFrame.from_ndarray(rgb, format="rgb24")
            vf.pts = pts
            vf.time_base = time_base
            return vf

    # ── CORS headers ─────────────────────────────────────────────────────────
    _CORS = {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    async def _handle_options(req: _web.Request) -> _web.Response:
        return _web.Response(headers=_CORS)

    async def _handle_offer(req: _web.Request) -> _web.Response:
        params = await req.json()
        offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

        pc = RTCPeerConnection()
        _peer_connections.add(pc)

        @pc.on("connectionstatechange")
        async def _on_state_change():
            state = pc.connectionState
            print(f"[WebRTC] {state}")
            if state in ("failed", "closed", "disconnected"):
                await pc.close()
                _peer_connections.discard(pc)

        pc.addTrack(_LiveFrameTrack())
        await pc.setRemoteDescription(offer)
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        return _web.Response(
            content_type="application/json",
            text=json.dumps({"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}),
            headers=_CORS,
        )

    def _start_webrtc_server() -> None:
        """Daemon thread — detection loopni bloklashmaydi."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        app = _web.Application()
        app.router.add_options("/offer", _handle_options)
        app.router.add_post("/offer",    _handle_offer)

        runner = _web.AppRunner(app)
        loop.run_until_complete(runner.setup())
        site = _web.TCPSite(runner, "0.0.0.0", VIDEO_PORT)
        loop.run_until_complete(site.start())
        print(f"[WebRTC] Server tayyor → http://0.0.0.0:{VIDEO_PORT}/offer")
        loop.run_forever()

    _t = threading.Thread(target=_start_webrtc_server, daemon=True, name="webrtc-server")
    _t.start()
    WEBRTC_AVAILABLE = True

except ImportError as _e:
    print(f"[WebRTC] Kutubxona topilmadi ({_e}) — video oqim o'chirildi.")
    print("[WebRTC] O'rnatish: pip install aiortc aiohttp av")

# (end SECTION B)


# ══════════════════════════════════════════════════════════════════════════════
# SECTION C — MediaPipe Face Mesh + PERCLOS hisoblash
# ══════════════════════════════════════════════════════════════════════════════

# Face mesh landmark indekslari (ko'z uchun EAR hisoblash)
_LEFT_EYE  = [33,  160, 158, 133, 153, 144]
_RIGHT_EYE = [362, 385, 387, 263, 373, 380]

EAR_THRESHOLD       = 0.22   # shu qiymatdan past → ko'z yumiq
PERCLOS_WINDOW_SEC  = 4.0    # siljuvchi oyna (soniya)
WS_PACKET_INTERVAL  = 3.0    # WS paketini yuborish oralig'i (soniya)


def _ear(lm, indices: list[int], w: int, h: int) -> float:
    """Eye Aspect Ratio (Soukupova & Cech 2016)."""
    p = [(lm[i].x * w, lm[i].y * h) for i in indices]
    d = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])
    return (d(p[1], p[5]) + d(p[2], p[4])) / (2.0 * d(p[0], p[3]) + 1e-6)


def _alarm_from_perclos(perclos: float) -> tuple[int, str]:
    if perclos < 0.15:
        return 0, "Normal holat"
    if perclos < 0.28:
        return 1, "Diqqat pasayishi sezilyapti"
    if perclos < 0.50:
        return 2, f"OGOHLANTIRISH! Mikro-uyqu belgilari (PERCLOS {perclos:.0%})"
    return 3, f"XAVF! Haydovchi uxlab qoldi! (PERCLOS {perclos:.0%})"


# ══════════════════════════════════════════════════════════════════════════════
# SECTION D — WebSocket yuborgich (alohida thread)
# ══════════════════════════════════════════════════════════════════════════════

class _WsSender:
    def __init__(self):
        self._loop  = asyncio.new_event_loop()
        self._queue: asyncio.Queue = asyncio.Queue()
        threading.Thread(target=self._run, daemon=True, name="ws-sender").start()

    def _run(self):
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._loop_forever())

    async def _loop_forever(self):
        url = f"ws://{WS_HOST}:{WS_PORT}/ws/dms/"
        while True:
            try:
                async with websockets.connect(url) as ws:
                    print(f"[WS] Ulandi → {url}")
                    while True:
                        pkt = await self._queue.get()
                        await ws.send(json.dumps(pkt))
            except Exception as ex:
                print(f"[WS] Uzildi ({ex}), 5s keyin qayta urinadi…")
                await asyncio.sleep(5)

    def send(self, packet: dict) -> None:
        self._loop.call_soon_threadsafe(self._queue.put_nowait, packet)


# ══════════════════════════════════════════════════════════════════════════════
# SECTION E — Asosiy detection loop (cv2.imshow + MediaPipe)
# ══════════════════════════════════════════════════════════════════════════════

def main(camera_index: int = 0) -> None:
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        print(f"[ERROR] Kamera {camera_index} ochilmadi. --device flagini tekshiring.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS,          30)

    model_path = _ensure_face_landmarker_model()
    face_landmarker = mp_vision.FaceLandmarker.create_from_options(
        mp_vision.FaceLandmarkerOptions(
            base_options=_MpBaseOptions(model_asset_path=model_path),
            running_mode=mp_vision.RunningMode.VIDEO,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
    )
    _t0_ms = time.time() * 1000.0

    ws_sender = _WsSender()

    # Siljuvchi oyna: (vaqt, ko'z_yumiqmi)
    eye_log: deque[tuple[float, bool]] = deque()
    last_ws_send = 0.0

    print(f"[DMS] Qurilma: {DEVICE_ID}  |  Kamera: {camera_index}")
    print(f"[DMS] WebRTC: http://{WS_HOST}:{VIDEO_PORT}/offer" if WEBRTC_AVAILABLE else "[DMS] WebRTC: o'chirilgan")
    print("[DMS] Chiqish uchun 'q' bosing")

    LEVEL_COLORS = [
        (100, 220, 61),   # 0 — xavfsiz (yashil)
        (61,  220, 240),  # 1 — ehtiyot (zangori)
        (40,  100, 255),  # 2 — ogohlantirish (to'q ko'k)
        (30,   40, 255),  # 3 — xavf (qizil)
    ]

    while True:
        ok, frame = cap.read()
        if not ok:
            print("[DMS] Kamera kadrini o'qib bo'lmadi.")
            break

        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        timestamp_ms = int(time.time() * 1000 - _t0_ms)
        results = face_landmarker.detect_for_video(mp_image, timestamp_ms)

        now = time.time()
        perclos  = 0.0
        level    = 0
        msg      = "Yuz aniqlanmadi"

        if results.face_landmarks:
            lm = results.face_landmarks[0]
            msg = "Normal holat"

            left_ear  = _ear(lm, _LEFT_EYE,  w, h)
            right_ear = _ear(lm, _RIGHT_EYE, w, h)
            avg_ear   = (left_ear + right_ear) / 2.0
            closed    = avg_ear < EAR_THRESHOLD

            # Siljuvchi oynani yangilaymiz
            eye_log.append((now, closed))
            cutoff = now - PERCLOS_WINDOW_SEC
            while eye_log and eye_log[0][0] < cutoff:
                eye_log.popleft()

            closed_count = sum(1 for _, c in eye_log if c)
            perclos = closed_count / max(len(eye_log), 1)
            level, msg = _alarm_from_perclos(perclos)

            # Ko'z nuqtalari (vizualizatsiya)
            dot_color = (50, 255, 120) if not closed else (50, 60, 255)
            for indices in (_LEFT_EYE, _RIGHT_EYE):
                for idx in indices:
                    cx = int(lm[idx].x * w)
                    cy = int(lm[idx].y * h)
                    cv2.circle(frame, (cx, cy), 2, dot_color, -1)

        # ── HUD overlay ─────────────────────────────────────────────────────
        bar_color = LEVEL_COLORS[level]
        cv2.rectangle(frame, (0, 0), (w, 56), (8, 8, 20), -1)

        # PERCLOS bar
        bar_w = int((perclos / 1.0) * (w - 20))
        cv2.rectangle(frame, (10, 46), (10 + bar_w, 52), bar_color, -1)
        cv2.rectangle(frame, (10, 46), (w - 10, 52), (60, 60, 80), 1)

        cv2.putText(frame, f"PERCLOS {perclos:.1%}  |  L{level}: {msg[:45]}",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.52, bar_color, 1, cv2.LINE_AA)
        cv2.putText(frame, f"{DEVICE_ID}",
                    (w - 120, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (160, 160, 200), 1, cv2.LINE_AA)

        if WEBRTC_AVAILABLE:
            cv2.putText(frame, f"WEB :{VIDEO_PORT}",
                        (w - 120, 48), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (80, 200, 80), 1, cv2.LINE_AA)

        # ── Shared frame bufferga yubor (WebRTC uchun) ─────────────────────
        _update_shared_frame(frame)

        # ── WS paketi (har WS_PACKET_INTERVAL sekunda) ─────────────────────
        if now - last_ws_send >= WS_PACKET_INTERVAL:
            last_ws_send = now
            packet = {
                "device_id":   DEVICE_ID,
                "driver_name": "Real haydovchi",
                "timestamp":   datetime.now(timezone.utc).isoformat(),
                "alarm_level": level,
                "alarm_msg":   msg,
                "perclos":     round(perclos, 4),
                "gps":     {"lat": 41.2995, "lon": 69.2401, "speed": 60.0},
                "cabin":   {"temp": 26.0, "humidity": 45.0},
            }
            ws_sender.send(packet)
            emoji = ["🟢", "🟡", "🟠", "🔴"][level]
            print(f"[DMS] {emoji} L{level}  PERCLOS={perclos:.3f}  {msg}")

        cv2.imshow("DIGITORA DMS — Ko'z kuzatish", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    face_landmarker.close()
    print("[DMS] Tugatildi.")


# ══════════════════════════════════════════════════════════════════════════════
# Entry point
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DIGITORA DMS — Real-time driver monitoring")
    parser.add_argument("--device", type=int, default=0, help="Kamera indeksi (default: 0)")
    args = parser.parse_args()
    main(camera_index=args.device)
