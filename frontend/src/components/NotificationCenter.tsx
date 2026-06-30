import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, CheckCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { ALARM_COLOR } from "@/lib/utils";
import { useNotificationStore } from "@/store/notifications";
import type { AlertEvent } from "@/types";
import { cn } from "@/lib/utils";

function formatNotificationTime(iso: string, t: (key: string, options?: Record<string, unknown>) => string) {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSeconds < 60) return t("time.just_now");
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return minutes === 1 ? t("time.minute_ago") : t("time.minutes_ago", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? t("time.hour_ago") : t("time.hours_ago", { count: hours });
  const days = Math.floor(hours / 24);
  return days === 1 ? t("time.day_ago") : t("time.days_ago", { count: days });
}

function NotificationSwitch({ checked, onChange, label }: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface-el/70 px-4 py-3 text-left transition-colors hover:bg-surface/60"
    >
      <div>
        <p className="text-[13px] font-semibold text-text-primary">{label}</p>
        <p className="text-[11px] text-text-muted">{checked ? "On" : "Off"}</p>
      </div>
      <span
        className={cn(
          "relative h-7 w-12 rounded-full transition-colors duration-200",
          checked ? "bg-accent" : "bg-border"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </span>
    </button>
  );
}

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
      const payload = await api.get<{ results: AlertEvent[] }>("/alert-events/?limit=20");
      replaceFromAlerts(payload.results ?? []);
    } catch {
      // keep existing list if the backend is unavailable
    }
  }, [replaceFromAlerts]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (open) void loadNotifications();
  }, [open, loadNotifications]);

  const badgeLabel = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 9 ? "9+" : String(unreadCount);
  }, [unreadCount]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="btn-press relative flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-surface-el/80 text-text-primary transition-all duration-200 hover:bg-surface"
        aria-label={t("notifications.panel_title")}
      >
        {notificationsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
        {!notificationsEnabled && (
          <span className="absolute inset-x-2 top-4 h-0.5 rotate-[-35deg] rounded-full bg-danger" />
        )}
        {badgeLabel && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-lg">
            {badgeLabel}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[1800] bg-black/35 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed right-0 top-0 z-[1850] h-full w-full max-w-[430px] border-l border-border/50 glass"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3 border-b border-border/50 px-5 py-4">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-text-muted">
                      {t("notifications.panel_title")}
                    </p>
                    <h3 className="font-display text-[20px] font-bold text-text-primary">
                      {t("notifications.panel_heading")}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full p-2 text-text-muted transition-colors hover:bg-surface-el hover:text-text-primary"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="border-b border-border/50 px-5 py-4 space-y-3">
                  <NotificationSwitch
                    checked={notificationsEnabled}
                    onChange={setNotificationsEnabled}
                    label={t("notifications.enable")}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12px] text-text-muted">{t("notifications.unread_badge", { count: unreadCount })}</p>
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface-el px-3 py-2 text-[12px] font-semibold text-text-primary transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <CheckCheck size={13} />
                      {t("notifications.mark_all_read")}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-3">
                  {items.length === 0 ? (
                    <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center text-text-muted">
                      <p className="text-sm font-semibold text-text-primary">{t("notifications.empty_title")}</p>
                      <p className="mt-1 text-xs">{t("notifications.empty_subtitle")}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item) => {
                        const color = ALARM_COLOR[item.alarm_level];
                        const unread = !item.read;
                        return (
                          <button
                            key={String(item.id)}
                            type="button"
                            onClick={() => markAsRead(item.id)}
                            className={cn(
                              "w-full rounded-2xl border p-3 text-left transition-colors hover:bg-surface-el/70",
                              unread ? "border-l-4" : "border-border/50",
                              unread ? "bg-surface-el/40" : "bg-surface/20"
                            )}
                            style={{
                              borderLeftColor: unread ? color : undefined,
                              borderColor: unread ? `${color}55` : undefined,
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                                style={{ background: `${color}22`, color }}
                              >
                                L{item.alarm_level}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start gap-2">
                                  <p className="truncate text-[13px] font-semibold text-text-primary">{item.driver_name}</p>
                                  <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                                    {t(`alarm.level${item.alarm_level}`)}
                                  </span>
                                </div>
                                <p className="mt-1 text-[12px] text-text-muted">{item.alarm_msg}</p>
                                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-text-muted">
                                  <span className="font-mono">{item.device_id}</span>
                                  <span>{formatNotificationTime(item.timestamp, t)}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-border/50 px-5 py-3 text-[11px] text-text-muted">
                  {notificationsEnabled ? t("notifications.enabled_note") : t("notifications.disabled_note")}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
