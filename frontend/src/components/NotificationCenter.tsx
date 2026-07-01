import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, CheckCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { ALARM_COLOR } from "@/lib/utils";
import { useNotificationStore } from "@/store/notifications";
import type { AlertEvent } from "@/types";

function relativeTime(
  iso: string,
  t: (k: string, o?: Record<string, unknown>) => string
) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return t("time.just_now");
  const m = Math.floor(s / 60);
  if (m < 60) return m === 1 ? t("time.minute_ago") : t("time.minutes_ago", { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? t("time.hour_ago") : t("time.hours_ago", { count: h });
  const d = Math.floor(h / 24);
  return d === 1 ? t("time.day_ago") : t("time.days_ago", { count: d });
}

/* ── Compact toggle switch (theme-aware) ────────────────────────────── */
function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-[rgba(var(--accent-rgb),0.06)] outline-none"
    >
      {/* Track — fixed px so thumb never overflows */}
      <span
        className="relative shrink-0 rounded-full transition-all duration-300"
        style={{
          width: 44,
          height: 26,
          background: checked ? "var(--accent)" : "var(--border)",
          boxShadow: checked ? "0 0 10px rgba(var(--accent-rgb),0.4)" : "none",
          flexShrink: 0,
        }}
      >
        {/* Thumb — explicit px math: track(44) - thumb(20) - padding(3) = 21 */}
        <span
          className="absolute rounded-full bg-white transition-transform duration-300"
          style={{
            top: 3,
            left: 3,
            width: 20,
            height: 20,
            transform: checked ? "translateX(18px)" : "translateX(0)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.22)",
          }}
        />
      </span>
      <span
        className="text-[13px] font-semibold transition-colors"
        style={{ color: checked ? "var(--text-primary)" : "var(--text-muted)" }}
      >
        {label}
      </span>
    </button>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */
export function NotificationCenter() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const {
    notificationsEnabled,
    items,
    unreadCount,
    setNotificationsEnabled,
    markAllAsRead,
    markAsRead,
    replaceFromAlerts,
  } = useNotificationStore();

  const loadNotifications = useCallback(async () => {
    try {
      const payload = await api.get<{ results: AlertEvent[] }>(
        "/alert-events/?page_size=20&ordering=-timestamp"
      );
      replaceFromAlerts(payload.results ?? []);
    } catch {
      /* keep existing list */
    }
  }, [replaceFromAlerts]);

  useEffect(() => { void loadNotifications(); }, [loadNotifications]);
  useEffect(() => { if (open) void loadNotifications(); }, [open, loadNotifications]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const badgeLabel = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 9 ? "9+" : String(unreadCount);
  }, [unreadCount]);

  /* ────────────────────────────────────────────────────────────────────
     Panel — rendered via React portal to escape header stacking context
     (header has backdrop-filter which creates a new stacking context)
  ──────────────────────────────────────────────────────────────────── */
  const panel = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[9100]"
            style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(3px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <motion.aside
            className="fixed right-0 top-0 z-[9200] flex h-full w-full max-w-[400px] flex-col border-l border-border/50"
            style={{
              background: "var(--surface)",
              backdropFilter: "blur(32px) saturate(160%)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.25)",
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            {/* Top accent strip */}
            <div
              className="h-[3px] w-full shrink-0"
              style={{
                background:
                  "linear-gradient(90deg, var(--accent) 0%, rgba(var(--accent-rgb),0.5) 50%, var(--accent) 100%)",
                backgroundSize: "200%",
                animation: "shimmer 3s linear infinite",
              }}
            />

            {/* ── Header ── */}
            <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-border/50">
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.28em] mb-1.5"
                  style={{ color: "var(--accent)", opacity: 0.7 }}
                >
                  {t("notifications.panel_title")}
                </p>
                <h3 className="font-display font-black text-[22px] leading-none text-text-primary">
                  {t("notifications.panel_heading")}
                </h3>
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.p
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-1.5 text-[12px] font-semibold"
                      style={{ color: "var(--danger)" }}
                    >
                      {t("notifications.unread_badge", { count: unreadCount })}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-surface-el hover:text-text-primary"
              >
                <X size={17} />
              </button>
            </div>

            {/* ── Toggle + Mark all ── */}
            <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50">
              <ToggleSwitch
                checked={notificationsEnabled}
                onChange={setNotificationsEnabled}
                label={t("notifications.enable")}
              />
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold transition-all disabled:opacity-30"
                style={{
                  background: "rgba(var(--accent-rgb),0.1)",
                  border: "1px solid rgba(var(--accent-rgb),0.22)",
                  color: "var(--accent)",
                }}
              >
                <CheckCheck size={13} />
                {t("notifications.mark_all_read")}
              </button>
            </div>

            {/* ── List ── */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {items.length === 0 ? (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                  <div
                    className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{
                      background: "rgba(var(--accent-rgb),0.08)",
                      border: "1px solid rgba(var(--accent-rgb),0.15)",
                    }}
                  >
                    <Bell size={24} style={{ color: "var(--accent)", opacity: 0.45 }} />
                  </div>
                  <p className="font-bold text-text-primary opacity-50">
                    {t("notifications.empty_title")}
                  </p>
                  <p className="mt-1 text-[12px] text-text-muted opacity-60">
                    {t("notifications.empty_subtitle")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map((item) => {
                      const color = ALARM_COLOR[item.alarm_level];
                      const unread = !item.read;
                      return (
                        <motion.button
                          key={String(item.id)}
                          layout
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 16 }}
                          transition={{ duration: 0.16 }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => markAsRead(item.id)}
                          className="w-full overflow-hidden rounded-2xl p-3.5 text-left transition-colors"
                          style={{
                            background: unread
                              ? `${color}0C`
                              : "rgba(var(--accent-rgb),0.03)",
                            border: "1px solid",
                            borderColor: unread
                              ? `${color}35`
                              : "var(--border)",
                            borderLeftWidth: 3,
                            borderLeftColor: unread ? color : "transparent",
                          }}
                        >
                          <div className="flex items-start gap-3">
                            {/* Level badge */}
                            <div
                              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-black"
                              style={{
                                background: `${color}18`,
                                color,
                                border: `1.5px solid ${color}30`,
                                boxShadow: unread ? `0 0 10px ${color}22` : "none",
                              }}
                            >
                              L{item.alarm_level}
                            </div>

                            <div className="min-w-0 flex-1">
                              {/* Row 1 */}
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="flex-1 truncate text-[13px] font-bold text-text-primary">
                                  {item.driver_name}
                                </p>
                                <span
                                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                                  style={{ background: `${color}18`, color }}
                                >
                                  {t(`alarm.level${item.alarm_level}`)}
                                </span>
                                {unread && (
                                  <span
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{
                                      background: color,
                                      boxShadow: `0 0 6px ${color}80`,
                                    }}
                                  />
                                )}
                              </div>

                              {/* Row 2: message */}
                              <p className="text-[12px] leading-snug text-text-muted">
                                {item.alarm_msg}
                              </p>

                              {/* Row 3: device + time */}
                              <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted opacity-60">
                                <span className="font-mono">{item.device_id}</span>
                                <span>{relativeTime(item.timestamp, t)}</span>
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="shrink-0 px-5 py-3 text-[11px] text-text-muted opacity-50 border-t border-border/50">
              {notificationsEnabled
                ? t("notifications.enabled_note")
                : t("notifications.disabled_note")}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* ── Bell button ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("notifications.panel_title")}
        className="btn-press relative flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200"
        style={{
          background: open
            ? "rgba(var(--accent-rgb),0.14)"
            : "var(--surface-el)",
          border: `1px solid ${open ? "rgba(var(--accent-rgb),0.4)" : "var(--border)"}`,
          color: notificationsEnabled ? "var(--text-primary)" : "var(--text-muted)",
          boxShadow: open ? "0 0 0 3px rgba(var(--accent-rgb),0.12)" : "none",
        }}
      >
        {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}

        {/* Slash when disabled */}
        {!notificationsEnabled && (
          <span
            className="absolute rounded-full"
            style={{
              left: 9, right: 9, top: 17,
              height: 1.5,
              transform: "rotate(-38deg)",
              background: "var(--danger)",
            }}
          />
        )}

        {/* Unread badge */}
        <AnimatePresence>
          {badgeLabel && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="absolute -right-1.5 -top-1.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full px-1 text-[9px] font-black leading-none text-white"
              style={{
                background: "var(--danger)",
                boxShadow: "0 2px 6px rgba(255,71,87,0.5), 0 0 0 2px var(--surface)",
              }}
            >
              {badgeLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Portal — renders outside header to avoid stacking context trap */}
      {typeof document !== "undefined" && createPortal(panel, document.body)}
    </>
  );
}
