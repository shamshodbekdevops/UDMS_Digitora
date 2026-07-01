# -*- coding: utf-8 -*-
"""
╔══════════════════════════════════════════════════════════════════╗
║         DIGITORA DMS  —  JETSON NANO  v5.1                          ║
║   MediaPipe 0.10+ (FaceLandmarker API)  +  Arduino UNO          ║
╠══════════════════════════════════════════════════════════════════╣
║  O'rnatish:                                                      ║
║    pip3 install mediapipe numpy pyserial            ║
║                                                                  ║
║  MODEL FAYL (bir marta yuklab oling):                            ║
║    https://storage.googleapis.com/mediapipe-models/              ║
║      face_landmarker/face_landmarker/float16/1/                  ║
║      face_landmarker.task                                        ║
║    -> skript bilan bir papkaga saqlang                           ║
║                                                                  ║
║  Ishga tushirish:                                                ║
║    python digitora_jetson_v5.py                                 ║
║  Chiqish: Q yoki ESC                                             ║
╚══════════════════════════════════════════════════════════════════╝
"""

import cv2
import numpy as np
import time
import math
import threading
import os
import sys
import subprocess
import urllib.request
import urllib.error
import glob as _glob
import json
import asyncio
import base64
from collections import deque
from datetime import datetime, timezone

# ── MediaPipe 0.10+ Tasks API ────────────────────────────────────
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from mediapipe.tasks.python.vision.core.vision_task_running_mode import VisionTaskRunningMode

# ── Haydovchi identifikatori ──────────────────────────────────────
DRIVER_ID = "SHAMSHOD"

# ══════════════════════════════════════════════════════════════════
#  SERVER SOZLAMALARI
# ══════════════════════════════════════════════════════════════════
DEVICE_ID        = os.getenv("DIGITORA_DEVICE_ID",   "DGT-002")
WS_HOST          = os.getenv("DIGITORA_WS_HOST",     "45.130.164.189")
WS_PORT          = int(os.getenv("DIGITORA_WS_PORT", "8000"))
WS_URL           = f"ws://{WS_HOST}:{WS_PORT}/ws/dms/"
WS_SEND_INTERVAL = 2.0   # har necha soniyada serverga yuborish

# ══════════════════════════════════════════════════════════════════
#  WEBSOCKET YUBORGICH — alohida thread, asosiy loopni bloklam aydi
# ══════════════════════════════════════════════════════════════════
try:
    import websockets as _ws_lib
    _WS_OK = True
except ImportError:
    _ws_lib = None
    _WS_OK  = False
    print("  [!] websockets yo'q: pip3 install websockets")

class WsSender:
    def __init__(self):
        self.connected = False
        if not _WS_OK:
            return
        self._loop  = asyncio.new_event_loop()
        self._queue = asyncio.Queue()
        threading.Thread(
            target=self._run, daemon=True, name="ws-sender"
        ).start()

    def _run(self):
        asyncio.set_event_loop(self._loop)
        self._loop.run_until_complete(self._loop_forever())

    async def _loop_forever(self):
        while True:
            try:
                async with _ws_lib.connect(
                    WS_URL, ping_interval=20, ping_timeout=10
                ) as ws:
                    self.connected = True
                    print(f"  [WS] Ulandi → {WS_URL}")
                    while True:
                        pkt = await self._queue.get()
                        await ws.send(json.dumps(pkt))
            except Exception as e:
                self.connected = False
                print(f"  [WS] Uzildi ({type(e).__name__}), 5s kutilmoqda...")
                await asyncio.sleep(5)

    def send(self, packet: dict):
        if not _WS_OK:
            return
        self._loop.call_soon_threadsafe(self._queue.put_nowait, packet)

# ══════════════════════════════════════════════════════════════════
#  FRAME YUBORGICH — MJPEG orqali serverga video yuboradi
#  Jetson → HTTP POST (JPEG) → Server → Dashboard
#  requests kutubxonasi yo'q bo'lsa — video o'chiriladi, qolgan
#  hamma narsa avvalgidek ishlayveradi (fault-tolerant)
# ══════════════════════════════════════════════════════════════════
FRAME_UPLOAD_URL  = f"http://{WS_HOST}:{WS_PORT}/api/video-frame/{DEVICE_ID}/upload/"
FRAME_INTERVAL    = 0.1    # har 100ms da 1 kadr (10 fps)
FRAME_WIDTH       = 640     # kichikroq = tezroq yuklash
FRAME_HEIGHT      = 480
FRAME_QUALITY     = 80     # JPEG sifati (0-100)

try:
    import requests as _req_lib
    _REQ_OK = True
except ImportError:
    _req_lib = None
    _REQ_OK  = False
    print("  [!] requests yo'q — video o'chirilgan (pip3 install requests)")

class FrameSender:
    """
    Kamera kadrlarini serverga HTTP POST orqali yuboradi.
    Alohida background thread'da ishlaydi — asosiy loopni bloklam aydi.
    requests yo'q bo'lsa yoki server ulanmasa — xatolik bermaydi,
    faqat chiziqcha ('..') chiqaradi va davom etadi.
    """
    def __init__(self):
        self._lock   = threading.Lock()
        self._frame  = None
        self._active = _REQ_OK
        if _REQ_OK:
            self._session = _req_lib.Session()
            threading.Thread(
                target=self._run, daemon=True, name="frame-sender"
            ).start()
            print(f"  [OK] FrameSender tayyor → {FRAME_UPLOAD_URL}")
        else:
            print("  [!] FrameSender o'chirilgan (requests yo'q)")

    def update(self, frame: "np.ndarray"):
        """Asosiy loopdan chaqiriladi — yangi kadrni bufferga qo'yadi."""
        if not self._active:
            return
        small = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))
        with self._lock:
            self._frame = small

    def _run(self):
        last_send = 0.0
        while True:
            now = time.time()
            if now - last_send < FRAME_INTERVAL:
                time.sleep(0.02)
                continue
            with self._lock:
                frm = self._frame.copy() if self._frame is not None else None
            if frm is None:
                time.sleep(0.05)
                continue
            try:
                _, buf    = cv2.imencode(
                    '.jpg', frm,
                    [cv2.IMWRITE_JPEG_QUALITY, FRAME_QUALITY]
                )
                b64 = base64.b64encode(buf.tobytes()).decode('utf-8')
                self._session.post(
                    FRAME_UPLOAD_URL,
                    json={"frame": b64, "device_id": DEVICE_ID},
                    timeout=1.0
                )
                last_send = now
            except Exception:
                pass   # tarmoq xatolarini jim o'tkazib yuboramiz

# ══════════════════════════════════════════════════════════════════
#  MODEL FAYL
# ══════════════════════════════════════════════════════════════════
MODEL_URL  = ("https://storage.googleapis.com/mediapipe-models/"
              "face_landmarker/face_landmarker/float16/1/face_landmarker.task")
MODEL_FILE = "face_landmarker.task"

def ensure_model():
    if os.path.exists(MODEL_FILE):
        print(f"  [OK] Model fayl: {MODEL_FILE}")
        return True
    print(f"  [!] Model fayl topilmadi: {MODEL_FILE}")
    print(f"  Yuklanmoqda: {MODEL_URL}")
    try:
        urllib.request.urlretrieve(MODEL_URL, MODEL_FILE)
        print(f"  [OK] Yuklandi: {MODEL_FILE}")
        return True
    except Exception as e:
        print(f"  [!] Yuklab bo'lmadi: {e}")
        print(f"  Qo'lda yuklab oling:")
        print(f"  {MODEL_URL}")
        print(f"  -> {os.path.abspath(MODEL_FILE)}")
        return False

