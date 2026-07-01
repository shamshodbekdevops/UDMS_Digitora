import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useFleetStore } from "@/store/fleet";
import { useNotificationStore } from "@/store/notifications";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMockWs } from "@/hooks/useMockWs";
import { LiveMap } from "@/components/LiveMap";
import { DriverCard } from "@/components/DriverCard";
import { AlertModal } from "@/components/AlertModal";
import { api } from "@/lib/api";
import { ALARM_COLOR } from "@/lib/utils";
import type { Device, WsPacket } from "@/types";
import {
  CheckCircle2, Activity, AlertTriangle, Layers,
  TrendingUp, Cpu, Signal,
} from "lucide-react";

/* ─────────────────────────────────────────
   Initial devices
───────────────────────────────────────── */
const INIT_DEVICES: Device[] = [
  { id:1, device_id:"DGT-001", driver_name:"Shamshod Toshqobilov", vehicle_plate:"01A777AA", is_active:true, created_at:"", live:{alarm_level:0,last_seen:new Date().toISOString(),gps_lat:41.2995,gps_lon:69.2401,gps_speed:0,perclos:0}},
  { id:2, device_id:"DGT-002", driver_name:"Bobur Rahimov",        vehicle_plate:"30B456BB", is_active:true, created_at:"", live:{alarm_level:0,last_seen:new Date().toISOString(),gps_lat:41.3113,gps_lon:69.2797,gps_speed:0,perclos:0}},
];

