#!/bin/bash
# ================================================================
#  DIGITORA DMS — Jetson Nano Avtomatik Sozlash Skripti
#  Bir marta ishga tushiring, keyin hamma narsa avtomatik
#
#  Ishlatish:
#    chmod +x setup_jetson.sh
#    sudo ./setup_jetson.sh
# ================================================================

set -e
echo "======================================================"
echo "  DIGITORA DMS — Jetson Sozlash"
echo "======================================================"

DMS_DIR="/home/jetson/Desktop/DMS/sinov1"
JETSON_USER="jetson"

# ── 1. Kerakli kutubxonalarni o'rnatish ──────────────────────────
echo "[1/5] Kutubxonalar o'rnatilmoqda..."
pip3 install websockets aiortc aiohttp av 2>/dev/null || true

# ── 2. Auto WiFi skriptini yaratish ──────────────────────────────
echo "[2/5] Auto WiFi skripti yaratilmoqda..."
cat > /usr/local/bin/digitora-wifi.py << 'WIFI_EOF'
#!/usr/bin/env python3
"""
DIGITORA Auto WiFi — Ochiq WiFi tarmoqlarni topib, ulanadi.
Jetson yoqilganda avtomatik ishga tushadi (systemd orqali).
"""
import subprocess
import time
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [WiFi] %(message)s',
    datefmt='%H:%M:%S'
)
log = logging.getLogger()

# Birinchi navbatda ulanishga harakat qilinadigan tarmoqlar
# (avval bilasiz degan tarmoqlar — masalan hackathon joyi WiFi si)
PREFERRED_SSIDS = [
    # "HackathonWiFi",   # ← bu yerga ma'lum SSID larni qo'shing
    # "LivingLab",
]

def run(cmd):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        return r.stdout.strip(), r.returncode == 0
    except Exception as e:
        return str(e), False

def is_connected():
    out, ok = run(["nmcli", "-t", "-f", "STATE", "general"])
    return "connected" in out

def get_open_networks():
    """Ochiq (parolsiz) WiFi tarmoqlarni topish"""
    # Avval skan qilish
    run(["nmcli", "device", "wifi", "rescan"])
    time.sleep(2)

    out, _ = run(["nmcli", "-t", "-f", "SSID,SECURITY,SIGNAL",
                  "device", "wifi", "list"])
    networks = []
    for line in out.splitlines():
        parts = line.split(":")
        if len(parts) >= 3:
            ssid     = parts[0].strip()
            security = parts[1].strip()
            try:
                signal = int(parts[2])
            except:
                signal = 0
            # Security bo'sh yoki "--" = ochiq tarmoq
            if ssid and security in ("", "--", " "):
                networks.append((ssid, signal))

    # Signal kuchiga qarab tartiblash (kuchli birinchi)
    networks.sort(key=lambda x: x[1], reverse=True)
    return [ssid for ssid, _ in networks]

def connect(ssid):
    log.info(f"Ulanishga harakat: '{ssid}'")
    _, ok = run(["nmcli", "device", "wifi", "connect", ssid])
    if ok:
        log.info(f"Muvaffaqiyatli ulandi: '{ssid}'")
        return True
    log.warning(f"Ulanib bo'lmadi: '{ssid}'")
    return False

def main():
    log.info("DIGITORA Auto WiFi ishga tushdi")
    consecutive_fails = 0

    while True:
        if is_connected():
            log.info("Internet bor — kutilmoqda...")
            consecutive_fails = 0
            time.sleep(30)
            continue

        log.info("Internet yo'q — WiFi qidirilmoqda...")

        # 1. Afzal tarmoqlarga ulanishga harakat
        for ssid in PREFERRED_SSIDS:
            if connect(ssid):
                time.sleep(5)
                if is_connected():
                    break

        if is_connected():
            continue

        # 2. Barcha ochiq tarmoqlarga ulanishga harakat
        open_nets = get_open_networks()
        if not open_nets:
            log.warning("Ochiq tarmoq topilmadi")
            consecutive_fails += 1
        else:
            log.info(f"Topilgan ochiq tarmoqlar: {open_nets}")
            for ssid in open_nets:
                if connect(ssid):
                    time.sleep(5)
                    if is_connected():
                        log.info(f"Internet mavjud! Tarmoq: '{ssid}'")
                        consecutive_fails = 0
                        break
            else:
                consecutive_fails += 1

        # Ko'p urinishda vaqtni uzaytirish
        wait = min(15 * consecutive_fails, 120)
        time.sleep(max(wait, 15))

if __name__ == "__main__":
    main()
WIFI_EOF

chmod +x /usr/local/bin/digitora-wifi.py

# ── 3. DMS systemd service yaratish ──────────────────────────────
echo "[3/5] DMS systemd service yaratilmoqda..."
cat > /etc/systemd/system/digitora-dms.service << SERVICE_EOF
[Unit]
Description=DIGITORA Driver Monitoring System
# Internet tayyor bo'lguncha kutish
After=network-online.target
Wants=network-online.target
# WiFi skripti ishga tushgandan keyin boshlansin
After=digitora-wifi.service

[Service]
Type=simple
User=${JETSON_USER}
WorkingDirectory=${DMS_DIR}
# HEADLESS=1 — monitor kerak emas
Environment="DIGITORA_HEADLESS=1"
Environment="DISPLAY=:0"
ExecStartPre=/bin/sleep 15
ExecStart=/usr/bin/python3 ${DMS_DIR}/jetson.py
# Xato bo'lsa 10s kutib qayta ishga tushirish
Restart=always
RestartSec=10
# Log fayli
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# ── 4. WiFi systemd service yaratish ─────────────────────────────
echo "[4/5] WiFi systemd service yaratilmoqda..."
cat > /etc/systemd/system/digitora-wifi.service << WSERVICE_EOF
[Unit]
Description=DIGITORA Auto WiFi Connect
After=NetworkManager.service
Wants=NetworkManager.service

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /usr/local/bin/digitora-wifi.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
WSERVICE_EOF

# ── 5. Servicelarni yoqish ────────────────────────────────────────
echo "[5/5] Servicelar yoqilmoqda..."
systemctl daemon-reload
systemctl enable digitora-wifi.service
systemctl enable digitora-dms.service
systemctl start digitora-wifi.service

echo ""
echo "======================================================"
echo "  Sozlash tugadi!"
echo ""
echo "  Holat tekshirish:"
echo "    sudo systemctl status digitora-wifi"
echo "    sudo systemctl status digitora-dms"
echo ""
echo "  Loglarni ko'rish:"
echo "    sudo journalctl -u digitora-dms -f"
echo "    sudo journalctl -u digitora-wifi -f"
echo ""
echo "  DMS ni hozir ishga tushirish:"
echo "    sudo systemctl start digitora-dms"
echo ""
echo "  Keyingi rebootdan keyin — hammasi AVTOMATIK!"
echo "======================================================"