# ══════════════════════════════════════════════════════════════════
#  SOZLAMALAR
# ══════════════════════════════════════════════════════════════════
EAR_CLOSED      = 0.22
EAR_OPEN        = 0.26
PERCLOS_WIN_SEC = 60
PERCLOS_L1      = 0.15
PERCLOS_L2      = 0.35
PERCLOS_L3      = 0.70
PITCH_WARN      = 15
PITCH_DANGER    = 25
YAW_WARN        = 25
YAW_DANGER      = 40
BLINK_HIGH      = 25
BLINK_LOW       = 8
FACE_MISS_SEC   = 2.5
CABIN_HOT_C     = 28.0
CANVAS_W        = 1280
CANVAS_H        = 680

# ── TEZKOR REAKSIYA TAYMERLARI (4-bosqichli xavf tizimi) ─────────
# PERCLOS (yuqorida, 60s oyna) — uzoq muddatli charchoq trendini
# o'lchaydi, ilmiy standart, hisobot uchun saqlanadi, O'ZGARMAYDI.
#
# Quyidagi taymerlar — bundan MUSTAQIL, DARHOL xavfni ushlash uchun.
# Normal/Professional balans: na juda tez (xato signal), na juda
# sekin (xavfli kechikish).
#
#   Level 1 — Chalg'ish (yon qarash / telefon)     :  3.0s
#   Level 2 — Mikro-uyqu (ko'z yumiq YOKI bosh pastga) :  5.0s
#   Level 3 — Mutlaq uyqu (ko'z/bosh davom etsa)   :  9.0s
#   Level 3 — Yuz kamerada ko'rinmasa (pastga ketgan) :  3.0s
#
# Oddiy qirpish (0.1-0.4s) va tabiiy qarashlar bu taymerlarga
# ta'sir qilmaydi, chunki ular eng qisqa chegaradan ham qisqa.
DISTRACT_WARN_SEC  = 3.0   # Level 1: Chalg'ish (yon/telefon)
EYES_WARN_SEC      = 5.0   # Level 2: Ko'z yumiq — mikro-uyqu
EYES_DANGER_SEC     = 9.0   # Level 3: Ko'z yumiq — mutlaq uyqu
HEAD_WARN_SEC       = 5.0   # Level 2: Bosh pastga — mikro-uyqu
HEAD_DANGER_SEC     = 9.0   # Level 3: Bosh pastga — mutlaq uyqu
FACE_GONE_DANGER_SEC = 3.0  # Level 3: Yuz kamerada yo'q (pastga ketgan)


# ── Landmark indekslari (478 landmark: 468 yuz + 10 iris) ────────
LEFT_EYE   = [362, 385, 387, 263, 373, 380]
RIGHT_EYE  = [33,  160, 158, 133, 153, 144]
LEFT_IRIS  = [474, 475, 476, 477]
RIGHT_IRIS = [469, 470, 471, 472]
FACE_OVAL  = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323,
    361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
    176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109, 10
]
MODEL_3D = np.array([
    [0., 0., 0.], [-30., -30., -30.], [30., -30., -30.],
    [-25., 30., -30.], [25., 30., -30.], [0., 75., -50.]
], dtype=np.float64)
POSE_IDX = [1, 33, 263, 61, 291, 199]

# ══════════════════════════════════════════════════════════════════
#  RANG PALITASI  (BGR)
# ══════════════════════════════════════════════════════════════════
C = {
    "bg":      (10, 12, 16),
    "panel":   (16, 20, 26),
    "card":    (22, 27, 35),
    "card2":   (32, 39, 50),
    "border":  (48, 58, 74),
    "dim":     (88, 98, 116),
    "mid":     (140, 152, 170),
    "text":    (210, 220, 234),
    "white":   (240, 245, 252),
    "green":   (60, 210, 80),
    "yellow":  (30, 200, 240),
    "orange":  (20, 140, 250),
    "red":     (50, 50, 235),
    "teal":    (180, 200, 40),
    "blue":    (230, 150, 50),
    "purple":  (200, 80, 160),
    "accent":  (220, 120, 35),
    "ok":      (60, 210, 80),
    "warn":    (30, 200, 240),
    "err":     (50, 50, 235),
    "off":     (55, 60, 72),
}
FONT   = cv2.FONT_HERSHEY_SIMPLEX
FONT_B = cv2.FONT_HERSHEY_DUPLEX

def lvl_color(lvl):
    return [C["green"], C["yellow"], C["orange"], C["red"]][min(int(lvl), 3)]

# ══════════════════════════════════════════════════════════════════
#  FACE LANDMARKER (yangi API wrapper)
# ══════════════════════════════════════════════════════════════════
class FaceTracker:
    """
    MediaPipe 0.10+ FaceLandmarker API ni eski face_mesh kabi ishlatish uchun wrapper.
    result.landmarks — 478 ta NormalizedLandmark ro'yxati (x, y, z atributlari bilan).
    """
    def __init__(self, model_path):
        base_opts = mp_python.BaseOptions(model_asset_path=model_path)
        opts = mp_vision.FaceLandmarkerOptions(
            base_options=base_opts,
            running_mode=VisionTaskRunningMode.VIDEO,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
        )
        self.landmarker = mp_vision.FaceLandmarker.create_from_options(opts)
        self._ts = 0

    def process(self, bgr_frame):
        """
        BGR frame kiradi.
        Qaytaradi: landmark ro'yxati yoki None
        """
        rgb = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        self._ts += 33  # ~30 FPS
        result = self.landmarker.detect_for_video(mp_img, self._ts)
        if result.face_landmarks:
            return result.face_landmarks[0]  # 478 ta landmark
        return None

    def close(self):
        self.landmarker.close()

# ══════════════════════════════════════════════════════════════════
#  HISOBLASH FUNKSIYALARI
# ══════════════════════════════════════════════════════════════════
def calc_ear(lm, idx):
    p  = [lm[i] for i in idx]
    v1 = math.hypot(p[1].x - p[5].x, p[1].y - p[5].y)
    v2 = math.hypot(p[2].x - p[4].x, p[2].y - p[4].y)
    h  = math.hypot(p[0].x - p[3].x, p[0].y - p[3].y)
    return (v1 + v2) / (2 * h) if h > 1e-6 else 0.0

def calc_gaze(lm, eye_idx, iris_idx):
    ex = [lm[i].x for i in eye_idx]
    ey = [lm[i].y for i in eye_idx]
    cx = (min(ex) + max(ex)) / 2
    cy = (min(ey) + max(ey)) / 2
    ew = max(ex) - min(ex)
    eh = max(ey) - min(ey)
    ix = sum(lm[i].x for i in iris_idx) / 4
    iy = sum(lm[i].y for i in iris_idx) / 4
    return round((ix - cx) / (ew + 1e-6), 2), round((iy - cy) / (eh + 1e-6), 2)

def calc_head_pose(lm, W, H):
    pts = np.array(
        [[lm[i].x * W, lm[i].y * H] for i in POSE_IDX],
        dtype=np.float64
    )
    cam = np.array(
        [[float(W), 0, W / 2], [0, float(W), H / 2], [0, 0, 1]],
        dtype=np.float64
    )
    ok, rv, _ = cv2.solvePnP(
        MODEL_3D, pts, cam, np.zeros((4, 1)),
        flags=cv2.SOLVEPNP_ITERATIVE
    )
    if not ok:
        return 0., 0., 0.
    R, _ = cv2.Rodrigues(rv)
    sy = math.sqrt(R[0, 0]**2 + R[1, 0]**2)
    if sy > 1e-6:
        pitch = math.degrees(math.atan2(R[2, 1], R[2, 2]))
        yaw   = math.degrees(math.atan2(-R[2, 0], sy))
        roll  = math.degrees(math.atan2(R[1, 0], R[0, 0]))
    else:
        pitch = math.degrees(math.atan2(-R[1, 2], R[1, 1]))
        yaw   = math.degrees(math.atan2(-R[2, 0], sy))
        roll  = 0.
    if pitch >  90: pitch -= 180
    if pitch < -90: pitch += 180
    return pitch, yaw, roll

