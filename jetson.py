"""
DIGITORA DMS - Jetson live sender
Sends real-time packets for device DGT-002 to the backend websocket.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import threading
import time
import urllib.request
from collections import deque
from datetime import datetime, timezone

import cv2
import numpy as np

try:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision
    from mediapipe.tasks.python.vision.core.vision_task_running_mode import VisionTaskRunningMode
except ImportError as exc:
    raise SystemExit("Install mediapipe first: pip install mediapipe") from exc

try:
    import websockets
except ImportError as exc:
    raise SystemExit("Install websockets first: pip install websockets") from exc


DEVICE_ID = os.getenv("DIGITORA_DEVICE_ID", "DGT-002")
DRIVER_NAME = os.getenv("DIGITORA_DRIVER_NAME", "Bobur Rahimov")
WS_URL = os.getenv("DIGITORA_WS_URL", "ws://45.130.164.189/ws/dms/")
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "face_landmarker.task")
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)

LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]

EAR_THRESHOLD = 0.22
PERCLOS_WINDOW_SEC = 4.0
SEND_INTERVAL_SEC = 2.0


def ensure_model() -> str:
    if os.path.exists(MODEL_PATH):
        return MODEL_PATH
    os.makedirs(MODEL_DIR, exist_ok=True)
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    return MODEL_PATH


def ear(landmarks, idxs) -> float:
    points = [landmarks[i] for i in idxs]
    vertical_1 = math.hypot(points[1].x - points[5].x, points[1].y - points[5].y)
    vertical_2 = math.hypot(points[2].x - points[4].x, points[2].y - points[4].y)
    horizontal = math.hypot(points[0].x - points[3].x, points[0].y - points[3].y)
    return (vertical_1 + vertical_2) / (2.0 * horizontal + 1e-6)


def alarm_from_perclos(value: float) -> tuple[int, str]:
    if value < 0.15:
        return 0, "Normal holat"
    if value < 0.28:
        return 1, "Diqqat pasaydi"
    if value < 0.50:
        return 2, "Mikro-uyqu belgilari"
    return 3, "Xavf! Haydovchi uyquga ketmoqda"


class FaceLandmarker:
    def __init__(self, model_path: str):
        options = mp_vision.FaceLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=model_path),
            running_mode=VisionTaskRunningMode.VIDEO,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.landmarker = mp_vision.FaceLandmarker.create_from_options(options)
        self.timestamp = 0

    def process(self, frame: np.ndarray):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        self.timestamp += 33
        result = self.landmarker.detect_for_video(image, self.timestamp)
        if result.face_landmarks:
            return result.face_landmarks[0]
        return None

    def close(self) -> None:
        self.landmarker.close()


class WsSender:
    def __init__(self, url: str):
        self.url = url
        self.loop = asyncio.new_event_loop()
        self.queue: asyncio.Queue = asyncio.Queue()
        threading.Thread(target=self._run, daemon=True).start()

    def _run(self) -> None:
        asyncio.set_event_loop(self.loop)
        self.loop.run_until_complete(self._runner())

    async def _runner(self) -> None:
        while True:
            try:
                async with websockets.connect(self.url) as ws:
                    while True:
                        payload = await self.queue.get()
                        await ws.send(json.dumps(payload))
            except Exception:
                await asyncio.sleep(5)

    def send(self, payload: dict) -> None:
        self.loop.call_soon_threadsafe(self.queue.put_nowait, payload)


def build_packet(perclos: float, alarm_level: int, alarm_msg: str) -> dict:
    gps_lat = float(os.getenv("DIGITORA_GPS_LAT", "41.3113"))
    gps_lon = float(os.getenv("DIGITORA_GPS_LON", "69.2797"))
    gps_speed = float(os.getenv("DIGITORA_GPS_SPEED", "0"))
    cabin_temp = float(os.getenv("DIGITORA_CABIN_TEMP", "25"))
    cabin_hum = float(os.getenv("DIGITORA_CABIN_HUM", "45"))
    return {
        "device_id": DEVICE_ID,
        "driver_name": DRIVER_NAME,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "alarm_level": alarm_level,
        "alarm_msg": alarm_msg,
        "perclos": round(perclos, 4),
        "gps": {"lat": gps_lat, "lon": gps_lon, "speed": gps_speed},
        "cabin": {"temp": cabin_temp, "humidity": cabin_hum},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="DIGITORA Jetson live sender")
    parser.add_argument("--camera", type=int, default=0)
    parser.add_argument("--ws-url", default=WS_URL)
    args = parser.parse_args()

    model_path = ensure_model()
    detector = FaceLandmarker(model_path)
    sender = WsSender(args.ws_url)
    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        raise SystemExit(f"Camera {args.camera} could not be opened")

    eye_history: deque[tuple[float, bool]] = deque()
    last_send = 0.0

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            now = time.time()
            landmarks = detector.process(frame)
            perclos = 0.0
            alarm_level = 0
            alarm_msg = "Yuz aniqlanmadi"

            if landmarks is not None:
                avg_ear = (ear(landmarks, LEFT_EYE) + ear(landmarks, RIGHT_EYE)) / 2.0
                closed = avg_ear < EAR_THRESHOLD
                eye_history.append((now, closed))
                cutoff = now - PERCLOS_WINDOW_SEC
                while eye_history and eye_history[0][0] < cutoff:
                    eye_history.popleft()
                perclos = sum(1 for _, is_closed in eye_history if is_closed) / max(len(eye_history), 1)
                alarm_level, alarm_msg = alarm_from_perclos(perclos)

            if now - last_send >= SEND_INTERVAL_SEC:
                last_send = now
                sender.send(build_packet(perclos, alarm_level, alarm_msg))
                print(f"[{DEVICE_ID}] L{alarm_level} perclos={perclos:.3f} {alarm_msg}")

    finally:
        cap.release()
        detector.close()


if __name__ == "__main__":
    main()
