"""
DIGITORA — Jetson Mock Simulator
Simulates 9 Jetson devices sending real-time DMS data via WebSocket.

Usage:
    pip install websockets
    python jetson_mock.py [--host localhost] [--port 8000]

Each device sends a packet every 3-7 seconds with randomised alarm levels:
  70% Level 0 (safe), 18% Level 1 (caution), 9% Level 2 (warning), 3% Level 3 (danger)
"""

import asyncio
import json
import random
import argparse
from datetime import datetime, timezone

try:
    import websockets
except ImportError:
    raise SystemExit("Install websockets first:  pip install websockets")


# --- Device definitions ---
DEVICES = [
    {"device_id": "DGT-001", "driver_name": "Shamshod Toshqobilov",
     "base_lat": 41.2995, "base_lon": 69.2401},
    {"device_id": "DGT-002", "driver_name": "Bobur Rahimov",
     "base_lat": 41.3113, "base_lon": 69.2797},
    {"device_id": "DGT-003", "driver_name": "Jasur Yusupov",
     "base_lat": 41.5522, "base_lon": 69.1341},
    {"device_id": "DGT-004", "driver_name": "Dilshod Nazarov",
     "base_lat": 40.9983, "base_lon": 69.3342},
    {"device_id": "DGT-005", "driver_name": "Sanjar Karimov",
     "base_lat": 41.0211, "base_lon": 71.4736},
    {"device_id": "DGT-006", "driver_name": "Ulugbek Mirzayev",
     "base_lat": 40.3696, "base_lon": 71.7975},
    {"device_id": "DGT-007", "driver_name": "Behruz Xasanov",
     "base_lat": 39.6547, "base_lon": 66.9758},
    {"device_id": "DGT-008", "driver_name": "Timur Ergashev",
     "base_lat": 41.4023, "base_lon": 69.5102},
    {"device_id": "DGT-009", "driver_name": "Nodir Abdullayev",
     "base_lat": 40.7891, "base_lon": 72.3441},
]

ALARM_MESSAGES = {
    0: ["Normal holat", "Haydovchi hushyor", "Ko'z ochiq", "Diqqat normal"],
    1: ["Diqqat pasayishi sezilyapti", "Ko'z ko'p qimirlamoqda", "Bosh silkish bor"],
    2: ["MIKRO-UYQU! Ko'z yumiq (5s)", "OGOHLANTIRISH! Charchoq belgilari kuchli",
        "Haydovchi miyig'ida uxlamoqda"],
    3: ["XAVF! Haydovchi uxlab qoldi!", "KRITIK! Ko'z 10s+ yumiq",
        "DARHOL TO'XTATISH KERAK! Haydovchi hushsiz"],
}

PERCLOS_RANGE = {
    0: (0.0, 0.12),
    1: (0.13, 0.25),
    2: (0.26, 0.45),
    3: (0.46, 0.90),
}


def pick_alarm_level() -> int:
    return random.choices([0, 1, 2, 3], weights=[70, 18, 9, 3])[0]


def build_packet(device: dict, lat: float, lon: float) -> dict:
    level = pick_alarm_level()
    lo, hi = PERCLOS_RANGE[level]
    perclos = round(random.uniform(lo, hi), 3)
    speed = round(random.uniform(40, 90), 1) if level < 3 else round(random.uniform(0, 20), 1)
    return {
        "device_id": device["device_id"],
        "driver_name": device["driver_name"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "alarm_level": level,
        "alarm_msg": random.choice(ALARM_MESSAGES[level]),
        "perclos": perclos,
        "gps": {"lat": round(lat, 6), "lon": round(lon, 6), "speed": speed},
        "cabin": {
            "temp": round(random.uniform(22, 32), 1),
            "humidity": round(random.uniform(35, 65), 1),
        },
    }


async def simulate_device(device: dict, ws_url: str):
    lat = device["base_lat"]
    lon = device["base_lon"]
    # Stagger startup so all devices don't send at exactly the same time
    await asyncio.sleep(random.uniform(0, 3))

    while True:
        try:
            async with websockets.connect(ws_url) as ws:
                print(f"[{device['device_id']}] Connected to {ws_url}")
                while True:
                    # Simulate slight GPS drift (vehicle moving)
                    lat += random.uniform(-0.0003, 0.0003)
                    lon += random.uniform(-0.0003, 0.0003)
                    packet = build_packet(device, lat, lon)
                    await ws.send(json.dumps(packet))
                    level_emoji = ["🟢", "🟡", "🟠", "🔴"][packet["alarm_level"]]
                    print(
                        f"[{device['device_id']}] {level_emoji} L{packet['alarm_level']} "
                        f"PERCLOS={packet['perclos']:.3f}  {packet['alarm_msg']}"
                    )
                    interval = random.uniform(3, 7) if packet["alarm_level"] < 2 else random.uniform(1, 3)
                    await asyncio.sleep(interval)
        except (OSError, websockets.exceptions.ConnectionClosed) as e:
            print(f"[{device['device_id']}] Disconnected ({e}), retrying in 5s…")
            await asyncio.sleep(5)


async def main(host: str, port: int):
    ws_url = f"ws://{host}:{port}/ws/dms/"
    print(f"DIGITORA Mock — connecting {len(DEVICES)} devices to {ws_url}")
    print("Press Ctrl+C to stop\n")
    await asyncio.gather(*(simulate_device(d, ws_url) for d in DEVICES))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DIGITORA Jetson Mock Simulator")
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    try:
        asyncio.run(main(args.host, args.port))
    except KeyboardInterrupt:
        print("\nSimulator stopped.")