# ══════════════════════════════════════════════════════════════════
#  ARDUINO
# ══════════════════════════════════════════════════════════════════
class Arduino:
    def __init__(self):
        self.ser        = None
        self.port       = None
        self.connected  = False
        self.last_level = -1
        self._lock      = threading.Lock()
        self._level     = 0
        self._stop      = False
        self.dev_gps    = "KUTILMOQDA"
        self.dev_dht    = "KUTILMOQDA"
        self.dev_buzzer = "KUTILMOQDA"
        self.dev_rgb    = "KUTILMOQDA"
        self.dev_btn1   = "TAYYOR"
        self.dev_btn2   = "TAYYOR"
        self.snooze_flag  = False
        self.jetson_cmd   = None
        self.temp = None
        self.hum  = None
        self.gps_lat   = None
        self.gps_lon   = None
        self.gps_speed = None
        self.gps_sats  = None
        self.gps_valid = False
        try:
            import serial as _s
            self._serial = _s
        except ImportError:
            self._serial = None
            print("  [!] pyserial topilmadi: pip install pyserial")
            return
        threading.Thread(target=self._worker, daemon=True).start()

    def _find_ports(self):
        # Oddiy va ishonchli usul (digitora_jetson.py dan)
        ports = sorted(_glob.glob("/dev/ttyUSB*"))
        ports += sorted(_glob.glob("/dev/ttyACM*"))
        
        # Agar hech narsa topilmasa, list_ports ga fallback
        if not ports:
            try:
                from serial.tools import list_ports
                for p in list_ports.comports():
                    if p.device not in ports:
                        ports.append(p.device)
            except Exception:
                pass
        
        return ports

    def _connect(self):
        for p in self._find_ports():
            try:
                s = self._serial.Serial(p, 9600, timeout=0.15)
                time.sleep(2.2)
                s.reset_input_buffer()
                s.write(b'P')
                self.ser = s; self.port = p
                self.connected = True
                self.dev_rgb = "TAYYOR"
                print(f"  [OK] Arduino: {p}")
                s.write(b'S')
                return True
            except Exception:
                continue
        return False

    def _parse(self, line):
        if not line: return
        if line == "R":
            self.last_level = -1
            self.dev_buzzer = "KUTILMOQDA"
        elif line == "K":
            self.snooze_flag = True
        elif line.startswith("J:"):
            cmd = line[2:]
            if cmd in ("ON","OFF"):
                self.jetson_cmd = cmd
        elif line == "B:OK":
            self.dev_buzzer = "OK"
        elif line in ("H:OK",):
            self.dev_dht = "OK"
        elif line == "H:ERR":
            self.dev_dht = "XATO"
        elif line.startswith("T:"):
            try:
                p = line[2:].split(":")
                self.temp = float(p[0]); self.hum = float(p[1])
                self.dev_dht = "OK"
            except: self.dev_dht = "XATO"
        elif line.startswith("G:"):
            try:
                p = line[2:].split(":")
                lat,lon = float(p[0]),float(p[1])
                if lat != 0 and lon != 0:
                    self.gps_lat=lat; self.gps_lon=lon
                    self.gps_speed=float(p[2]); self.gps_sats=int(p[3])
                    self.gps_valid=True; self.dev_gps="OK"
                else:
                    self.gps_valid=False; self.dev_gps="SIGNAL YOQ"
            except: self.gps_valid=False; self.dev_gps="XATO"

    def _worker(self):
        while not self._stop:
            if not self.connected:
                if not self._connect(): time.sleep(3); continue
            try:
                with self._lock: lvl = self._level
                if lvl != self.last_level:
                    self.ser.write(str(lvl).encode()); self.last_level = lvl
                else:
                    self.ser.write(b'P')
                while self.ser.in_waiting:
                    self._parse(self.ser.readline().decode(errors="ignore").strip())
                time.sleep(0.4)
            except Exception as e:
                print(f"  [!] Arduino uzildi: {e}")
                self.connected=False; self.last_level=-1
                self.dev_rgb="XATO"; self.dev_buzzer="XATO"
                try: self.ser.close()
                except: pass
                self.ser=None; time.sleep(2)

    def set_level(self, lvl):
        with self._lock: self._level = int(max(0, min(3, lvl)))

    def pop_snooze(self):
        if self.snooze_flag: self.snooze_flag=False; return True
        return False

    def pop_jetson_cmd(self):
        c=self.jetson_cmd; self.jetson_cmd=None; return c

    def confirm_jetson(self, on):
        try:
            if self.connected and self.ser:
                self.ser.write(b'S' if on else b'X')
        except: pass

    def close(self):
        self._stop=True
        try:
            if self.ser: self.ser.write(b'0'); self.ser.close()
        except: pass

# ══════════════════════════════════════════════════════════════════
#  KAMERA
# ══════════════════════════════════════════════════════════════════
def open_camera():
    # ── CSI kamera (Jetson Nano) ──────────────────────────────
    # 640x480 @ 30fps — Jetson Nano xotira cheklovi bilan ishonchli
    # ishlaydigan sozlama (yuqori piksel/fps "InsufficientMemory"
    # xatosiga olib kelishi mumkin).
    csi_pipes = [
        (
            "nvarguscamerasrc ! "
            "video/x-raw(memory:NVMM), width=640, height=480, framerate=30/1 ! "
            "nvvidconv flip-method=0 ! "
            "video/x-raw, format=BGRx ! "
            "videoconvert ! video/x-raw, format=BGR ! appsink drop=1"
        ),
        (
            "nvarguscamerasrc ! "
            "video/x-raw(memory:NVMM), width=1280, height=720, framerate=30/1 ! "
            "nvvidconv flip-method=0 ! "
            "video/x-raw, format=BGRx ! "
            "videoconvert ! video/x-raw, format=BGR ! appsink drop=1"
        ),
    ]
    for pipe in csi_pipes:
        try:
            cap = cv2.VideoCapture(pipe, cv2.CAP_GSTREAMER)
            if cap.isOpened():
                ok, f = cap.read()
                if ok and f is not None:
                    print(f"  [OK] CSI kamera ulandi ({f.shape[1]}x{f.shape[0]})")
                    return cap, "CSI"
            cap.release()
        except Exception:
            continue

    # ── V4L2 to'g'ridan (GStreamer bypass, CSI ishlamasa) ─────
    v4l2_pipes = [
        "v4l2src device=/dev/video0 ! video/x-raw,width=640,height=480,framerate=30/1 ! videoconvert ! video/x-raw,format=BGR ! appsink drop=1",
        "v4l2src device=/dev/video0 ! videoconvert ! video/x-raw,format=BGR ! appsink drop=1",
    ]
    for pipe in v4l2_pipes:
        try:
            cap = cv2.VideoCapture(pipe, cv2.CAP_GSTREAMER)
            if cap.isOpened():
                ok, f = cap.read()
                if ok and f is not None:
                    print("  [OK] V4L2 kamera ulandi")
                    return cap, "V4L2"
            cap.release()
        except Exception:
            continue

    # ── Oddiy OpenCV fallback (USB kamera) ────────────────────
    for i in range(4):
        try:
            cap = cv2.VideoCapture(i)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 30)
            if cap.isOpened():
                ok, f = cap.read()
                if ok and f is not None:
                    print(f"  [OK] Kamera {i} ulandi")
                    return cap, f"CAM-{i}"
            cap.release()
        except Exception:
            continue

    return None, None

