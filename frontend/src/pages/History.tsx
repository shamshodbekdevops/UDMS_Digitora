import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ChevronRight, Filter, X } from "lucide-react";
import { ScrollToTop } from "@/components/ScrollToTop";
import { api } from "@/lib/api";
import { ALARM_COLOR, formatRelativeTime } from "@/lib/utils";
import type { AlertEvent, AlarmLevel, Device } from "@/types";

const PAGE_SIZE = 25;

export default function History() {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [levels, setLevels] = useState<number[]>([]);
  const [deviceFilter, setDeviceFilter] = useState("");

  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    p.set("ordering", "-timestamp");
    p.set("page", String(page));
    p.set("page_size", String(PAGE_SIZE));
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    if (levels.length) p.set("levels", levels.join(","));
    if (deviceFilter) p.set("device_id", deviceFilter);
    return p.toString();
  }, [dateFrom, dateTo, levels, deviceFilter, page]);

  useEffect(() => {
    api.get<{ results: Device[] }>("/dms/devices/?ordering=device_id")
      .then((d) => setDevices(d.results ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get<{ results: AlertEvent[]; count: number }>(`/dms/alerts/?${buildQuery()}`)
      .then((d) => { setEvents(d.results ?? []); setTotal(d.count ?? 0); })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [buildQuery]);

  const toggleLevel = (l: number) => {
    setLevels((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]);
    setPage(1);
  };

  const exportCsv = () => {
    const header = ["ID", "Timestamp", "Device ID", "Driver", "Level", "Message", "PERCLOS%", "Lat", "Lon", "Speed", "Temp", "Humidity"];
    const rows = events.map((e) => [
      e.id, e.timestamp, e.device_id, `"${e.driver_name ?? ""}"`, e.alarm_level,
      `"${e.alarm_msg}"`, (e.perclos * 100).toFixed(1),
      e.gps_lat ?? "", e.gps_lon ?? "", e.gps_speed ?? "",
      e.cabin_temp ?? "", e.cabin_humidity ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "alert_history.csv";
    a.click();
  };

  const hasFilters = dateFrom || dateTo || levels.length || deviceFilter;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const LEVEL_LABELS = [
    t("alarm.level0"), t("alarm.level1"), t("alarm.level2"), t("alarm.level3"),
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-text-primary text-lg">{t("history.title")}</h1>
          <p className="text-[12px] text-text-muted mt-0.5">{t("history.subtitle")}</p>
        </div>
        <button
          onClick={exportCsv}
          disabled={events.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all duration-200 disabled:opacity-40 btn-press"
          style={{ background: "rgba(var(--accent-rgb),0.15)", border: "1px solid rgba(var(--accent-rgb),0.3)", color: "var(--accent)" }}
        >
          <Download size={13} />
          {t("history.export_csv")}
        </button>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-text-muted" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">{t("history.filters")}</span>
          {hasFilters && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setLevels([]); setDeviceFilter(""); setPage(1); }}
              className="ml-auto flex items-center gap-1 text-[11px] text-text-muted hover:text-danger transition-colors"
            >
              <X size={11} /> {t("history.clear")}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <input
              type="date" value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-surface-el text-text-primary text-[12px] px-2 py-1.5 outline-none focus:border-accent"
            />
            <span className="text-text-muted text-[12px]">—</span>
            <input
              type="date" value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-surface-el text-text-primary text-[12px] px-2 py-1.5 outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-1">
            {[0, 1, 2, 3].map((l) => (
              <button
                key={l}
                onClick={() => toggleLevel(l)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 btn-press"
                style={{
                  background: levels.includes(l) ? ALARM_COLOR[l as AlarmLevel] + "28" : "transparent",
                  border: `1px solid ${levels.includes(l) ? ALARM_COLOR[l as AlarmLevel] : "var(--border)"}`,
                  color: levels.includes(l) ? ALARM_COLOR[l as AlarmLevel] : "var(--text-muted)",
                }}
              >
                {LEVEL_LABELS[l]}
              </button>
            ))}
          </div>

          <select
            value={deviceFilter}
            onChange={(e) => { setDeviceFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-surface-el text-text-primary text-[12px] px-2 py-1.5 outline-none focus:border-accent"
          >
            <option value="">{t("history.all_devices")}</option>
            {devices.map((d) => (
              <option key={d.device_id} value={d.device_id}>{d.device_id} — {d.driver_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Column headers */}
      <div className="hidden md:grid grid-cols-[1.5fr_90px_90px_70px_1.5fr] gap-3 px-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">
        <span>{t("history.col_driver")}</span>
        <span>{t("history.col_level")}</span>
        <span>{t("history.col_time")}</span>
        <span>{t("history.col_perclos")}</span>
        <span>{t("history.col_message")}</span>
      </div>

      {/* Rows */}
      <div className="space-y-1.5">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)
        ) : events.length === 0 ? (
          <div className="glass rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
            <div style={{ fontSize: 40, opacity: 0.25 }}>📭</div>
            <p className="font-semibold text-text-primary">{t("history.empty_title")}</p>
            <p className="text-text-muted text-sm">{t("history.empty_subtitle")}</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                expanded={expanded === event.id}
                onToggle={() => setExpanded(expanded === event.id ? null : event.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg text-[12px] border border-border text-text-muted hover:border-accent hover:text-accent transition-all disabled:opacity-30 btn-press"
          >
            {t("history.prev")}
          </button>
          <span className="text-[12px] font-mono text-text-muted tabular-nums">
            {t("history.page_info", { page, total: totalPages, count: total })}
          </span>
          <button
            disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg text-[12px] border border-border text-text-muted hover:border-accent hover:text-accent transition-all disabled:opacity-30 btn-press"
          >
            {t("history.next")}
          </button>
        </div>
      )}
      <ScrollToTop />
    </div>
  );
}

function EventRow({ event, expanded, onToggle }: {
  event: AlertEvent; expanded: boolean; onToggle: () => void;
}) {
  const { t } = useTranslation();
  const color = ALARM_COLOR[event.alarm_level as AlarmLevel];

  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div
        className="glass rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 card-lift"
        style={{ borderColor: expanded ? color + "55" : "rgba(138,148,255,0.12)" }}
        onClick={onToggle}
      >
        <div className="grid grid-cols-[1.5fr_90px_90px_70px_1.5fr] gap-3 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors duration-100">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-text-primary truncate">{event.driver_name}</p>
            <p className="text-[11px] text-text-muted font-mono">{event.device_id}</p>
          </div>

          <motion.div
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit"
            style={{ background: color + "22", color }}
            whileHover={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.28, times: [0, 0.5, 1] }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
            L{event.alarm_level}
          </motion.div>

          <span className="text-[11px] text-text-muted font-mono tabular-nums">
            {formatRelativeTime(event.timestamp)}
          </span>

          <span className="text-[12px] font-bold font-mono tabular-nums" style={{ color }}>
            {(event.perclos * 100).toFixed(0)}%
          </span>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[12px] text-text-primary truncate flex-1">{event.alarm_msg}</span>
            <ChevronRight
              size={13}
              className="shrink-0 text-text-muted transition-transform duration-200"
              style={{ transform: expanded ? "rotate(90deg)" : undefined }}
            />
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              key="detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div
                className="px-4 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t"
                style={{ borderColor: color + "33", background: color + "08" }}
              >
                <DetailField label={t("history.detail_full_time")} value={new Date(event.timestamp).toLocaleString()} />
                <DetailField label={t("history.detail_speed")} value={event.gps_speed != null ? `${event.gps_speed.toFixed(1)} km/h` : "—"} />
                <DetailField label={t("history.detail_coord")} value={event.gps_lat != null ? `${event.gps_lat.toFixed(5)}, ${event.gps_lon?.toFixed(5)}` : "—"} />
                <DetailField label={t("history.detail_temp")} value={event.cabin_temp != null ? `${event.cabin_temp.toFixed(1)}°C` : "—"} />
                <DetailField label={t("history.detail_humidity")} value={event.cabin_humidity != null ? `${event.cabin_humidity.toFixed(0)}%` : "—"} />
                <DetailField label={t("history.detail_perclos")} value={`${(event.perclos * 100).toFixed(2)}%`} />
                <DetailField label={t("history.detail_message")} value={event.alarm_msg} span />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function DetailField({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-0.5">{label}</p>
      <p className="text-[12px] text-text-primary font-mono">{value}</p>
    </div>
  );
}