/* ─────────────────────────────────────────
   Count-up animation hook
───────────────────────────────────────── */
function useCountUp(target: number, duration = 500): number {
  const [value, setValue] = useState(target);
  const prev = useRef(target);
  const raf = useRef(0);
  useEffect(() => {
    const from = prev.current;
    prev.current = target;
    if (Math.abs(target - from) < 0.5) { setValue(target); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setValue(from + (target - from) * ease);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

/* ─────────────────────────────────────────
   Level metadata
───────────────────────────────────────── */
function useLevelMeta() {
  const { t } = useTranslation();
  return useMemo(() => ([
    { label: t("alarm.level0"), color: "#3DDC84", bg: "rgba(61,220,132,0.1)", icon: CheckCircle2 },
    { label: t("alarm.level1"), color: "#F2C94C", bg: "rgba(242,201,76,0.1)", icon: Activity },
    { label: t("alarm.level2"), color: "#FF8A3D", bg: "rgba(255,138,61,0.1)", icon: AlertTriangle },
    { label: t("alarm.level3"), color: "#FF4757", bg: "rgba(255,71,87,0.12)", icon: AlertTriangle },
  ]), [t]);
}

/* ─────────────────────────────────────────
   KPI metrics row
───────────────────────────────────────── */
function KpiRow({ counts, total, streamLabel }: { counts: number[]; total: number; streamLabel: string }) {
  const { t } = useTranslation();
  const levelMeta = useLevelMeta();
  const health = total > 0
    ? Math.round((counts[0] * 100 + counts[1] * 72 + counts[2] * 38 + counts[3] * 0) / total)
    : 100;
  const healthColor = health >= 85 ? "#3DDC84" : health >= 60 ? "#F2C94C" : health >= 35 ? "#FF8A3D" : "#FF4757";

  const animHealth = useCountUp(health);
  const a0 = useCountUp(counts[0]);
  const a1 = useCountUp(counts[1]);
  const a2 = useCountUp(counts[2]);
  const a3 = useCountUp(counts[3]);
  const animTotal = useCountUp(total);
  const animVals = [a0, a1, a2, a3];

  return (
    <div
      className="shrink-0 flex divide-x border-b"
      style={{ borderColor: "var(--border)", background: "var(--surface)", backdropFilter: "blur(20px)" }}
    >
      {/* Fleet Health */}
      <div className="flex items-center gap-3 px-5 py-3 min-w-[160px]">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: `${healthColor}1A`, border: `1.5px solid ${healthColor}50` }}
        >
          <TrendingUp size={16} style={{ color: healthColor }} />
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-0.5">{t("dashboard.fleet_health")}</div>
          <div className="font-display font-black tabular-nums leading-none" style={{ fontSize: 28, color: healthColor }}>
            {Math.round(animHealth)}<span style={{ fontSize: 14, opacity: 0.7 }}>%</span>
          </div>
        </div>
      </div>

      {/* Total */}
      <div className="flex flex-col items-center justify-center px-5 py-3 min-w-[88px]">
        <div className="flex items-center gap-1.5 mb-1">
          <Cpu size={10} className="text-text-muted" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{t("dashboard.total")}</span>
        </div>
        <div className="font-display font-black text-text-primary tabular-nums" style={{ fontSize: 26 }}>
          {Math.round(animTotal)}
        </div>
        <div className="text-[10px] text-text-muted font-medium mt-0.5">{t("dashboard.drivers_suffix")}</div>
      </div>

      {/* Per-level */}
      {levelMeta.map((meta, lvl) => {
        const Icon = meta.icon;
        const isDanger = lvl === 3 && counts[lvl] > 0;
        return (
          <div
            key={lvl}
            className="flex flex-col items-center justify-center px-4 py-3 flex-1 transition-colors duration-300"
            style={{ background: counts[lvl] > 0 ? meta.bg : undefined }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: meta.color,
                  animation: isDanger ? "danger-blink 0.9s step-end infinite" : undefined,
                }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: counts[lvl] > 0 ? meta.color : "var(--text-muted)" }}
              >
                {meta.label}
              </span>
            </div>
            <div
              className="font-display font-black tabular-nums leading-none"
              style={{
                fontSize: 26,
                color: counts[lvl] > 0 ? meta.color : "var(--text-muted)",
                animation: isDanger ? "health-pulse 1.1s ease-in-out infinite" : undefined,
              }}
            >
              {Math.round(animVals[lvl])}
            </div>
            <Icon size={10} className="mt-1" style={{ color: counts[lvl] > 0 ? meta.color : "var(--text-muted)", opacity: 0.6 }} />
          </div>
        );
      })}

      {/* System live indicator */}
      <div className="hidden xl:flex flex-col items-center justify-center px-5 py-3 min-w-[100px]">
        <div className="flex items-center gap-1.5 mb-1">
          <Signal size={10} className="text-safe" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{t("dashboard.status")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
          <span className="font-mono font-bold text-safe" style={{ fontSize: 13 }}>{t("dashboard.live")}</span>
        </div>
        <div className="text-[10px] text-text-muted font-mono mt-1">{streamLabel}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Critical alert sticky banner
───────────────────────────────────────── */
function CriticalBanner({ count, names }: { count: number; names: string[] }) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          key="critical-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 overflow-hidden"
        >
          <div
            className="flex items-center gap-3 px-5 py-2.5"
            style={{
              background: "linear-gradient(90deg, rgba(255,71,87,0.2) 0%, rgba(255,71,87,0.06) 100%)",
              borderBottom: "1px solid rgba(255,71,87,0.28)",
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,71,87,0.22)", animation: "health-pulse 0.8s ease-in-out infinite" }}
            >
              <AlertTriangle size={12} style={{ color: "#FF4757" }} />
            </div>
            <span className="text-sm font-black" style={{ color: "#FF4757" }}>{t("dashboard.critical_alert_prefix")}</span>
            <span className="text-sm font-semibold text-text-primary truncate">
              {names.slice(0, 3).join(", ")}{names.length > 3 ? ` +${names.length - 3} ${t("dashboard.more_suffix")}` : ""}
            </span>
            <span className="text-sm text-text-muted">— {t("dashboard.critical_alert_suffix")}</span>
            <div className="ml-auto shrink-0 font-mono font-bold text-xs flex items-center gap-1.5" style={{ color: "#FF4757" }}>
              <span className="animate-pulse">▶</span>
              {t("dashboard.critical_count", { count })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────
   Card skeleton
───────────────────────────────────────── */
function CardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}
      className="flex items-start gap-3 p-3 rounded-xl border border-border/50">
      <div className="skeleton w-11 h-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-3/4 rounded" />
        <div className="skeleton h-2 w-1/2 rounded" />
        <div className="skeleton h-2 w-2/3 rounded" />
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   Filter button
───────────────────────────────────────── */
function FilterBtn({ active, onClick, label, count, color }: {
  active: boolean; onClick: () => void;
  label: string; count: number; color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
      style={{
        background: active ? "rgba(var(--accent-rgb),0.15)" : "transparent",
        border: `1px solid ${active ? "rgba(var(--accent-rgb),0.3)" : "var(--border)"}`,
        color: active ? "var(--accent)" : "var(--text-muted)",
      }}
    >
      {label}
      <span className="font-mono font-black tabular-nums" style={{ color: count > 0 ? color : "inherit", opacity: count > 0 ? 1 : 0.5 }}>
        {count}
      </span>
    </button>
  );
}

/* ══════════════════════════════════════════
   PAGE
══════════════════════════════════════════ */
export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { devices, setDevices, applyWsPacket } = useFleetStore();
  const notificationsEnabled = useNotificationStore((s) => s.notificationsEnabled);
  const addNotification = useNotificationStore((s) => s.addFromPacket);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "alert">("all");
  const [mockFallback, setMockFallback] = useState(false);

  const [alertQueue, setAlertQueue] = useState<WsPacket[]>([]);
  const lastAlertTime = useRef<Record<string, number>>({});
  const wsUrl = useMemo(() => {
    const base = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
    return `${base.replace(/\/$/, "")}/ws/dms/`;
  }, []);
  const allowMock = import.meta.env.VITE_USE_MOCK_WS === "true";

  useEffect(() => {
    setDevices(INIT_DEVICES);
    api.get<{ results: Device[] }>("/dms/devices/?page_size=100")
      .then((d) => { if (d.results?.length > 0) setDevices(d.results); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setDevices]);

  const handlePacket = useCallback((p: WsPacket) => {
    applyWsPacket(p);
    addNotification(p);
    if (p.alarm_level === 3 && notificationsEnabled) {
      const now = Date.now();
      const last = lastAlertTime.current[p.device_id] ?? 0;
      if (now - last > 30000) {
        lastAlertTime.current[p.device_id] = now;
        setAlertQueue((q) => [...q, p]);
      }
    }
  }, [applyWsPacket, addNotification, notificationsEnabled]);

  const wsStatus = useWebSocket(wsUrl, {
    onMessage: (data) => {
      if (data && typeof data === "object") handlePacket(data as WsPacket);
    },
    enabled: true,
  }).status;

  useEffect(() => {
    if (!allowMock || wsStatus === "connected") {
      setMockFallback(false);
      return;
    }
    const timer = setTimeout(() => setMockFallback(true), 4000);
    return () => clearTimeout(timer);
  }, [allowMock, wsStatus]);

  useMockWs(handlePacket, allowMock && mockFallback);

  const dismissAlert = useCallback(() => setAlertQueue((q) => q.slice(1)), []);

  const counts = useMemo(() => {
    const c = [0, 0, 0, 0];
    devices.forEach((d) => c[d.live?.alarm_level ?? 0]++);
    return c;
  }, [devices]);

  const dangerNames = useMemo(
    () => devices.filter((d) => d.live?.alarm_level === 3).map((d) => d.driver_name),
    [devices]
  );

  const sorted = useMemo(() => {
    const base = [...devices].sort((a, b) => (b.live?.alarm_level ?? 0) - (a.live?.alarm_level ?? 0));
    return filter === "alert" ? base.filter((d) => (d.live?.alarm_level ?? 0) > 0) : base;
  }, [devices, filter]);

  const streamLabel = allowMock && mockFallback
    ? t("ws.mock")
    : wsStatus === "connected"
      ? t("ws.connected")
      : wsStatus === "connecting"
        ? t("ws.reconnecting")
        : t("ws.disconnected");

  return (
    <>
      <AlertModal packet={alertQueue[0] ?? null} onDismiss={dismissAlert} />

      <div className="h-full flex flex-col overflow-hidden">

        {/* KPI Row */}
        <KpiRow counts={counts} total={devices.length} streamLabel={streamLabel} />

        {/* Critical Banner */}
        <CriticalBanner count={counts[3]} names={dangerNames} />

        {/* Map + Cards */}
        <div className="flex-1 flex min-h-0">

          {/* Map panel */}
          <div className="flex-1 relative min-w-0">
            <LiveMap devices={devices} />

            <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
              <div
                className="rounded-2xl px-3.5 py-2 flex items-center gap-2.5"
                style={{ background: "rgba(5,6,15,0.72)", backdropFilter: "blur(12px)", border: "1px solid rgba(138,148,255,0.18)" }}
              >
                <div className="w-2 h-2 rounded-full bg-safe animate-pulse" />
                <span className="text-xs font-bold text-white tracking-wide">{t("dashboard.live_map")}</span>
                <span className="text-[10px] font-mono text-white/50 ml-1">{devices.length} {t("dashboard.devices_label")}</span>
              </div>
            </div>

            <div className="absolute bottom-6 left-3 z-[1000] pointer-events-none">
              <div
                className="rounded-2xl p-3 space-y-2"
                style={{ background: "rgba(5,6,15,0.78)", backdropFilter: "blur(12px)", border: "1px solid rgba(138,148,255,0.18)" }}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-white/50 mb-1.5">
                  <Layers size={10} />
                  <span className="font-bold uppercase tracking-widest">{t("dashboard.legend")}</span>
                </div>
                {([0, 1, 2, 3] as const).map((lvl) => (
                  <div key={lvl} className="flex items-center gap-2.5 text-[11px]">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ALARM_COLOR[lvl] }} />
                    <span className="text-white/65">{t(`alarm.level${lvl}`)}</span>
                    <span className="ml-auto font-mono font-bold text-white tabular-nums">{counts[lvl]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-px bg-border/40 shrink-0" />

          {/* Driver cards panel */}
          <div
            className="w-[340px] shrink-0 flex flex-col"
            style={{ background: "var(--surface)", backdropFilter: "blur(20px)" }}
          >
            {/* Panel header + filter */}
            <div className="shrink-0 px-3 pt-3 pb-2 border-b border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-sm text-text-primary">{t("dashboard.drivers")}</h2>
                <span className="text-[11px] text-text-muted font-mono bg-surface-el px-2 py-0.5 rounded-full border border-border/50">
                  {sorted.length} / {devices.length}
                </span>
              </div>
              <div className="flex gap-1.5">
                <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}
                  label={t("dashboard.filter_all")} count={devices.length} color="var(--text-muted)" />
                <FilterBtn active={filter === "alert"} onClick={() => setFilter("alert")}
                  label={t("dashboard.filter_alerts")} count={counts[1] + counts[2] + counts[3]}
                  color={counts[1] + counts[2] + counts[3] > 0 ? "#FF8A3D" : "var(--text-muted)"} />
              </div>
            </div>

            {/* Card list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} delay={i * 0.06} />)
                ) : sorted.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-text-muted">
                    <CheckCircle2 size={32} className="text-safe mb-2 opacity-60" />
                    <p className="text-sm font-semibold">{t("dashboard.all_safe")}</p>
                    <p className="text-xs mt-1 opacity-70">{t("dashboard.no_alerts")}</p>
                  </motion.div>
                ) : (
                  sorted.map((device) => (
                    <motion.div
                      key={device.device_id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <DriverCard device={device} onClick={() => navigate(`/driver/${device.device_id}`)} />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Panel footer summary */}
            <div className="shrink-0 border-t border-border/50 px-3 py-2.5 flex items-center gap-3">
              {([0, 1, 2, 3] as const).map((lvl) => (
                <div key={lvl} className="flex items-center gap-1 text-[11px]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ALARM_COLOR[lvl] }} />
                  <span className="font-mono font-bold tabular-nums" style={{ color: ALARM_COLOR[lvl] }}>{counts[lvl]}</span>
                </div>
              ))}
              <div className="ml-auto flex items-center gap-1.5 text-[10px] text-text-muted font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-safe inline-block animate-pulse" />
                {t("dashboard.live")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
