import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import { ArrowLeft, Gauge, Eye, Thermometer, Droplets, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskPulse } from "@/components/RiskPulse";
import { LiveCameraFeed } from "@/components/LiveCameraFeed";
import { api } from "@/lib/api";
import { useFleetStore } from "@/store/fleet";
import { ALARM_COLOR, formatRelativeTime } from "@/lib/utils";
import type { AlertEvent, AlarmLevel } from "@/types";

const BADGE_VARIANT = ["safe", "caution", "warning", "danger"] as const;

interface ChartPoint {
  time: string;
  perclos: number;
  level: number;
}

export default function DriverDetail() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const devices = useFleetStore((s) => s.devices);
  const device = devices.find((d) => d.device_id === deviceId);

  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deviceId) return;
    setLoading(true);
    api.get<{ results: AlertEvent[] }>(
      `/dms/alerts/?device_id=${deviceId}&ordering=-timestamp&page_size=60`
    )
      .then((data) => setEvents(data.results ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [deviceId]);

  // Recharts uchun data tayyorlash
  const chartData: ChartPoint[] = [...events]
    .reverse()
    .slice(-40)
    .map((e) => ({
      time: new Date(e.timestamp).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
      perclos: Math.round(e.perclos * 100),
      level: e.alarm_level,
    }));

  const level = device?.live?.alarm_level ?? 0;
  const alarmLabels = [t("alarm.level0"), t("alarm.level1"), t("alarm.level2"), t("alarm.level3")];
  const counts = [0, 0, 0, 0];
  events.forEach((e) => counts[e.alarm_level]++);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Back + Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="btn-press">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <RiskPulse level={level as AlarmLevel} size={40} />
          <div>
            <h1 className="font-display font-bold text-text-primary text-lg leading-tight">
              {device?.driver_name ?? deviceId}
            </h1>
            <p className="text-xs text-text-muted font-mono">
              {deviceId} · {device?.vehicle_plate}
            </p>
          </div>
          <Badge variant={BADGE_VARIANT[level]} className="ml-auto">
            {alarmLabels[level]}
          </Badge>
        </div>
      </motion.div>

      {/* Live camera feed — MJPEG polling */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}>
        <div className="glass rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" />
            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
              {t("driver.live_camera")}
            </span>
          </div>
          <LiveCameraFeed
            deviceId={deviceId ?? ""}
            alarmLevel={level as AlarmLevel}
          />
        </div>
      </motion.div>

      {/* Live stats cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Eye size={16} className="text-warning" />}
          label={t("device.perclos")}
          value={`${((device?.live?.perclos ?? 0) * 100).toFixed(0)}%`}
          color="warning" />
        <StatCard icon={<Gauge size={16} className="text-safe" />}
          label={t("device.speed")}
          value={`${(device?.live?.gps_speed ?? 0).toFixed(0)} ${t("common.km_h")}`}
          color="safe" />
        {events[0]?.cabin_temp != null && (
          <StatCard icon={<Thermometer size={16} className="text-caution" />}
            label={t("driver.cabin_temp")}
            value={`${events[0].cabin_temp?.toFixed(1)}°C`}
            color="caution" />
        )}
        {events[0]?.cabin_humidity != null && (
          <StatCard icon={<Droplets size={16} className="text-accent" />}
            label={t("driver.cabin_humidity")}
            value={`${events[0].cabin_humidity?.toFixed(0)}%`}
            color="accent" />
        )}
      </motion.div>

      {/* PERCLOS Area Chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-4">
        <h2 className="font-display font-semibold text-text-primary text-sm mb-3 flex items-center gap-2">
          <Eye size={14} className="text-warning" />
          {t("driver.perclos_chart")}
        </h2>
        {loading ? (
          <div className="skeleton h-40 rounded-xl" />
        ) : chartData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-text-muted text-sm">
            {t("driver.no_history")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="perclosGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FF8A3D" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FF8A3D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(138,148,255,0.1)" />
              <XAxis dataKey="time" tick={{ fill: "#8A8FB5", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#8A8FB5", fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "rgba(20,22,38,0.95)",
                  border: "1px solid rgba(138,148,255,0.2)",
                  borderRadius: 8,
                  color: "#EDEFFC",
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v}%`, t("device.perclos")]} 
              />
              <Area
                type="monotone"
                dataKey="perclos"
                stroke="#FF8A3D"
                strokeWidth={2}
                fill="url(#perclosGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#FF8A3D" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Alarm level distribution */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass rounded-2xl p-4">
        <h2 className="font-display font-semibold text-text-primary text-sm mb-3 flex items-center gap-2">
          <Gauge size={14} className="text-accent" />
          {t("driver.alarm_history")}
        </h2>
        {loading ? (
          <div className="skeleton h-32 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={[0,1,2,3].map((lvl) => ({
              name: alarmLabels[lvl],
              count: counts[lvl],
              color: ALARM_COLOR[lvl as AlarmLevel],
            }))} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(138,148,255,0.1)" />
              <XAxis dataKey="name" tick={{ fill: "#8A8FB5", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#8A8FB5", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(20,22,38,0.95)",
                  border: "1px solid rgba(138,148,255,0.2)",
                  borderRadius: 8,
                  color: "#EDEFFC",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {[0,1,2,3].map((lvl) => (
                  <Cell key={lvl} fill={ALARM_COLOR[lvl as AlarmLevel]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Recent events list */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-4">
        <h2 className="font-display font-semibold text-text-primary text-sm mb-3">
          {t("driver.recent_events")}
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
          </div>
        ) : events.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-4">{t("driver.no_history")}</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {events.slice(0, 30).map((e) => (
              <div key={e.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 text-xs"
                style={{ background: `${ALARM_COLOR[e.alarm_level as AlarmLevel]}08` }}>
                <div className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: ALARM_COLOR[e.alarm_level as AlarmLevel] }} />
                <span className="flex-1 text-text-primary truncate">{e.alarm_msg}</span>
                {e.gps_lat != null && (
                  <span className="text-text-muted flex items-center gap-1 shrink-0">
                    <MapPin size={9} />
                    {e.gps_lat.toFixed(3)}, {e.gps_lon?.toFixed(3)}
                  </span>
                )}
                <span className="text-text-muted font-mono shrink-0">{formatRelativeTime(e.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className={`glass rounded-xl p-3 border border-${color}/20`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-[11px] text-text-muted uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-display font-bold text-xl text-${color} font-mono`}>{value}</p>
    </div>
  );
}
