import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AlarmLevel } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Hex — Leaflet markers uchun (har doim dark theme rang)
export const ALARM_COLOR: Record<AlarmLevel, string> = {
  0: "#3DDC84",
  1: "#F2C94C",
  2: "#FF8A3D",
  3: "#FF4757",
};

// CSS var — UI komponentlar uchun (tema bilan o'zgaradi)
export const ALARM_COLOR_CSS: Record<AlarmLevel, string> = {
  0: "var(--safe)",
  1: "var(--caution)",
  2: "var(--warning)",
  3: "var(--danger)",
};

export const ALARM_PULSE_DURATION: Record<AlarmLevel, string> = {
  0: "2.5s",
  1: "1.8s",
  2: "1.0s",
  3: "0.4s",
};

export const ALARM_BG_CLASS: Record<AlarmLevel, string> = {
  0: "bg-safe/10 border-safe/25",
  1: "bg-caution/10 border-caution/25",
  2: "bg-warning/10 border-warning/25",
  3: "bg-danger/10 border-danger/25",
};

export const ALARM_TEXT_CLASS: Record<AlarmLevel, string> = {
  0: "text-safe",
  1: "text-caution",
  2: "text-warning",
  3: "text-danger",
};

export function formatRelativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s`;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  return `${Math.round(diff / 3600)}h`;
}