# ══════════════════════════════════════════════════════════════════
#  HOLAT
# ══════════════════════════════════════════════════════════════════
class State:
    def __init__(self):
        self.perclos_buf = deque(maxlen=PERCLOS_WIN_SEC*30)
        self.ear_buf     = deque(maxlen=8)
        self.pitch_buf   = deque(maxlen=8)
        self.yaw_buf     = deque(maxlen=8)
        self.ear_hist    = deque(maxlen=120)
        self.pcl_hist    = deque(maxlen=120)
        self.yaw_hist    = deque(maxlen=120)
        self.spd_hist    = deque(maxlen=120)
        self.blink_state = False
        self.blink_count = 0
        self.blink_win_t = time.time()
        self.blink_rate  = 0
        self.total_blink = 0
        self.alarm_level = 0
        self.alarm_msg   = "Tizim ishga tushdi"
        self._last_key   = {}
        self.sess_start  = time.time()
        self.total_alerts= 0
        self.total_danger= 0
        self.events      = deque(maxlen=8)
        self.face_gone_t = None
        self.fps_t       = time.time()
        self.fps_cnt     = 0
        self.live_fps    = 0
        self.cabin_temp  = None
        self.cabin_hum   = None
        self.gps_lat     = None
        self.gps_lon     = None
        self.gps_speed   = None
        self.gps_sats    = None
        self.gps_valid   = False
        self.jetson_on   = True
        self.power_msg   = ""
        self.power_msg_t = 0.0

        # ── Dual-Timer: "qachon boshlangani" vaqt belgilari ───────
        # None = hozir shart bajarilmayapti (taymer ishlamayapti)
        # time.time() qiymati = shart boshlangan vaqt
        self.eyes_closed_since = None
        self.head_down_since   = None
        self.distract_since    = None
        # UI'da ko'rsatish uchun joriy davomiylik (soniya)
        self.eyes_closed_dur   = 0.0
        self.head_down_dur     = 0.0
        self.distract_dur      = 0.0

    def sess_time(self):
        s = int(time.time()-self.sess_start)
        h,r = divmod(s,3600); m,s2 = divmod(r,60)
        return f"{h:02d}:{m:02d}:{s2:02d}"

    def add_event(self, lvl, txt):
        self.events.appendleft({"lvl":lvl,"txt":txt,"time":self.sess_time()})
        if lvl>=3: self.total_danger+=1
        if lvl>=1: self.total_alerts+=1

    def throttle(self, key, sec=6.0):
        now=time.time()
        if now-self._last_key.get(key,0)>sec:
            self._last_key[key]=now; return True
        return False

    def set_power_msg(self, msg):
        self.power_msg=msg; self.power_msg_t=time.time()

# ══════════════════════════════════════════════════════════════════
#  UI YORDAMCHI
# ══════════════════════════════════════════════════════════════════
def rf(img,x1,y1,x2,y2,col):
    cv2.rectangle(img,(int(x1),int(y1)),(int(x2),int(y2)),col,-1)

def tx(img,t,x,y,col,sz=0.42,th=1,f=None):
    cv2.putText(img,str(t),(int(x),int(y)),f or FONT,sz,col,th,cv2.LINE_AA)

def txr(img,t,rx,y,col,sz=0.42,th=1):
    w,_=cv2.getTextSize(str(t),FONT,sz,th)[0]
    cv2.putText(img,str(t),(int(rx-w),int(y)),FONT,sz,col,th,cv2.LINE_AA)

def txc(img,t,cx,y,col,sz=0.42,th=1,f=None):
    fnt=f or FONT; w,_=cv2.getTextSize(str(t),fnt,sz,th)[0]
    cv2.putText(img,str(t),(int(cx-w/2),int(y)),fnt,sz,col,th,cv2.LINE_AA)

def prog_bar(img,x,y,w,h,pct,col):
    rf(img,x,y,x+w,y+h,C["card2"])
    f=int(w*max(0.,min(1.,pct)))
    if f>0: rf(img,x,y,x+f,y+h,col)
    cv2.rectangle(img,(int(x),int(y)),(int(x+w),int(y+h)),C["border"],1)

def sparkline(img,x,y,w,h,data,col,lo,hi):
    v=list(data)
    if len(v)<2: return
    rng=(hi-lo) or 1e-6
    pts=[]
    for i,val in enumerate(v):
        px=x+i*w/(len(v)-1)
        py=y+h-(max(lo,min(hi,val))-lo)/rng*h
        pts.append((int(px),int(py)))
    for i in range(len(pts)-1):
        cv2.line(img,pts[i],pts[i+1],col,1,cv2.LINE_AA)

def arc_gauge(img,cx,cy,r,pct,col,label,sub):
    cx,cy=int(cx),int(cy)
    cv2.ellipse(img,(cx,cy),(r,r),0,135,405,C["card2"],8,cv2.LINE_AA)
    end=135+int(270*max(0.,min(1.,pct)))
    if end>137: cv2.ellipse(img,(cx,cy),(r,r),0,135,end,col,8,cv2.LINE_AA)
    txc(img,label,cx,cy+8,C["white"],0.65,1,FONT_B)
    txc(img,sub,cx,cy+24,C["dim"],0.30)

def compass_w(img,cx,cy,r,yaw,pitch):
    cx,cy=int(cx),int(cy)
    cv2.circle(img,(cx,cy),r,C["card2"],-1)
    cv2.circle(img,(cx,cy),r,C["border"],1)
    cv2.line(img,(cx,cy-r+4),(cx,cy+r-4),C["card"],1)
    cv2.line(img,(cx-r+4,cy),(cx+r-4,cy),C["card"],1)
    dx=int(np.clip(yaw/50,-1,1)*(r-12))
    dy=int(np.clip(pitch/40,-1,1)*(r-12))
    d=abs(yaw)>YAW_DANGER or pitch>PITCH_DANGER
    wn=abs(yaw)>YAW_WARN or pitch>PITCH_WARN
    col=C["red"] if d else (C["orange"] if wn else C["accent"])
    cv2.circle(img,(cx+dx,cy+dy),8,col,-1)
    cv2.circle(img,(cx,cy),3,C["dim"],-1)
    txc(img,"P",cx,cy-r+13,C["dim"],0.26)
    txc(img,"Ch",cx-r+10,cy+4,C["dim"],0.26)
    txc(img,"O'",cx+r-10,cy+4,C["dim"],0.26)

def dev_dot(img,x,y,status,label):
    cm={"OK":C["ok"],"TAYYOR":C["ok"],"XATO":C["err"],
        "KUTILMOQDA":C["warn"],"SIGNAL YOQ":C["warn"],"ULANMAGAN":C["off"]}
    col=cm.get(status,C["off"])
    cv2.circle(img,(int(x),int(y)),4,col,-1)
    tx(img,label,x+10,y+4,col,0.28)

