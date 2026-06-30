import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  LayoutDashboard, History, BarChart3, Settings,
  Bell, LogOut, ChevronDown,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, labelKey: "nav.fleet" },
  { to: "/history",   icon: History,         labelKey: "nav.history" },
  { to: "/reports",   icon: BarChart3,        labelKey: "nav.reports" },
];

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const location = useLocation();

  return (
    <div className="page-shell flex h-screen overflow-hidden theme-transition text-text-primary">
      <div className="pointer-events-none absolute inset-0 page-surface" />

      {/* ── Sidebar (glassmorphism) ── */}
      <aside className="relative z-10 w-64 shrink-0 flex flex-col glass border-r border-border/50">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/50">
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #D85F1C, #E8762C)", boxShadow: "0 8px 24px rgba(232,118,44,0.3)" }}>
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
                        style={{ background: "rgba(var(--accent-rgb, 108,142,255), 0.14)", boxShadow: "inset 0 0 0 1px rgba(var(--accent-rgb, 108,142,255), 0.18)" }}
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
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="btn-press relative rounded-2xl">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-danger" />
            </Button>

            {/* User avatar + role dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-2xl hover:bg-surface-el transition-all duration-200 outline-none">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(var(--accent-rgb, 108,142,255),0.18)" }}>
                    <span className="text-accent text-xs font-bold font-display">
                      {user?.username?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-[15px] text-text-primary">{user?.username}</span>
                  {user?.role && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase font-mono"
                      style={{ background: "rgba(var(--accent-rgb,108,142,255),0.18)", color: "var(--accent)" }}
                    >
                      {user.role}
                    </span>
                  )}
                  <ChevronDown size={12} className="text-text-muted" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-[2000] min-w-[220px] rounded-2xl p-2 outline-none"
                  style={{
                    background: "rgba(20,22,38,0.96)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(138,148,255,0.18)",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                  }}
                >
                  {/* Profile header */}
                  <div className="px-3 py-2.5 mb-1">
                    <p className="text-[13px] font-bold text-text-primary">{user?.username}</p>
                    <p className="text-[11px] text-text-muted mt-0.5 font-mono">{user?.email}</p>
                    <span
                      className="mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono"
                      style={{ background: "rgba(var(--accent-rgb,108,142,255),0.18)", color: "var(--accent)" }}
                    >
                      {user?.role ?? "free"}
                    </span>
                  </div>

                  <DropdownMenu.Separator className="h-px my-1" style={{ background: "rgba(138,148,255,0.15)" }} />

                  {/* Switch role */}
                  <DropdownMenu.Item
                    disabled={user?.role === "business"}
                    onSelect={(e) => e.preventDefault()}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] outline-none select-none cursor-default transition-colors duration-150 data-[highlighted]:bg-white/5 data-[disabled]:opacity-40"
                    style={{ color: user?.role === "business" ? "var(--text-muted)" : "var(--text-primary)" }}
                  >
                    {user?.role === "business" ? "Upgrade to Business" : "Contact admin"}
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="h-px my-1" style={{ background: "rgba(138,148,255,0.15)" }} />

                  {/* Sign out */}
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

        {/* Page content */}
        <main className="flex-1 overflow-auto p-3 md:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
