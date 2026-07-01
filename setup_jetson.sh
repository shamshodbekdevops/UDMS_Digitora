#!/bin/bash
set -e

APP_DIR="${1:-/home/jetson/Desktop/DMS/sinov1}"
SERVICE_NAME="${SERVICE_NAME:-digitora-dms}"

echo "[1/4] Installing Python packages"
python3 -m pip install --upgrade pip
python3 -m pip install mediapipe websockets opencv-python numpy

echo "[2/4] Copying service file"
mkdir -p "${APP_DIR}"
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=DIGITORA Jetson Live Sender
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
Environment=DIGITORA_WS_URL=ws://45.130.164.189/ws/dms/
Environment=DIGITORA_DEVICE_ID=DGT-002
Environment=DIGITORA_DRIVER_NAME=Bobur Rahimov
ExecStart=/usr/bin/python3 ${APP_DIR}/jetson.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "[3/4] Enabling service"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"

echo "[4/4] Done"
echo "Start it with: sudo systemctl start ${SERVICE_NAME}"