# ══════════════════════════════════════════════════════════════════
#  ALARM TAHLILI
#  PERCLOS (60s, sekin trend)  +  Tezkor Taymerlar (4-bosqichli)
#
#  Level 0 — Tahlil      : hech narsa aniqlanmagan
#  Level 1 — Chalg'ish   : yon qarash / telefon, 3.0s
#  Level 2 — Mikro-uyqu  : ko'z yumiq YOKI bosh pastga, 5.0s
#  Level 3 — Mutlaq uyqu : ko'z/bosh 9.0s DAVOM ETSA
#                          (yuz kamerada yo'qligi alohida, main()da)
# ══════════════════════════════════════════════════════════════════
def analyze(st, d):
    now = time.time()
    lvl = 0
    msg = "Barcha ko'rsatkichlar normal"
    pc  = d["perclos"]
    pv  = d["pitch"]
    yv  = d["yaw"]

    # ── A. KO'Z YUMIQ — tezkor taymer ─────────────────────────────
    eyes_now_closed = d["avg_ear"] < EAR_CLOSED
    if eyes_now_closed:
        if st.eyes_closed_since is None:
            st.eyes_closed_since = now
        st.eyes_closed_dur = now - st.eyes_closed_since
    else:
        st.eyes_closed_since = None
        st.eyes_closed_dur   = 0.0

    # ── B. BOSH PASTGA — tezkor taymer ────────────────────────────
    head_now_down = pv > PITCH_DANGER
    if head_now_down:
        if st.head_down_since is None:
            st.head_down_since = now
        st.head_down_dur = now - st.head_down_since
    else:
        st.head_down_since = None
        st.head_down_dur   = 0.0

    # ── C. CHALG'ISH — yon qarash / telefon, tezkor taymer ────────
    ay = abs(yv)
    gaze_off = d.get("gaze_x") and abs(d["gaze_x"]) > 0.65
    distract_now = (ay > YAW_DANGER) or gaze_off
    if distract_now:
        if st.distract_since is None:
            st.distract_since = now
        st.distract_dur = now - st.distract_since
    else:
        st.distract_since = None
        st.distract_dur   = 0.0

    # ── D. DARAJALARNI ANIQLASH — eng yuqori signal g'olib chiqadi ──

    # Level 3: Mutlaq uyqu — ko'z YOKI bosh 9s dan ko'p davom etsa
    sleep_dur = max(st.eyes_closed_dur, st.head_down_dur)
    if sleep_dur >= EYES_DANGER_SEC:
        lvl = 3
        which = "Ko'z" if st.eyes_closed_dur >= st.head_down_dur else "Bosh"
        msg = f"MUTLAQ UYQU! {which} {sleep_dur:.0f}s — TO'XTANG!"
        if st.throttle("danger3", 4): st.add_event(3, f"Mutlaq uyqu {sleep_dur:.0f}s")

    # Level 2: Mikro-uyqu — ko'z YOKI bosh 5s dan ko'p (lekin 9s dan kam)
    elif sleep_dur >= EYES_WARN_SEC:
        lvl = 2
        which = "Ko'z yumiq" if st.eyes_closed_dur >= st.head_down_dur else "Bosh pastga"
        msg = f"MIKRO-UYQU! {which} ({sleep_dur:.0f}s)"
        if st.throttle("micro2", 3): st.add_event(2, f"Mikro-uyqu: {which} {sleep_dur:.0f}s")

    # Level 1: Chalg'ish — yon qarash/telefon 3s dan ko'p
    if st.distract_dur >= DISTRACT_WARN_SEC and lvl < 2:
        lvl = max(lvl, 1)
        tom = "o'ngga" if yv > 0 else "chapga"
        msg = f"E'TIBOR CHALG'IDI ({st.distract_dur:.0f}s) — {tom}/telefon"
        if st.throttle("dist1", 3): st.add_event(1, f"Chalg'ish {st.distract_dur:.0f}s")

    # ── E. PERCLOS — uzoq muddatli charchoq trendi (60s, o'zgarmadi) ──
    # Bu — qo'shimcha kontekst, tezkor taymerlardan past bo'lsa ham
    # alohida hodisa sifatida jurnalga yoziladi (hisobot uchun foydali)
    if pc >= PERCLOS_L3:
        if st.throttle("p3", 10): st.add_event(3, f"PERCLOS trend {pc*100:.0f}%")
        lvl = max(lvl, 2)  # PERCLOS o'zi Level 3 ga ko'tarmaydi, faqat tasdiqlaydi
    elif pc >= PERCLOS_L2:
        if st.throttle("p2", 10): st.add_event(2, f"PERCLOS trend {pc*100:.0f}%")
    elif pc >= PERCLOS_L1:
        if st.throttle("p1", 10): st.add_event(1, f"PERCLOS trend {pc*100:.0f}%")

    # ── F. Qirpish tezligi (eski mantiq, o'zgarmadi) ──────────────────
    if st.blink_rate > BLINK_HIGH and lvl < 1:
        lvl, msg = 1, f"Tez qirpish {st.blink_rate}/min — charchoq belgisi"
        if st.throttle("bh"): st.add_event(1, f"Yuqori qirpish {st.blink_rate}/min")

    # ── G. Tezlik konteksti ────────────────────────────────────────────
    if st.gps_valid and st.gps_speed and st.gps_speed > 90 and lvl >= 2:
        msg += f" | {st.gps_speed:.0f}km/h"

    # ── H. Normal holatga qaytish xabari ────────────────────────────
    if lvl == 0 and st.alarm_level > 0 and st.throttle("ok", 8):
        st.add_event(0, "Normal holatga qaytildi")

    st.alarm_level = lvl
    st.alarm_msg   = msg

