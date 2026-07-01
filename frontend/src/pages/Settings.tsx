import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/auth";
import { useNotificationStore } from "@/store/notifications";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Shield, CreditCard, Bell, Zap,
  Save, Check, Smartphone,
} from "lucide-react";
import type { Device, User as UserType } from "@/types";
import { cn } from "@/lib/utils";

type TabType = "profile" | "account" | "billing" | "notifications" | "devices";

export default function Settings() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceCount, setDeviceCount] = useState(0);

  const tabs = [
    { id: "profile" as const, label: t("settings.profile"), icon: User },
    { id: "account" as const, label: t("settings.account"), icon: Shield },
    ...(user?.role === "business" ? [{ id: "billing" as const, label: t("settings.billing"), icon: CreditCard }] : []),
    { id: "notifications" as const, label: t("settings.notifications_settings"), icon: Bell },
    { id: "devices" as const, label: t("settings.devices"), icon: Smartphone },
  ];

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const resp = await api.get<{ results: Device[] }>("/dms/devices/");
        setDevices(resp.results ?? []);
        const countResp = await api.get<{ count: number }>("/devices/count/");
        setDeviceCount(countResp.count ?? 0);
      } catch {
        // keep empty list
      }
    };
    void fetchDevices();
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-text-primary text-lg">{t("settings.title")}</h1>
        <p className="text-[12px] text-text-muted mt-0.5">{t("settings.account_subtitle")}</p>
      </div>

      {/* Main content */}
      <div className="flex gap-4 min-h-[500px]">
        {/* Sidebar tabs */}
        <nav className="w-56 shrink-0">
          <div className="glass rounded-2xl p-2 space-y-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-[13px] font-semibold transition-all duration-200 overflow-hidden",
                  activeTab === id
                    ? "text-text-primary"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                {activeTab === id && (
                  <motion.div
                    layoutId="settings-tab"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: "rgba(var(--accent-rgb),0.14)",
                      border: "1px solid rgba(var(--accent-rgb),0.25)",
                    }}
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon size={16} className="relative z-10 shrink-0" />
                <span className="relative z-10 truncate">{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Content area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === "profile" && <ProfileTab user={user} setUser={setUser} loading={loading} setLoading={setLoading} />}
              {activeTab === "account" && <AccountTab user={user} deviceCount={deviceCount} />}
              {activeTab === "billing" && user?.role === "business" && <BillingTab />}
              {activeTab === "notifications" && <NotificationsTab />}
              {activeTab === "devices" && <DevicesTab devices={devices} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   PROFILE TAB
═════════════════════════════════════════════ */
function ProfileTab({ user, setUser, loading, setLoading }: {
  user: UserType | null;
  setUser: (user: UserType) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({
    username: user?.username ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const resp = await api.patch<UserType>("/users/me/", form);
      setUser(resp);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <div>
        <label className="block text-[12px] font-bold uppercase tracking-widest text-text-muted mb-2">
          {t("settings.display_name")}
        </label>
        <input
          type="text"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="w-full rounded-xl border border-border bg-surface-el px-4 py-2.5 text-text-primary text-[14px] outline-none focus:border-accent transition-colors"
        />
      </div>

      <div>
        <label className="block text-[12px] font-bold uppercase tracking-widest text-text-muted mb-2">
          {t("settings.email_label")}
        </label>
        <input
          type="email"
          value={form.email}
          disabled
          className="w-full rounded-xl border border-border bg-surface-el/50 px-4 py-2.5 text-text-muted text-[14px] outline-none opacity-60"
        />
        <p className="text-[11px] text-text-muted mt-1">{t("settings.email_readonly")}</p>
      </div>

      <div>
        <label className="block text-[12px] font-bold uppercase tracking-widest text-text-muted mb-2">
          {t("settings.phone_label")}
        </label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+998 ..."
          className="w-full rounded-xl border border-border bg-surface-el px-4 py-2.5 text-text-primary text-[14px] outline-none focus:border-accent transition-colors"
        />
      </div>

      <div>
        <label className="block text-[12px] font-bold uppercase tracking-widest text-text-muted mb-2">
          {t("settings.language_label")}
        </label>
        <select
          value={i18n.language}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface-el px-4 py-2.5 text-text-primary text-[14px] outline-none focus:border-accent transition-colors"
        >
          <option value="uz">O'zbekcha</option>
          <option value="en">English</option>
          <option value="ko">한국어</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-semibold text-[13px] transition-all hover:bg-accent/90 disabled:opacity-50"
        >
          <Save size={14} />
          {t("settings.save")}
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-safe/10 text-safe text-[12px] font-semibold">
            <Check size={14} />
            {t("settings.saved_msg")}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ACCOUNT & ROLE TAB
═════════════════════════════════════════════ */
function AccountTab({ user, deviceCount }: { user: UserType | null; deviceCount: number }) {
  const { t } = useTranslation();
  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <div>
        <p className="text-[12px] font-bold uppercase tracking-widest text-text-muted mb-3">{t("settings.current_role")}</p>
        <div
          className="inline-flex px-4 py-2.5 rounded-2xl text-[14px] font-bold"
          style={{
            background: user?.role === "free" ? "rgba(61,220,132,0.15)" : "rgba(138,148,255,0.18)",
            color: user?.role === "free" ? "#3DDC84" : "var(--accent)",
            border: `1.5px solid ${user?.role === "free" ? "rgba(61,220,132,0.35)" : "rgba(138,148,255,0.35)"}`,
          }}
        >
          {t(`role.${user?.role ?? "free"}`)}
        </div>
      </div>

      {user?.role === "free" && (
        <div className="rounded-2xl border border-accent/30 bg-accent/8 p-4 space-y-3">
          <p className="font-semibold text-text-primary">{t("settings.upgrade_to_business")}</p>
          <ul className="text-[13px] text-text-muted space-y-1">
            <li>✓ {t("settings.feature_fleet")}</li>
            <li>✓ {t("settings.feature_analytics")}</li>
            <li>✓ {t("settings.feature_support")}</li>
          </ul>
          <a
            href="mailto:sales@digitora.uz"
            className="inline-flex px-3 py-2 rounded-lg bg-accent text-white text-[12px] font-bold transition-all hover:bg-accent/90"
          >
            {t("settings.contact_sales")}
          </a>
        </div>
      )}

      {user?.role === "business" && (
        <>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-widest text-text-muted mb-2">{t("settings.device_usage")}</p>
            <p className="text-[24px] font-black text-text-primary">{deviceCount} / 10 {t("settings.devices")}</p>
          </div>
        </>
      )}

      <div>
        <p className="text-[12px] font-bold uppercase tracking-widest text-text-muted mb-2">{t("settings.account_status")}</p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-safe/10 text-safe text-[12px] font-bold">
          <Check size={12} />
          {t("settings.active")}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   BILLING TAB (BUSINESS ONLY)
═════════════════════════════════════════════ */
function BillingTab() {
  const { t } = useTranslation();
  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <div>
        <p className="text-[12px] font-bold uppercase tracking-widest text-text-muted mb-2">{t("settings.current_plan")}</p>
        <p className="text-[18px] font-bold text-text-primary">{t("settings.business_plan")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-text-muted mb-2">{t("settings.billing_next")}</p>
          <p className="text-text-primary">August 1, 2026</p>
        </div>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-text-muted mb-2">{t("settings.billing_devices_used")}</p>
          <p className="text-text-primary">3 / 10</p>
        </div>
      </div>

      <div>
        <p className="text-[12px] font-bold uppercase tracking-widest text-text-muted mb-3">{t("settings.billing_usage")}</p>
        <div className="h-2 bg-surface-el rounded-full overflow-hidden">
          <div className="h-full w-3/5 bg-accent transition-all" />
        </div>
        <p className="text-[12px] text-text-muted mt-2">152 / 250 alert events logged</p>
      </div>

      <div>
        <p className="text-[12px] font-bold uppercase tracking-widest text-text-muted mb-3">{t("settings.invoice_history")}</p>
        <div className="space-y-2">
          {[
            { date: "July 1, 2026", amount: "$49.00", status: "Paid" },
            { date: "June 1, 2026", amount: "$49.00", status: "Paid" },
            { date: "May 1, 2026", amount: "$49.00", status: "Paid" },
          ].map((invoice, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-el/50">
              <div>
                <p className="text-[13px] font-semibold text-text-primary">{invoice.date}</p>
                <p className="text-[11px] text-text-muted">{invoice.amount}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-safe/10 text-safe">
                  {t("settings.paid")}
                </span>
                <a href="#" className="text-[11px] text-accent hover:underline">
                  PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="px-4 py-2.5 rounded-xl bg-danger/10 text-danger font-semibold text-[13px] transition-all hover:bg-danger/20">
        {t("settings.cancel_plan")}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════
   NOTIFICATIONS SETTINGS TAB
═════════════════════════════════════════════ */
function NotificationsTab() {
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const {
    emailAlertsLevel3,
    browserPushNotifications,
    soundAlerts,
    sensitivity,
    setEmailAlertsLevel3,
    setBrowserPushNotifications,
    setSoundAlerts,
    setSensitivity,
  } = useNotificationStore();

  // Sync initial values from the backend user object on first mount
  useEffect(() => {
    if (user?.email_alerts_level3 !== undefined) setEmailAlertsLevel3(user.email_alerts_level3);
    if (user?.browser_push_notifications !== undefined) setBrowserPushNotifications(user.browser_push_notifications);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchUser = async (patch: Record<string, unknown>) => {
    try {
      const updated = await api.patch<UserType>("/users/me/", patch);
      setUser(updated);
    } catch {
      // silently ignore — local state is still updated
    }
  };

  const handleEmailAlerts = async (enabled: boolean) => {
    setEmailAlertsLevel3(enabled);
    await patchUser({ email_alerts_level3: enabled });
  };

  const handleBrowserPush = async (enabled: boolean) => {
    if (enabled && "Notification" in window) {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
    }
    setBrowserPushNotifications(enabled);
    await patchUser({ browser_push_notifications: enabled });
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <div className="space-y-3">
        {[
          {
            id: "email",
            label: t("settings.email_alerts_level3"),
            checked: emailAlertsLevel3,
            onChange: handleEmailAlerts,
          },
          {
            id: "browser",
            label: t("settings.browser_push"),
            checked: browserPushNotifications,
            onChange: handleBrowserPush,
          },
          {
            id: "sound",
            label: t("settings.sound_alerts"),
            checked: soundAlerts,
            onChange: (v: boolean) => setSoundAlerts(v),
          },
        ].map(({ id, label, checked, onChange }) => (
          <button
            key={id}
            onClick={() => onChange(!checked)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface-el/70 px-4 py-3 text-left transition-colors hover:bg-surface/60"
          >
            <p className="text-[13px] font-semibold text-text-primary">{label}</p>
            <span
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                checked ? "bg-accent" : "bg-border"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  checked ? "translate-x-5.5" : "translate-x-0.5"
                )}
              />
            </span>
          </button>
        ))}
      </div>

      <div>
        <label className="block text-[12px] font-bold uppercase tracking-widest text-text-muted mb-3">
          {t("settings.notify_at_level")}
        </label>
        <select
          value={sensitivity}
          onChange={(e) => setSensitivity(parseInt(e.target.value) as 1 | 2 | 3)}
          className="w-full rounded-xl border border-border bg-surface-el px-4 py-2.5 text-text-primary text-[14px] outline-none focus:border-accent transition-colors"
        >
          <option value={1}>{t("settings.level_caution")}</option>
          <option value={2}>{t("settings.level_warning")}</option>
          <option value={3}>{t("settings.level_danger")}</option>
        </select>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   DEVICES TAB
═════════════════════════════════════════════ */
function DevicesTab({ devices }: { devices: Device[] }) {
  const { t } = useTranslation();
  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      {devices.length === 0 ? (
        <div className="py-12 text-center">
          <Zap size={32} className="mx-auto mb-3 text-text-muted opacity-40" />
          <p className="text-[13px] font-semibold text-text-muted">{t("common.no_data")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => (
            <div key={device.device_id} className="flex items-center justify-between p-3 rounded-lg bg-surface-el/50 border border-border/40">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "inline-block w-2 h-2 rounded-full",
                  device.live ? "bg-safe" : "bg-text-muted"
                )} />
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">{device.device_id}</p>
                  <p className="text-[11px] text-text-muted">{device.driver_name}</p>
                </div>
              </div>
              <p className="text-[11px] text-text-muted">{device.live ? t("settings.online") : t("settings.offline")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
