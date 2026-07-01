import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  LayoutDashboard, History, BarChart3, Settings,
  LogOut, ChevronDown, Users,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/NotificationCenter";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, labelKey: "nav.fleet" },
  { to: "/history",   icon: History,         labelKey: "nav.history" },
  { to: "/reports",   icon: BarChart3,        labelKey: "nav.reports" },
  { to: "/drivers",   icon: Users,            labelKey: "nav.drivers" },
];

/* ── Shooting stars (dark mode only, via .cosmic-dark) ─────────── */
function ShootingStars() {
  const [stars, setStars] = useState<Array<{ id: number; top: number; left: number; w: number }>>([]);
  const nextId = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        const id = ++nextId.current;
        setStars((s) => [
          ...s.slice(-1), // max 2 at once
          {
            id,
            top:  5  + ((id * 19) % 55),
            left: 10 + ((id * 37) % 72),
            w:    80 + ((id * 11) % 130),
          },
        ]);
        setTimeout(() => setStars((s) => s.filter((x) => x.id !== id)), 2500);
        schedule();
      }, 8_000 + Math.random() * 7_000);
    };
    timerRef.current = setTimeout(schedule, 3_000 + Math.random() * 4_000);
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="cosmic-dark pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s) => (
        <div
          key={s.id}
          className="shooting-star"
          style={{
            top:       `${s.top}%`,
            left:      `${s.left}%`,
            width:     `${s.w}px`,
            animation: "shoot 2s ease-out forwards",
          }}
        />
      ))}
    </div>
  );
}

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const location = useLocation();

  return (
    <div className="page-shell flex h-screen overflow-hidden theme-transition text-text-primary">
      {/* ── Cosmic background layers ── */}
      <div className="pointer-events-none absolute inset-0 page-surface" />
      {/* Vignette — depth effect (dark mode only) */}
      <div
        className="cosmic-dark pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse at 55% 45%, transparent 30%, rgba(0,0,0,0.48) 100%)",
        }}
      />
      {/* Shooting stars */}
      <ShootingStars />

      {/* ── Sidebar ── */}
      <aside className="relative z-10 w-64 shrink-0 flex flex-col glass border-r border-border/50">
        {/* Logo + LIVE badge */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/50">
          <div
            className="h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #D85F1C, #E8762C)",
              boxShadow: "0 8px 24px rgba(232,118,44,0.3)",
            }}
          >
            <span className="text-white font-display font-bold text-sm">DG</span>
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-text-primary text-[15px] leading-none tracking-[0.18em]">
              DIGITORA
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[11px] text-text-muted leading-none tracking-widest uppercase">
                DMS
              </p>
              {/* Live badge */}
              <span
                className="flex items-center gap-1 px-1.5 py-[2px] rounded-full text-[9px] font-black uppercase tracking-widest"
                style={{
                  background: "rgba(255,71,87,0.13)",
                  color: "var(--danger)",
                  border: "1px solid rgba(255,71,87,0.28)",
                }}
              >
                <span
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{ background: "var(--danger)", animation: "health-pulse 1.2s ease-in-out infinite" }}
                />
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Nav with sliding blob */}
        <nav className="relative flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => {
            const isActive =
              location.pathname === to ||
              (to !== "/dashboard" && location.pathname.startsWith(to));
            return (
              <NavLink key={to} to={to}>
                <div
                  className={cn(
                    "relative flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[15px] transition-all duration-200 overflow-hidden",
                    isActive
                      ? "text-text-primary font-semibold"
                      : "text-text-muted hover:text-text-primary"
                  )}
                >
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId="nav-blob"
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background:
                            "rgba(var(--accent-rgb, 108,142,255), 0.14)",
                          boxShadow:
                            "inset 0 0 0 1px rgba(var(--accent-rgb, 108,142,255), 0.18)",
                        }}
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

        {/* Bottom nav */}
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
        {/* Header */}
        <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-5 glass border-b border-border/50">
          <div className="flex-1 flex items-center gap-3 text-text-muted text-[15px]">
            <span className="hidden md:inline-flex h-2 w-2 rounded-full bg-safe shadow-[0_0_18px_rgba(61,220,132,0.45)]" />
            <span className="hidden md:inline">{t("dashboard.live_map")}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <NotificationCenter />

            {/* User dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-2xl hover:bg-surface-el transition-all duration-200 outline-none btn-press">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(var(--accent-rgb, 108,142,255),0.18)" }}
                  >
                    <span className="text-accent text-xs font-bold font-display">
                      {user?.username?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-[15px] text-text-primary">
                    {user?.username}
                  </span>
                  {user?.role && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase font-mono"
                      style={{
                        background: "rgba(var(--accent-rgb,108,142,255),0.18)",
                        color: "var(--accent)",
                      }}
                    >
                      {t(`role.${user.role}`)}
                    </span>
                  )}
                  <ChevronDown size={12} className="text-text-muted" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="glass z-[2000] min-w-[220px] rounded-2xl p-2 outline-none"
                  style={{
                    boxShadow: "0 16px 48px rgba(0,0,0,0.22)",
                  }}
                >
                  <div className="px-3 py-2.5 mb-1">
                    <p className="text-[13px] font-bold text-text-primary">
                      {user?.username}
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5 font-mono">
                      {user?.email}
                    </p>
                    <span
                      className="mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono"
                      style={{
                        background: "rgba(var(--accent-rgb,108,142,255),0.18)",
                        color: "var(--accent)",
                      }}
                    >
                      {t(`role.${user?.role ?? "free"}`)}
                    </span>
                  </div>

                  <DropdownMenu.Separator
                    className="h-px my-1"
                    style={{ background: "rgba(138,148,255,0.15)" }}
                  />

                  <DropdownMenu.Item
                    onSelect={(e) => e.preventDefault()}
                    disabled={user?.role === "business"}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] outline-none select-none cursor-default transition-colors duration-150 data-[highlighted]:bg-surface-el data-[disabled]:opacity-40"
                    style={{
                      color:
                        user?.role === "business"
                          ? "var(--text-muted)"
                          : "var(--text-primary)",
                    }}
                  >
                    {user?.role === "business"
                      ? t("settings.business_active")
                      : t("settings.contact_admin")}
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator
                    className="h-px my-1"
                    style={{ background: "rgba(138,148,255,0.15)" }}
                  />

                  <DropdownMenu.Item
                    onSelect={logout}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] outline-none select-none cursor-default transition-colors duration-150 data-[highlighted]:bg-danger/10"
                    style={{ color: "var(--danger)" }}
                  >
                    <LogOut size={14} />
                    {t("auth.logout")}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </header>

        {/* ── Page content with transitions ── */}
        <main className="flex-1 overflow-auto p-3 md:p-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              className="h-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