# ══════════════════════════════════════════════════════════════════
#  UI CHIZISH
# ══════════════════════════════════════════════════════════════════
def draw_ui(canvas,frame,st,d,ard):
    H,W=canvas.shape[:2]
    lvl=st.alarm_level; lcol=lvl_color(lvl)
    pct=d["perclos"]*100
    pcol=(C["red"] if d["perclos"]>=PERCLOS_L3 else
          C["orange"] if d["perclos"]>=PERCLOS_L2 else
          C["yellow"] if d["perclos"]>=PERCLOS_L1 else C["green"])

    # TOPBAR
    rf(canvas,0,0,W,48,C["panel"])
    cv2.line(canvas,(0,48),(W,48),C["border"],1)
    rf(canvas,10,8,42,40,C["accent"])
    tx(canvas,"D",18,32,C["white"],0.72,2,FONT_B)
    tx(canvas,"DIGITORA",50,24,C["accent"],0.58,1,FONT_B)
    tx(canvas,f"Driver Monitoring System v5.1  |  {DRIVER_ID}",50,40,C["dim"],0.29)
    txc(canvas,f"SESSIYA  {st.sess_time()}",W//2,20,C["mid"],0.40)
    info=[]
    if st.cabin_temp is not None: info.append(f"Harorat {st.cabin_temp:.1f}C  Nam {st.cabin_hum:.0f}%")
    info.append(f"GPS {st.gps_speed:.0f}km/h {st.gps_sats}sat" if st.gps_valid else "GPS —")
    txc(canvas,"   |   ".join(info),W//2,38,
        C["orange"] if (st.cabin_temp or 0)>=CABIN_HOT_C else C["dim"],0.29)
    ac=C["ok"] if ard.connected else C["err"]
    cv2.circle(canvas,(W-312,22),5,ac,-1)
    txr(canvas,f"ARD  {ard.port}" if ard.connected else "ARD  ULANMAGAN",W-162,26,ac,0.31)
    txr(canvas,f"FPS {st.live_fps}",W-108,20,C["dim"],0.36)
    txr(canvas,datetime.now().strftime("%H:%M:%S"),W-108,38,C["dim"],0.34)
    bb=tuple(max(0,x//6) for x in lcol)
    rf(canvas,W-96,10,W-10,38,bb)
    cv2.rectangle(canvas,(W-96,10),(W-10,38),lcol,1)
    txc(canvas,["NORMAL","CHARCHOQ","XAVF","JIDDIY!"][min(lvl,3)],W-53,28,lcol,0.42,1,FONT_B)

    # LAYOUT
    TOP=54; BOT=H-8; LP=210; RP=200
    CX=LP+6; CY=TOP+4; CW=W-LP-RP-12; CH=min(int(CW*0.50),BOT-TOP-200)

    # CHAP PANEL
    rf(canvas,0,TOP,LP,BOT,C["panel"])
    cv2.line(canvas,(LP,TOP),(LP,BOT),C["border"],1)
    y=TOP+16

    tx(canvas,"KO'Z  KO'RSATKICHLARI",10,y,C["dim"],0.31); y+=8
    cv2.line(canvas,(8,y),(LP-8,y),C["border"],1); y+=10

    rf(canvas,8,y,LP-8,y+70,C["card"])
    cv2.rectangle(canvas,(8,y),(LP-8,y+70),C["border"],1)
    ec=(C["red"] if d["avg_ear"]<EAR_CLOSED else
        C["yellow"] if d["avg_ear"]<EAR_OPEN else C["green"])
    tx(canvas,"EAR  (Ko'z ochiqligi)",14,y+15,C["dim"],0.30)
    tx(canvas,f"{d['avg_ear']:.3f}",14,y+44,ec,0.82,1,FONT_B)
    tx(canvas,"YUMIQ" if d["avg_ear"]<EAR_CLOSED else "OCHIQ",110,y+44,ec,0.36)
    prog_bar(canvas,14,y+52,LP-28,6,d["avg_ear"]/0.45,ec)
    tx(canvas,f"L {d.get('el',0):.2f}",14,y+67,C["dim"],0.28)
    txr(canvas,f"R {d.get('er',0):.2f}",LP-14,y+67,C["dim"],0.28)
    y+=78

    rf(canvas,8,y,LP-8,y+86,C["card"])
    cv2.rectangle(canvas,(8,y),(LP-8,y+86),C["border"],1)
    ps=(["JIDDIY!","Uyqunavorlik","Charchoq","Normal"][
        0 if d["perclos"]>=PERCLOS_L3 else
        1 if d["perclos"]>=PERCLOS_L2 else
        2 if d["perclos"]>=PERCLOS_L1 else 3])
    tx(canvas,"PERCLOS  (60s uyqu indeksi)",14,y+15,C["dim"],0.30)
    tx(canvas,f"{pct:.1f}%",14,y+44,pcol,0.82,1,FONT_B)
    tx(canvas,ps,106,y+44,pcol,0.34)
    prog_bar(canvas,14,y+52,LP-28,6,pct/100,pcol)
    for thr in (15,35,70):
        mx=14+int(thr*(LP-28)/100)
        cv2.line(canvas,(mx,y+52),(mx,y+58),C["dim"],1)
    sparkline(canvas,14,y+64,LP-28,18,[v*100 for v in st.pcl_hist],pcol,0,100)
    y+=94

    # ── TEZKOR TAYMERLAR (Dual-Timer ko'rsatkichi) ────────────────
    rf(canvas,8,y,LP-8,y+66,C["card"])
    cv2.rectangle(canvas,(8,y),(LP-8,y+66),C["border"],1)
    tx(canvas,"TEZKOR  TAYMERLAR",14,y+15,C["dim"],0.30)
    timers = [
        ("Ko'z",   st.eyes_closed_dur, EYES_WARN_SEC,     EYES_DANGER_SEC),
        ("Bosh",   st.head_down_dur,   HEAD_WARN_SEC,     HEAD_DANGER_SEC),
        ("Chalg.", st.distract_dur,    DISTRACT_WARN_SEC, DISTRACT_WARN_SEC),
    ]
    for i,(lab,dur,wt,dt) in enumerate(timers):
        tvx = 14 + i*64
        tcol = (C["red"] if dur>=dt else C["orange"] if dur>=wt else C["dim"])
        tx(canvas,lab,tvx,y+34,C["dim"],0.27)
        tx(canvas,f"{dur:.1f}s",tvx,y+54,tcol,0.40,1,FONT_B if dur>=wt else FONT)
    y+=74

    rf(canvas,8,y,LP-8,y+54,C["card"])
    cv2.rectangle(canvas,(8,y),(LP-8,y+54),C["border"],1)
    bok=BLINK_LOW<=st.blink_rate<=BLINK_HIGH
    bc=C["green"] if bok else C["orange"]
    tx(canvas,"QIRPISH  TEZLIGI",14,y+15,C["dim"],0.30)
    tx(canvas,f"{st.blink_rate}",14,y+40,bc,0.76,1,FONT_B)
    tx(canvas,"/min",52,y+40,C["dim"],0.32)
    tx(canvas,"Normal" if bok else ("Yuqori" if st.blink_rate>BLINK_HIGH else "Past"),
       88,y+40,bc,0.28)
    y+=62

    gx=d.get("gaze_x",0)
    rf(canvas,8,y,LP-8,y+36,C["card"])
    cv2.rectangle(canvas,(8,y),(LP-8,y+36),C["border"],1)
    tx(canvas,"NAZAR  YO'NALISHI",14,y+14,C["dim"],0.30)
    gw=LP-28
    prog_bar(canvas,14,y+22,gw,8,0.5,C["card2"])
    dot_x=int(14+(gx+1)/2*gw)
    gc=C["orange"] if abs(gx)>0.65 else C["teal"]
    cv2.circle(canvas,(dot_x,y+26),5,gc,-1)
    cv2.line(canvas,(14+gw//2,y+22),(14+gw//2,y+30),C["dim"],1)
    y+=44

    tx(canvas,"BOSH  HOLATI  3D",10,y+8,C["dim"],0.31); y+=18
    cv2.line(canvas,(8,y),(LP-8,y),C["border"],1); y+=8
    rf(canvas,8,y,LP-8,y+62,C["card"])
    cv2.rectangle(canvas,(8,y),(LP-8,y+62),C["border"],1)
    for i,(lab,val,wt,dt) in enumerate([
        ("PITCH",d["pitch"],PITCH_WARN,PITCH_DANGER),
        ("YAW",d["yaw"],YAW_WARN,YAW_DANGER),
        ("ROLL",d["roll"],20,35)]):
        vx=14+i*64
        vc=(C["red"] if abs(val)>dt else C["orange"] if abs(val)>wt else C["mid"])
        tx(canvas,lab,vx,y+18,C["dim"],0.29)
        tx(canvas,f"{val:+.0f}",vx,y+42,vc,0.55,1,FONT_B)
        tx(canvas,"deg",vx,y+56,C["dim"],0.26)
    y+=70

    rf(canvas,8,y,LP-8,y+66,C["card"])
    cv2.rectangle(canvas,(8,y),(LP-8,y+66),C["border"],1)
    tx(canvas,"GPS  NEO-6M",14,y+15,C["dim"],0.30)
    if st.gps_valid:
        tx(canvas,f"{st.gps_lat:.5f}",14,y+34,C["green"],0.34)
        tx(canvas,f"{st.gps_lon:.5f}",14,y+50,C["green"],0.34)
        txr(canvas,f"{st.gps_speed:.0f} km/h",LP-14,y+34,C["yellow"],0.40)
        txr(canvas,f"{st.gps_sats} sat",LP-14,y+50,C["dim"],0.30)
        sparkline(canvas,14,y+58,LP-28,6,st.spd_hist,C["blue"],0,150)
    else:
        tx(canvas,"Signal kutilmoqda...",14,y+42,C["dim"],0.34)

    # KAMERA
    if frame is not None:
        fh,fw=frame.shape[:2]
        sc=min(CW/fw,CH/fh); nw=int(fw*sc); nh=int(fh*sc)
        rs=cv2.resize(frame,(nw,nh))
        ox=CX+(CW-nw)//2; oy=CY+(CH-nh)//2
        canvas[oy:oy+nh,ox:ox+nw]=rs
    cv2.rectangle(canvas,(CX,CY),(CX+CW,CY+CH),lcol,1)
    mk=24
    for px,py,sx,sy in [(CX,CY,1,1),(CX+CW,CY,-1,1),(CX,CY+CH,1,-1),(CX+CW,CY+CH,-1,-1)]:
        cv2.line(canvas,(px,py),(px+sx*mk,py),lcol,2)
        cv2.line(canvas,(px,py),(px,py+sy*mk),lcol,2)
    fc=C["green"] if d["face_ok"] else C["red"]
    rf(canvas,CX+6,CY+6,CX+186,CY+26,(8,10,14))
    tx(canvas,"YUZ ANIQLANDI" if d["face_ok"] else "YUZ KO'RINMAYDI",CX+12,CY+20,fc,0.34)
    txr(canvas,f"{st.live_fps} FPS  |  MediaPipe 0.10+",CX+CW-8,CY+20,C["dim"],0.28)

    # ALARM BANNER
    AY=CY+CH+6
    abg={0:(6,22,8),1:(6,24,28),2:(5,16,30),3:(10,6,34)}[min(lvl,3)]
    rf(canvas,CX,AY,CX+CW,AY+32,abg)
    cv2.rectangle(canvas,(CX,AY),(CX+CW,AY+32),lcol,1)
    txc(canvas,st.alarm_msg,CX+CW//2,AY+22,lcol,0.52,1,FONT_B)
    if time.time()-st.power_msg_t<4.0 and st.power_msg:
        txc(canvas,st.power_msg,CX+CW//2,AY+50,C["purple"],0.44,1,FONT_B)

    # GRAFIKLAR
    GY=AY+38; GH=BOT-GY
    if GH>40:
        g3=(CW-12)//3
        for i,(nm,dt2,cl,lo,hi,cur) in enumerate([
            ("EAR tarixi",st.ear_hist,C["teal"],0.08,0.45,f"{d['avg_ear']:.3f}"),
            ("PERCLOS %",[v*100 for v in st.pcl_hist],pcol,0,100,f"{pct:.0f}%"),
            ("Tezlik km/h",st.spd_hist,C["blue"],0,150,
             f"{st.gps_speed:.0f}" if st.gps_speed else "--")]):
            gx0=CX+i*(g3+6)
            rf(canvas,gx0,GY,gx0+g3,GY+GH,C["card"])
            cv2.rectangle(canvas,(gx0,GY),(gx0+g3,GY+GH),C["border"],1)
            tx(canvas,nm,gx0+8,GY+14,C["dim"],0.29)
            txr(canvas,cur,gx0+g3-8,GY+14,cl,0.29)
            sparkline(canvas,gx0+6,GY+22,g3-12,GH-28,dt2,cl,lo,hi)

    # O'NG PANEL
    RX=W-RP
    rf(canvas,RX,TOP,W,BOT,C["panel"])
    cv2.line(canvas,(RX,TOP),(RX,BOT),C["border"],1)
    ry=TOP+14

    tx(canvas,"QURILMALAR  HOLATI",RX+10,ry,C["dim"],0.30); ry+=10
    cv2.line(canvas,(RX+8,ry),(W-8,ry),C["border"],1); ry+=10
    rf(canvas,RX+8,ry,W-8,ry+148,C["card"])
    cv2.rectangle(canvas,(RX+8,ry),(W-8,ry+148),C["border"],1)
    sm={"OK":"OK","TAYYOR":"OK","XATO":"XATO","KUTILMOQDA":"...","SIGNAL YOQ":"SIG—","ULANMAGAN":"—"}
    for j,(dn,ds) in enumerate([
        ("GPS NEO-6M",   ard.dev_gps    if ard.connected else "ULANMAGAN"),
        ("DHT11 Harorat",ard.dev_dht    if ard.connected else "ULANMAGAN"),
        ("Buzzer",       ard.dev_buzzer if ard.connected else "ULANMAGAN"),
        ("RGB LED",      ard.dev_rgb    if ard.connected else "ULANMAGAN"),
        ("Tugma 1 Snooze","TAYYOR"      if ard.connected else "ULANMAGAN"),
        ("Tugma 2 Power","TAYYOR"       if ard.connected else "ULANMAGAN"),
        ("Arduino UNO",  "OK"           if ard.connected else "ULANMAGAN")]):
        dy=ry+16+j*19
        dev_dot(canvas,RX+18,dy,ds,dn)
        sc2=(C["ok"] if ds in("OK","TAYYOR") else
             C["err"] if ds=="XATO" else
             C["warn"] if ds in("KUTILMOQDA","SIGNAL YOQ") else C["off"])
        txr(canvas,sm.get(ds,ds[:5]),W-14,dy+4,sc2,0.28)
    ry+=156

    tx(canvas,"UYQU  INDIKATORI",RX+10,ry+6,C["dim"],0.30); ry+=16
    cv2.line(canvas,(RX+8,ry),(W-8,ry),C["border"],1); ry+=8
    rf(canvas,RX+8,ry,W-8,ry+106,C["card"])
    cv2.rectangle(canvas,(RX+8,ry),(W-8,ry+106),C["border"],1)
    arc_gauge(canvas,RX+RP//2,ry+54,40,pct/100,pcol,f"{pct:.0f}%","PERCLOS")
    ry+=114

    tx(canvas,"BOSH  KOMPASI",RX+10,ry+6,C["dim"],0.30); ry+=16
    cv2.line(canvas,(RX+8,ry),(W-8,ry),C["border"],1); ry+=8
    rf(canvas,RX+8,ry,W-8,ry+102,C["card"])
    cv2.rectangle(canvas,(RX+8,ry),(W-8,ry+102),C["border"],1)
    compass_w(canvas,RX+RP//2,ry+46,38,d["yaw"],d["pitch"])
    tx(canvas,f"Yaw {d['yaw']:+.0f}°",RX+14,ry+94,C["dim"],0.28)
    txr(canvas,f"Pitch {d['pitch']:+.0f}°",W-14,ry+94,C["dim"],0.28)
    ry+=110

    tx(canvas,"SESSIYA  STATISTIKA",RX+10,ry+6,C["dim"],0.30); ry+=16
    cv2.line(canvas,(RX+8,ry),(W-8,ry),C["border"],1); ry+=8
    rf(canvas,RX+8,ry,W-8,ry+80,C["card"])
    cv2.rectangle(canvas,(RX+8,ry),(W-8,ry+80),C["border"],1)
    for i,(k,v,vc) in enumerate([
        ("Jami qirpish",str(st.total_blink),C["teal"]),
        ("Ogohlantirish",str(st.total_alerts),C["yellow"]),
        ("Xavfli hodisa",str(st.total_danger),C["red"]),
        ("Sessiya vaqti",st.sess_time(),C["mid"]),
        ("Jetson holati","YOQIQ" if st.jetson_on else "O'CHIQ",
         C["ok"] if st.jetson_on else C["err"])]):
        iy=ry+15+i*14
        tx(canvas,k,RX+14,iy,C["dim"],0.29)
        txr(canvas,v,W-14,iy,vc,0.30)
    ry+=88

    tx(canvas,"HODISALAR  JURNALI",RX+10,ry+6,C["dim"],0.30); ry+=16
    cv2.line(canvas,(RX+8,ry),(W-8,ry),C["border"],1); ry+=6
    ec_map={0:C["mid"],1:C["yellow"],2:C["orange"],3:C["red"]}
    for ev in list(st.events):
        if ry+26>BOT: break
        rf(canvas,RX+8,ry,W-8,ry+24,C["card"])
        ec=ec_map.get(ev["lvl"],C["mid"])
        cv2.circle(canvas,(RX+17,ry+12),3,ec,-1)
        tx(canvas,ev["txt"][:24],RX+26,ry+16,ec,0.27)
        txr(canvas,ev["time"],W-10,ry+16,C["dim"],0.25)
        ry+=26

# ══════════════════════════════════════════════════════════════════
#  ASOSIY DASTUR
# ══════════════════════════════════════════════════════════════════
def main():
    print("="*58)
    print("  DIGITORA DMS — Jetson Nano v5.1  (MediaPipe 0.10+)")
    print("="*58)

    if not ensure_model():
        input("Model faylni yuklab, ENTER bosing...")
        if not ensure_model():
            print("  [!] Model fayl kerak. Dastur to'xtaydi.")
            return

    print("  Face Landmarker yuklanmoqda...")
    try:
        tracker = FaceTracker(MODEL_FILE)
        print("  [OK] Face Landmarker tayyor")
    except Exception as e:
        print(f"  [!] Face Landmarker xato: {e}")
        return

    cap, cam_name = open_camera()
    if cap is None:
        print("  [!] Kamera topilmadi!")
        return

    ard    = Arduino()
    st     = State()
    ws     = WsSender()
    fs     = FrameSender()         # ← VIDEO YUBORISH
    last_ws_send = 0.0
    canvas = np.zeros((CANVAS_H,CANVAS_W,3),dtype=np.uint8)
    cv2.namedWindow("Digitora DMS", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Digitora DMS", CANVAS_W, CANVAS_H)

    st.add_event(0,"Tizim ishga tushdi")
    st.add_event(0,f"Kamera: {cam_name}")
    print(f"  [OK] Kamera: {cam_name}  |  Chiqish: Q / ESC")

    while True:
        ret,frame=cap.read()
        if not ret or frame is None:
            print("  [!] Kamera signal yo'qoldi"); break

        frame=cv2.flip(frame,1)
        ih,iw=frame.shape[:2]

        # ── VIDEO KADRINI SERVERGA YUBORISH (FrameSender) ─────────
        fs.update(frame)

        st.fps_cnt+=1
        if time.time()-st.fps_t>=1.0:
            st.live_fps=st.fps_cnt; st.fps_cnt=0; st.fps_t=time.time()

        d={"face_ok":False,"avg_ear":0.,"el":0.,"er":0.,
           "perclos":0.,"pitch":0.,"yaw":0.,"roll":0.,"gaze_x":0.,"gaze_y":0.}

        lm_list = tracker.process(frame)

        if lm_list is None:
            if st.face_gone_t is None: st.face_gone_t=time.time()
            gone=time.time()-st.face_gone_t
            if gone>=FACE_GONE_DANGER_SEC:
                # Yuz uzoq vaqt ko'rinmasa — bu "haydovchi pastga
                # ketib, uxlab qolgan" yoki kameradan chetga chiqib
                # ketgan degani, eng xavfli holat sifatida baholanadi.
                st.alarm_level=3
                st.alarm_msg=f"HAYDOVCHI KO'RINMAYDI ({gone:.0f}s) — XAVFLI!"
                if st.throttle("fg3",4): st.add_event(3,f"Yuz {gone:.0f}s ko'rinmadi")
            elif gone>1.0:
                st.alarm_level=max(st.alarm_level,1)
                st.alarm_msg=f"Yuz vaqtincha ko'rinmayapti ({gone:.1f}s)"
                if st.throttle("fg1"): st.add_event(1,"Yuz vaqtincha ko'rinmadi")
            st.perclos_buf.append(1)
        else:
            st.face_gone_t=None; d["face_ok"]=True
            el=calc_ear(lm_list,LEFT_EYE); er=calc_ear(lm_list,RIGHT_EYE)
            st.ear_buf.append((el+er)/2)
            avg=sum(st.ear_buf)/len(st.ear_buf)
            d["el"],d["er"],d["avg_ear"]=round(el,3),round(er,3),round(avg,3)

            closed=avg<EAR_CLOSED
            st.perclos_buf.append(1 if closed else 0)

            if closed and not st.blink_state: st.blink_state=True
            elif not closed and st.blink_state:
                st.blink_state=False; st.blink_count+=1; st.total_blink+=1
            elap=time.time()-st.blink_win_t
            if elap>=60: st.blink_rate,st.blink_count,st.blink_win_t=st.blink_count,0,time.time()
            else: st.blink_rate=int(st.blink_count/max(elap,1)*60)

            d["perclos"]=round(sum(st.perclos_buf)/len(st.perclos_buf),4)

            p,yw,rl=calc_head_pose(lm_list,iw,ih)
            st.pitch_buf.append(p); st.yaw_buf.append(yw)
            d["pitch"]=round(sum(st.pitch_buf)/len(st.pitch_buf),1)
            d["yaw"]=round(sum(st.yaw_buf)/len(st.yaw_buf),1)
            d["roll"]=round(rl,1)

            gxl,gyl=calc_gaze(lm_list,LEFT_EYE,LEFT_IRIS)
            gxr,gyr=calc_gaze(lm_list,RIGHT_EYE,RIGHT_IRIS)
            d["gaze_x"]=round((gxl+gxr)/2,2)

            # Yuz HUD
            col=lvl_color(st.alarm_level)
            dim=tuple(x//3 for x in col)
            for i in range(len(FACE_OVAL)-1):
                p1=(int(lm_list[FACE_OVAL[i]].x*iw),int(lm_list[FACE_OVAL[i]].y*ih))
                p2=(int(lm_list[FACE_OVAL[i+1]].x*iw),int(lm_list[FACE_OVAL[i+1]].y*ih))
                cv2.line(frame,p1,p2,dim,1,cv2.LINE_AA)
            ec2=C["red"] if avg<EAR_CLOSED else C["teal"]
            for idx in (LEFT_EYE,RIGHT_EYE):
                pts=np.array([[int(lm_list[i].x*iw),int(lm_list[i].y*ih)] for i in idx],np.int32)
                cv2.polylines(frame,[pts],True,ec2,1,cv2.LINE_AA)

            analyze(st,d)

        ard.set_level(st.alarm_level)

        if ard.pop_snooze():
            st.add_event(0,"Tugma 1: Snooze — uyg'oqman")
            half=len(st.perclos_buf)//2
            for _ in range(half): st.perclos_buf.popleft()

        jcmd=ard.pop_jetson_cmd()
        if jcmd=="OFF":
            st.add_event(1,"Tugma 2: Jetson o'chirilmoqda!")
            st.set_power_msg("JETSON O'CHIRILMOQDA...")
            st.jetson_on=False; ard.confirm_jetson(False)
            import subprocess
            try: subprocess.Popen(["sudo","shutdown","-h","now"])
            except Exception as e: print(f"  [!] Shutdown: {e}")
        elif jcmd=="ON":
            st.add_event(0,"Tugma 2: Jetson yoqildi")
            st.set_power_msg("JETSON YOQILDI")
            st.jetson_on=True; ard.confirm_jetson(True)

        if ard.temp is not None:
            st.cabin_temp=ard.temp; st.cabin_hum=ard.hum
            if ard.temp>=CABIN_HOT_C and st.throttle("hot",120):
                st.add_event(1,f"Kabina issiq {ard.temp:.0f}C")

        if ard.gps_valid:
            st.gps_lat=ard.gps_lat; st.gps_lon=ard.gps_lon
            st.gps_speed=ard.gps_speed; st.gps_sats=ard.gps_sats
            st.gps_valid=True
        else: st.gps_valid=False

        st.ear_hist.append(d["avg_ear"])
        st.pcl_hist.append(d["perclos"])
        st.yaw_hist.append(d["yaw"])
        st.spd_hist.append(st.gps_speed or 0)

        # ── SERVERGA PAKET YUBORISH ───────────────────────────────
        now_t = time.time()
        if now_t - last_ws_send >= WS_SEND_INTERVAL:
            last_ws_send = now_t
            packet = {
                "device_id":   DEVICE_ID,
                "driver_name": DRIVER_ID,
                "timestamp":   datetime.now(timezone.utc).isoformat(),
                "alarm_level": st.alarm_level,
                "alarm_msg":   st.alarm_msg,
                "perclos":     round(d["perclos"], 4),
                "gps": {
                    "lat":   st.gps_lat   or 0.0,
                    "lon":   st.gps_lon   or 0.0,
                    "speed": st.gps_speed or 0.0,
                },
                "cabin": {
                    "temp":     st.cabin_temp or 0.0,
                    "humidity": st.cabin_hum  or 0.0,
                },
            }
            ws.send(packet)
            icons  = ["🟢","🟡","🟠","🔴"]
            ws_st  = "WS✓" if ws.connected else "WS✗"
            print(f"  {icons[min(st.alarm_level,3)]} L{st.alarm_level} | "
                  f"PERCLOS={d['perclos']:.3f} | {ws_st} | "
                  f"{st.alarm_msg[:35]}")

        canvas[:]=C["bg"]
        draw_ui(canvas,frame,st,d,ard)
        cv2.imshow("Digitora DMS",canvas)
        if cv2.waitKey(1)&0xFF in (ord('q'),ord('Q'),27): break

    cap.release(); cv2.destroyAllWindows(); tracker.close(); ard.close()
    print(f"\n  Yakunlandi | Sessiya: {st.sess_time()}")
    print(f"  Qirpish: {st.total_blink} | Ogohlantirish: {st.total_alerts} | Xavf: {st.total_danger}")

if __name__=="__main__":
    main()