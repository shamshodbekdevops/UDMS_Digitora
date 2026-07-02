import { create } from "zustand";
import type { Device, WsPacket, AlertEvent, AlarmLevel, LiveStatus } from "@/types";

interface FleetState {
  devices: Device[];
  activeAlerts: AlertEvent[];
  setDevices: (devices: Device[]) => void;
  applyWsPacket: (packet: WsPacket) => void;
  patchDevice: (device_id: string, live: Partial<LiveStatus>) => void;
  addAlert: (alert: AlertEvent) => void;
  dismissAlert: (id: number) => void;
}

export const useFleetStore = create<FleetState>((set) => ({
  devices: [],
  activeAlerts: [],

  setDevices: (devices) => set({ devices }),

  applyWsPacket: (packet) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.device_id === packet.device_id
          ? {
              ...d,
              live: {
                alarm_level: packet.alarm_level,
                last_seen: packet.timestamp,
                gps_lat: packet.gps?.lat ?? null,
                gps_lon: packet.gps?.lon ?? null,
                gps_speed: packet.gps?.speed ?? null,
                perclos: packet.perclos,
              },
            }
          : d
      ),
    })),

  patchDevice: (device_id, live) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.device_id === device_id && d.live
          ? { ...d, live: { ...d.live, ...live } }
          : d
      ),
    })),

  addAlert: (alert) =>
    set((state) => ({
      activeAlerts: [alert, ...state.activeAlerts].slice(0, 50),
    })),

  dismissAlert: (id) =>
    set((state) => ({
      activeAlerts: state.activeAlerts.filter((a) => a.id !== id),
    })),
}));
