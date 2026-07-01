import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Sector,
} from "recharts";
import { Users, Bell, Eye, TrendingUp } from "lucide-react";
import { ScrollToTop } from "@/components/ScrollToTop";
import { api } from "@/lib/api";
import { ALARM_COLOR } from "@/lib/utils";
import { useFleetStore } from "@/store/fleet";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMockWs } from "@/hooks/useMockWs";
import type { AlertEvent, AlarmLevel, WsPacket } from "@/types";

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

const TOOLTIP_STYLE = {
  background: "rgba(20,22,38,0.95)",
  border: "1px solid rgba(138,148,255,0.18)",
  borderRadius: 10,
  color: "#EDEFFC",
  fontSize: 12,
  backdropFilter: "blur(12px)",
};

function ActivePieShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <text x={cx} y={cy - 6} textAnchor="middle" fill={fill} fontSize={13} fontWeight={700}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#8A8FB5" fontSize={11}>
        {(percent * 100).toFixed(0)}%
      </text>
    </g>
  );
}

export default function Reports() {
  const { t } = useTranslation();
  const devices = useFleetStore((s) => s.devices);
  const [todayEvents, setTodayEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState<AlertEvent[]>([]);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const [activePie, setActivePie] = useState(0);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [mockFallback, setMockFallback] = useState(false);
  const wsUrl = useMemo(() => {
    const base = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
    return `${base.replace(/\/$/, "")}/ws/dms/`;
  }, []);
  const allowMock = import.meta.env.VITE_USE_MOCK_WS === "true";

  const LEVEL_LABELS = useMemo(() => [
    t("alarm.level0"), t("alarm.level1"), t("alarm.level2"), t("alarm.level3"),
  ], [t]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    api.get<{ results: AlertEvent[]; count: number }>(`/dms/alerts/?date_from=${today}&page_size=100&ordering=-timestamp`)
      .then((d) => setTodayEvents(d.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePacket = useCallback((packet: WsPacket) => {
    if (packet.alarm_level === 0) return;
    const id = Date.now() * 1000 + Math.floor(Math.random() * 999);
    const event: AlertEvent = {
      id,
      device_id: packet.device_id,
      driver_name: packet.driver_name,
      alarm_level: packet.alarm_level,
      alarm_msg: packet.alarm_msg,
      perclos: packet.perclos,
      gps_lat: packet.gps.lat,
      gps_lon: packet.gps.lon,
      gps_speed: packet.gps.speed,
      cabin_temp: packet.cabin.temp,
      cabin_humidity: packet.cabin.humidity,
      timestamp: packet.timestamp,
    };
    setLiveEvents((prev) => [event, ...prev].slice(0, 40));
    setNewIds((s) => {
      const n = new Set(s); n.add(id);
      setTimeout(() => setNewIds((s2) => { const n2 = new Set(s2); n2.delete(id); return n2; }), 1500);
      return n;
    });
  }, []);

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

  const alertsToday = todayEvents.filter((e) => e.alarm_level > 0).length;
  const avgPerclos = devices.length > 0
    ? devices.reduce((s, d) => s + (d.live?.perclos ?? 0), 0) / devices.length
    : 0;

  const byDriver: Record<string, { name: string; count: number; worst: AlarmLevel }> = {};
  todayEvents.forEach((e) => {
    if (!byDriver[e.device_id]) byDriver[e.device_id] = { name: e.driver_name, count: 0, worst: 0 };
    if (e.alarm_level > 0) byDriver[e.device_id].count++;
    if (e.alarm_level > byDriver[e.device_id].worst) byDriver[e.device_id].worst = e.alarm_level as AlarmLevel;
  });

  const atRisk = Object.values(byDriver).sort((a, b) => b.count - a.count)[0];

  const animTotal = useCountUp(devices.length);
  const animAlerts = useCountUp(alertsToday);
  const animPerclos = useCountUp(Math.round(avgPerclos * 100));
  const animRisk = useCountUp(atRisk?.count ?? 0);

  const barData = Object.entries(byDriver)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id, info]) => ({
      id,
      name: info.name.split(" ")[0],
      alerts: info.count,
      fill: ALARM_COLOR[info.worst],
    }));

  const pieCounts = [0, 0, 0, 0];
  todayEvents.forEach((e) => pieCounts[e.alarm_level]++);
  const pieData = [0, 1, 2, 3]
    .map((l) => ({ name: LEVEL_LABELS[l], value: pieCounts[l], fill: ALARM_COLOR[l as AlarmLevel] }))
    .filter((d) => d.value > 0);

  const sectionD = [...liveEvents, ...todayEvents]
    .filter((e) => !selectedDriver || e.device_id === selectedDriver)
    .slice(0, 50);

  return (
    <div className="space-y-5 pb-4">
      <h1 className="font-display font-bold text-text-primary text-lg">{t("reports.title")}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={<Users size={16} />} label={t("reports.stat_drivers")} value={`${Math.round(animTotal)}`} color="accent" />
        <SummaryCard icon={<Bell size={16} />} label={t("reports.stat_alerts")} value={`${Math.round(animAlerts)}`} color="warning" />
        <SummaryCard icon={<Eye size={16} />} label={t("reports.stat_perclos")} value={`${Math.round(animPerclos)}%`} color="caution" />
        <SummaryCard
          icon={<TrendingUp size={16} />}
          label={t("reports.stat_risky")}
          value={atRisk ? atRisk.name.split(" ")[0] : "—"}
          sub={atRisk ? `${Math.round(animRisk)} ${t("reports.alerts_suffix")}` : undefined}
          color="danger"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="glass rounded-2xl p-4">
          <h2 className="font-display font-semibold text-text-primary text-sm mb-3 flex items-center gap-2">
            <Bell size={14} className="text-warning" />
            {t("reports.bar_title")}
          </h2>
          {loading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : barData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-text-muted text-sm">{t("reports.no_data")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                onClick={(d) => setSelectedDriver(d?.activePayload?.[0]?.payload?.id ?? null)}>
                <defs>
                  {barData.map((entry, i) => (
                    <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={entry.fill} stopOpacity={0.92} />
                      <stop offset="95%" stopColor={entry.fill} stopOpacity={0.42} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(138,148,255,0.1)" />
                <XAxis dataKey="name" tick={{ fill: "#8A8FB5", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#8A8FB5", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(138,148,255,0.06)" }} />
                <Bar dataKey="alerts" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={`url(#barGrad${i})`}
                      fillOpacity={selectedDriver && selectedDriver !== entry.id ? 0.35 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {selectedDriver && (
            <button onClick={() => setSelectedDriver(null)}
              className="mt-2 text-[11px] text-text-muted hover:text-accent transition-colors btn-press">
              {t("reports.clear_filter")}
            </button>
          )}
        </div>

        {/* Pie chart */}
        <div className="glass rounded-2xl p-4">
          <h2 className="font-display font-semibold text-text-primary text-sm mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-accent" />
            {t("reports.pie_title")}
          </h2>
          {loading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-text-muted text-sm">{t("reports.no_data")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="45%"
                  innerRadius={50} outerRadius={80}
                  dataKey="value"
                  activeIndex={activePie}
                  activeShape={ActivePieShape}
                  onMouseEnter={(_, index) => setActivePie(index)}
                >
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.85} stroke="transparent" />)}
                </Pie>
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: "#8A8FB5" }}>{v}</span>}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Live events table */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
          <h2 className="font-display font-semibold text-text-primary text-sm">
            {t("reports.live_title")} {selectedDriver && <span className="text-accent">— {selectedDriver}</span>}
          </h2>
          <span className="ml-auto text-[11px] font-mono text-text-muted">{t("reports.events_count", { count: sectionD.length })}</span>
        </div>

        {sectionD.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">{t("reports.no_events")}</div>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {sectionD.map((e) => {
                const color = ALARM_COLOR[e.alarm_level as AlarmLevel];
                const isNew = newIds.has(e.id);
                return (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{
                      opacity: 1, x: 0,
                      backgroundColor: isNew ? [color + "30", "transparent"] : "transparent",
                    }}
                    transition={{ duration: isNew ? 1.5 : 0.2 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-[12px]"
                    style={{ border: "1px solid var(--border)" }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="font-semibold text-text-primary shrink-0 w-28 truncate">{e.driver_name}</span>
                    <span className="font-mono text-text-muted shrink-0">{e.device_id}</span>
                    <span className="flex-1 text-text-primary truncate">{e.alarm_msg}</span>
                    <span className="font-bold font-mono tabular-nums" style={{ color }}>
                      {(e.perclos * 100).toFixed(0)}%
                    </span>
                    <span className="text-text-muted font-mono shrink-0 text-[11px]">
                      {new Date(e.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
      <ScrollToTop />
    </div>
  );
}

function SummaryCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 card-lift"
      style={{ border: `1px solid var(--${color})/20` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div style={{ color: `var(--${color})` }}>{icon}</div>
        <span className="text-[11px] text-text-muted uppercase tracking-wide font-bold">{label}</span>
      </div>
      <p className="font-display font-black text-2xl font-mono tabular-nums" style={{ color: `var(--${color})` }}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-text-muted mt-0.5">{sub}</p>}
    </motion.div>
  );
}
