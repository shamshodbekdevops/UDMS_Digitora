/**
 * Mock WebSocket data generator - used only as a fallback in local dev.
 * Simulates the 2 real devices when backend is unavailable.
 */
import { useEffect, useRef } from "react";
import type { WsPacket } from "@/types";

const DEVICES = [
  { device_id: "DGT-001", driver_name: "Shamshod Toshqobilov", lat: 41.2995, lon: 69.2401 },
  { device_id: "DGT-002", driver_name: "Bobur Rahimov",         lat: 41.3113, lon: 69.2797 },
];

const ALARM_MSGS: Record<number, string[]> = {
  0: ["Normal holat", "Haydovchi hushyor"],
  1: ["Diqqat pasayishi sezilyapti", "Bosh silkish bor"],
  2: ["MIKRO-UYQU! Ko'z yumiq (5s)", "OGOHLANTIRISH! Charchoq kuchli"],
  3: ["XAVF! Haydovchi uxlab qoldi!", "KRITIK! Ko'z 10s+ yumiq"],
};

function pickLevel(): number {
  const r = Math.random();
  if (r < 0.70) return 0;
  if (r < 0.88) return 1;
  if (r < 0.97) return 2;
  return 3;
}

function buildPacket(d: (typeof DEVICES)[0], lat: number, lon: number): WsPacket {
  const level = pickLevel() as 0 | 1 | 2 | 3;
  const perclosRange = [[0, 0.12], [0.13, 0.25], [0.26, 0.45], [0.46, 0.90]][level];
  const perclos = Number((Math.random() * (perclosRange[1] - perclosRange[0]) + perclosRange[0]).toFixed(3));
  return {
    device_id: d.device_id,
    driver_name: d.driver_name,
    timestamp: new Date().toISOString(),
    alarm_level: level,
    alarm_msg: ALARM_MSGS[level][Math.floor(Math.random() * ALARM_MSGS[level].length)],
    perclos,
    gps: { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)), speed: Number((40 + Math.random() * 50).toFixed(1)) },
    cabin: { temp: Number((22 + Math.random() * 10).toFixed(1)), humidity: Number((35 + Math.random() * 30).toFixed(1)) },
  };
}

export function useMockWs(onPacket: (p: WsPacket) => void, enabled = true) {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const coords = useRef(DEVICES.map((d) => ({ lat: d.lat, lon: d.lon })));

  useEffect(() => {
    if (!enabled) return;

    DEVICES.forEach((device, i) => {
      const tick = () => {
        coords.current[i].lat += (Math.random() - 0.5) * 0.0006;
        coords.current[i].lon += (Math.random() - 0.5) * 0.0006;
        onPacket(buildPacket(device, coords.current[i].lat, coords.current[i].lon));
        const interval = 3000 + Math.random() * 4000;
        timers.current[i] = setTimeout(tick, interval);
      };
      timers.current[i] = setTimeout(tick, i * 400);
    });

    return () => timers.current.forEach(clearTimeout);
  }, [enabled, onPacket]);
}
