import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiskPulse } from "@/components/RiskPulse";
import { LiveCameraFeed } from "@/components/LiveCameraFeed";
import { Badge } from "@/components/ui/badge";
import { ALARM_TEXT_CLASS, ALARM_BG_CLASS, formatRelativeTime } from "@/lib/utils";
import { Gauge, Eye, Wifi } from "lucide-react";
import type { Device, AlarmLevel } from "@/types";

const STREAM_URL = import.meta.env.VITE_STREAM_BASE_URL
  ? `${import.meta.env.VITE_STREAM_BASE_URL}/offer`
  : null;

const BADGE_VARIANT = ["safe", "caution", "warning", "danger"] as const;

// Count-up hook: eski qiymatdan yangi qiymatga silliq sanab o'tadi (5-effekt)
function useCountUp(target: number, duration = 400): number {
  const [value, setValue] = useState(target);
  const prev = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (Math.abs(target - from) < 0.5) { setValue(target); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setValue(from + (target - from) * ease);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

/* ── Live last-seen ticker (re-renders every 1s, color by staleness) ── */
function LiveTimestamp({ lastSeen }: { lastSeen: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000));
  const color =
    seconds < 30  ? "var(--text-muted)" :
    seconds < 120 ? "var(--caution)"    :
                    "var(--danger)";
  return (
    <span
      className="ml-auto tabular-nums font-mono text-[11px] transition-colors"
      style={{ color }}
    >
      {formatRelativeTime(lastSeen)}
    </span>
  );
}

interface Props {
  device: Device;
  onClick?: () => void;
}

export function DriverCard({ device, onClick }: Props) {
  const { t } = useTranslation();
  const level = device.live?.alarm_level ?? 0;
  const live = device.live;

  // Count-up animatsiya PERCLOS uchun
  const perclosTarget = Math.round((live?.perclos ?? 0) * 100);
  const perclosDisplay = useCountUp(perclosTarget);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-start gap-3 p-3.5 rounded-xl border text-left",
        "glass card-lift",
        ALARM_BG_CLASS[level],
      ].join(" ")}
    >
      <RiskPulse level={level} size={48} />

      <div className="flex-1 min-w-0">
        {/* Name + badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-text-primary leading-tight truncate">
              {device.driver_name}
            </p>
            <p className="text-[12px] text-text-muted font-mono mt-0.5">
              {device.device_id} · {device.vehicle_plate}
            </p>
          </div>
          <Badge variant={BADGE_VARIANT[level]} className="shrink-0">
            {t(`alarm.level${level}`)}
          </Badge>
        </div>

        {/* Stats */}
        <div className="mt-2.5 flex items-center gap-3 text-[12px]">
          <span className="flex items-center gap-1 text-safe">
            <Wifi size={11} />
            <span className="font-mono">{t("ws.connected")}</span>
          </span>

          {live?.gps_speed != null && (
            <span className="flex items-center gap-1 text-text-muted">
              <Gauge size={11} />
              <span className="font-mono">{live.gps_speed.toFixed(0)}</span>
              <span>{t("common.km_h")}</span>
            </span>
          )}

          {live?.perclos != null && (
            <span className={`flex items-center gap-1 font-semibold font-mono ${ALARM_TEXT_CLASS[level]}`}>
              <Eye size={11} />
              <span>{perclosDisplay.toFixed(0)}%</span>
            </span>
          )}

          {live?.last_seen && (
            <LiveTimestamp lastSeen={live.last_seen} />
          )}
        </div>

        {/* Mini video thumbnail — only when stream URL is configured */}
        {STREAM_URL && (
          <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
            <LiveCameraFeed
              deviceId={device.device_id}
              streamUrl={STREAM_URL}
              alarmLevel={level as AlarmLevel}
              small
            />
          </div>
        )}
      </div>
    </button>
  );
}
