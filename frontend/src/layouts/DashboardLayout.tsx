import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, History, BarChart3, Settings,
  Moon, Sun, Bell, LogOut, ChevronDown,
} from "lucide-react";
import { useThemeStore } from "@/store/theme";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function LiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
  );
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/50"
      style={{ background: "var(--surface-el)" }}>
      <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" />
      <span className="font-mono font-bold text-text-primary tabular-nums" style={{ fontSize: 13 }}>{time}</span>
    </div>
  );
}

const LANGS = [
  { code: "uz", flag: "🇺🇿", label: "O'z" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "ko", flag: "🇰🇷", label: "한국" },
];

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, labelKey: "nav.fleet" },
  { to: "/history",   icon: History,         labelKey: "nav.history" },
  { to: "/reports",   icon: BarChart3,        labelKey: "nav.reports" },
];

export default function DashboardLayout() {
  const { t, i18n } = useTranslation();
  const { isDark, toggle } = useThemeStore();
  const { user, logout } = useAuthStore();
  const location = useLocation();

  return (
    <div className="page-shell flex h-screen overflow-hidden theme-transition text-text-primary">
      <div className="pointer-events-none absolute inset-0 page-surface" />

      {/* ── Sidebar (glassmorphism) ── */}
      <aside className="relative z-10 w-64 shrink-0 flex flex-col glass border-r border-border/50">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/50">
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-lg shadow-[rgba(var(--accent-rgb),0.25)]"
            style={{ background: "linear-gradient(135deg, var(--accent-warm), var(--accent))" }}>
            <span className="text-white font-display font-bold text-sm">DG</span>
          </div>
          <div>
            <p className="font-display font-bold text-text-primary text-[15px] leading-none tracking-[0.18em]">
              DIGITORA
            </p>
            <p className="text-[11px] text-text-muted leading-none mt-0.5 tracking-widest uppercase">
              DMS
            </p>
          </div>
        </div>

        {/* Nav with Framer Motion blob (9-effekt: siljuvchi blob) */}
        <nav className="relative flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => {
            const isActive = location.pathname === to ||
              (to !== "/dashboard" && location.pathname.startsWith(to));
            return (
              <NavLink key={to} to={to}>
                <div className={cn(
                  "relative flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[15px] transition-all duration-200 overflow-hidden",
                  isActive ? "text-text-primary font-semibold" : "text-text-muted hover:text-text-primary"
                )}>
                  {/* Animated blob — slides between items */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="nav-blob"
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: "rgba(var(--accent-rgb, 232,118,44), 0.14)", boxShadow: "inset 0 0 0 1px rgba(var(--accent-rgb, 232,118,44), 0.18)" }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                      />
                    )}
                  </AnimatePresence>
                  <Icon size={16} className="relative z-10 shrink-0" />
                  <span className="relative z-10">{t(labelKey)}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-border/50 space-y-1">
          <NavLink to="/settings">
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[15px] text-text-muted hover:text-text-primary hover:bg-surface-el transition-all duration-200">
              <Settings size={16} />
              <span>{t("nav.settings")}</span>
            </div>
          </NavLink>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[15px] text-text-muted hover:text-danger hover:bg-danger/10 transition-all duration-200"
          >
            <LogOut size={16} />
            <span>{t("auth.logout")}</span>
          </button>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">

        {/* Header (glassmorphism) */}
        <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-5 glass border-b border-border/50">
          <div className="flex-1 flex items-center gap-3 text-text-muted text-[15px]">
            <span className="hidden md:inline-flex h-2 w-2 rounded-full bg-safe shadow-[0_0_18px_rgba(61,220,132,0.45)]" />
            <span className="hidden md:inline">{t("dashboard.live_map")}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Live clock */}
            <LiveClock />

            {/* Language */}
            <div className="flex items-center rounded-2xl border border-border overflow-hidden glass">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => i18n.changeLanguage(l.code)}
                  className={cn(
                    "px-3 py-2 text-[13px] transition-all duration-200",
                    i18n.language === l.code
                      ? "bg-accent text-white shadow-sm"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-el"
                  )}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="btn-press rounded-2xl"
              title={isDark ? t("theme.light") : t("theme.dark")}
            >
              <motion.div
                key={isDark ? "moon" : "sun"}
                initial={{ rotate: -30, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </motion.div>
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="btn-press relative rounded-2xl">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-danger" />
            </Button>

            {/* User avatar */}
            <button className="flex items-center gap-2 px-3 py-2 rounded-2xl hover:bg-surface-el transition-all duration-200">
              <div className="h-8 w-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(var(--accent-rgb, 232,118,44),0.18)" }}>
                <span className="text-accent text-xs font-bold font-display">
                  {user?.username?.[0]?.toUpperCase()}
                </span>
              </div>
              <span className="text-[15px] text-text-primary">{user?.username}</span>
              <ChevronDown size={12} className="text-text-muted" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-3 md:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
