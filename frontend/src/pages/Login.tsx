import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2, User, Lock, Shield, Wifi } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import type { User as UserType, AuthTokens } from "@/types";

/* ──────────────────────────────────────────
   Shooting stars (dark mode only)
────────────────────────────────────────── */
const STAR_CFG = [
  { top: "8%",  left: "72%", w: 130, delay: "0s",    dur: "16s" },
  { top: "18%", left: "55%", w: 100, delay: "3.5s",  dur: "19s" },
  { top: "4%",  left: "38%", w: 115, delay: "7.2s",  dur: "15s" },
  { top: "32%", left: "88%", w: 90,  delay: "11s",   dur: "21s" },
  { top: "13%", left: "64%", w: 125, delay: "14s",   dur: "17s" },
  { top: "2%",  left: "29%", w: 108, delay: "18.5s", dur: "14s" },
  { top: "40%", left: "75%", w: 95,  delay: "22s",   dur: "20s" },
  { top: "7%",  left: "85%", w: 120, delay: "26s",   dur: "16s" },
  { top: "25%", left: "47%", w: 105, delay: "30s",   dur: "18s" },
];

function ShootingStars() {
  return (
    <>
      {STAR_CFG.map((s, i) => (
        <div
          key={i}
          className="shooting-star"
          style={{
            top: s.top,
            left: s.left,
            width: s.w,
            animation: `shoot ${s.dur} linear ${s.delay} infinite`,
          }}
        />
      ))}
    </>
  );
}

/* ──────────────────────────────────────────
   Floating accent orbs (light mode hero)
────────────────────────────────────────── */
function LightModeOrbs() {
  return (
    <>
      <div style={{
        position: "absolute", top: "15%", right: "8%",
        width: 180, height: 180, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
        animation: "hero-glow 4s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "20%", left: "10%",
        width: 240, height: 240, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 65%)",
        animation: "hero-glow 6s ease-in-out infinite reverse",
      }} />
      {/* Grid pattern overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }} />
    </>
  );
}

/* ──────────────────────────────────────────
   Styled input with leading icon
────────────────────────────────────────── */
function IconInput({
  id, type = "text", placeholder, value, onChange, required,
  icon, suffix,
}: {
  id: string; type?: string; placeholder: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean;
  icon: React.ReactNode; suffix?: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3.5 text-text-muted pointer-events-none" style={{ lineHeight: 0 }}>
        {icon}
      </span>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full py-3 pl-10 pr-11 rounded-xl text-[15px] text-text-primary font-body outline-none transition-all duration-200"
        style={{
          background: "var(--surface-el)",
          border: "1.5px solid var(--border)",
          fontWeight: 500,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(var(--accent-rgb),0.12)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
      />
      {suffix && (
        <span className="absolute right-3.5 flex items-center">{suffix}</span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGE
══════════════════════════════════════════ */
export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({ username: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const tokenRes = await fetch("/api/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!tokenRes.ok) throw new Error("Username yoki parol noto'g'ri");
      const tokens: AuthTokens = await tokenRes.json();

      const meRes = await fetch("/api/accounts/me/", {
        headers: { Authorization: `Bearer ${tokens.access}` },
      });
      if (!meRes.ok) throw new Error("Foydalanuvchi ma'lumotlarini olishda xatolik");
      const user: UserType = await meRes.json();

      setAuth(user, tokens);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell min-h-screen flex flex-col lg:flex-row text-text-primary">

      {/* ══════════════ LEFT HERO (lg+) ══════════════ */}
      <div className="hidden lg:flex lg:w-[56%] relative flex-col overflow-hidden">

        {/* Dark overlay */}
        <div className="cosmic-dark absolute inset-0"
          style={{ background: "linear-gradient(155deg, rgba(8,4,22,0.72) 0%, rgba(4,14,38,0.60) 100%)" }} />
        {/* Light overlay */}
        <div className="cosmic-light absolute inset-0"
          style={{ background: "linear-gradient(145deg, #06245C 0%, #0B3DAD 40%, #1254C5 70%, #1869D4 100%)" }} />

        {/* Shooting stars + nebula accents */}
        <div className="cosmic-dark absolute inset-0 overflow-hidden pointer-events-none">
          <ShootingStars />
          <div style={{
            position: "absolute", bottom: "8%", left: "4%",
            width: 320, height: 320, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(80,60,180,0.2) 0%, transparent 65%)",
          }} />
          <div style={{
            position: "absolute", top: "12%", right: "6%",
            width: 240, height: 240, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(45,27,105,0.25) 0%, transparent 65%)",
          }} />
        </div>

        <div className="cosmic-light absolute inset-0 pointer-events-none">
          <LightModeOrbs />
        </div>

        {/* Hero content — 3 zone: top / center / bottom */}
        <div className="relative z-10 flex flex-col justify-between h-full px-12 py-12">

          {/* Zone 1: KOICA badge */}
          <div className="flex items-center gap-2" style={{ animation: "card-rise 0.3s ease-out both" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em" }}>
              KOICA ODA · Digitora · 2026
            </span>
          </div>

          {/* Zone 2: Main visual content */}
          <div>
            {/* Glowing AI orb */}
            <div className="relative mb-10" style={{ width: 76, height: 76 }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: "radial-gradient(circle at 38% 32%, rgba(180,210,255,0.95) 0%, rgba(108,142,255,0.85) 40%, rgba(61,220,132,0.35) 80%, transparent 100%)",
                boxShadow: "0 0 36px rgba(108,142,255,0.75), 0 0 72px rgba(108,142,255,0.3), 0 0 120px rgba(108,142,255,0.12)",
                animation: "hero-glow 3.2s ease-in-out infinite",
              }} />
              <div style={{
                position: "absolute", inset: -14, borderRadius: "50%",
                border: "1px solid rgba(108,142,255,0.28)",
                animation: "radar-ping 3.5s ease-out infinite",
              }} />
              <div style={{
                position: "absolute", inset: -14, borderRadius: "50%",
                border: "1px solid rgba(108,142,255,0.15)",
                animation: "radar-ping 3.5s ease-out 1.75s infinite",
              }} />
            </div>

            {/* Headline */}
            <h1 className="font-display font-black text-white leading-[1.08]" style={{ fontSize: 52 }}>
              {t("auth.hero_line1")}
            </h1>
            <h1 className="font-display font-black leading-[1.08] mb-6" style={{
              fontSize: 52,
              background: "linear-gradient(110deg, #7DAAFF 0%, #3DDC84 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              {t("auth.hero_line2")}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, lineHeight: 1.7, maxWidth: 380 }}>
              {t("auth.hero_description")}
            </p>

            {/* Feature list */}
            <div className="mt-10 space-y-3">
              {[
                { icon: <Eye size={15} />,    text: t("auth.feature_perclos") },
                { icon: <Shield size={15} />, text: t("auth.feature_alert") },
                { icon: <Wifi size={15} />,   text: t("auth.feature_realtime") },
              ].map(({ icon, text }, i) => (
                <div key={i} className="flex items-center gap-3"
                  style={{ animation: `chip-appear 0.5s ease-out ${0.15 + i * 0.1}s both` }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(108,142,255,0.12)",
                    border: "1px solid rgba(108,142,255,0.22)",
                    color: "#8AAEFF",
                  }}>
                    {icon}
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zone 3: Bottom live indicator */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
              {t("auth.hero_live_badge")}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════ RIGHT FORM ══════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 min-h-screen lg:min-h-0">

        {/* Logo above card — all sizes */}
        <div className="flex flex-col items-center mb-7" style={{ animation: "card-rise 0.3s ease-out both" }}>
          <div
            className="rounded-3xl overflow-hidden shadow-2xl mb-3"
            style={{
              width: 90, height: 90,
              background: "linear-gradient(135deg, rgba(108,142,255,0.25), rgba(108,142,255,0.08))",
              border: "1.5px solid rgba(138,148,255,0.32)",
              boxShadow: "0 16px 48px rgba(108,142,255,0.22)",
            }}
          >
            <img src="/rasm.png" alt="UDMS" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <p className="font-display font-black text-text-primary tracking-[0.18em] leading-none" style={{ fontSize: 22 }}>
            UDMS
          </p>
          <p className="mt-1.5" style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
            created by Digitora
          </p>
        </div>

        {/* Form card */}
        <div
          className="w-full max-w-[420px]"
          style={{ animation: "card-rise 0.45s ease-out both" }}
        >
          <div
            className="rounded-3xl p-8 lg:p-9"
            style={{
              background: "var(--login-card-bg)",
              backdropFilter: "blur(24px) saturate(150%)",
              WebkitBackdropFilter: "blur(24px) saturate(150%)",
              border: "1px solid var(--login-card-border)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            {/* Heading */}
            <div className="mb-7">
              <h2 className="font-display font-black text-text-primary" style={{ fontSize: 26 }}>
                {t("auth.welcome")}
              </h2>
              <p className="text-text-muted mt-1 font-medium" style={{ fontSize: 14 }}>
                {t("auth.login_subtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <label htmlFor="username" className="block font-semibold text-text-primary" style={{ fontSize: 14 }}>
                  {t("auth.username")}
                </label>
                <IconInput
                  id="username"
                  placeholder={t("auth.username_ph")}
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  icon={<User size={15} />}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block font-semibold text-text-primary" style={{ fontSize: 14 }}>
                  {t("auth.password")}
                </label>
                <IconInput
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder={t("auth.password_ph")}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  icon={<Lock size={15} />}
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="text-text-muted hover:text-text-primary transition-colors"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.22)", color: "#FF4757" }}
                >
                  <span className="mt-0.5 shrink-0">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-display font-bold text-white text-[15px] btn-press transition-all duration-200 flex items-center justify-center gap-2.5 mt-2"
                style={{
                  background: loading
                    ? "rgba(var(--accent-rgb), 0.5)"
                    : "linear-gradient(135deg, var(--accent-warm) 0%, var(--accent) 100%)",
                  boxShadow: loading ? "none" : "0 4px 20px rgba(var(--accent-rgb), 0.35)",
                }}
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> {t("auth.checking")}</>
                ) : (
                  <>{t("auth.login_btn")} <span style={{ fontSize: 18 }}>→</span></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <span className="text-text-muted font-medium" style={{ fontSize: 12 }}>
                {t("auth.no_account")}
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            </div>

            <Link
              to="/register"
              className="block w-full py-3 rounded-xl font-semibold text-center transition-all duration-200"
              style={{
                background: "var(--surface-el)",
                border: "1.5px solid var(--border)",
                color: "var(--text-primary)",
                fontSize: 14,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-glow)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              {t("auth.register")}
            </Link>
          </div>

          <p className="text-center text-[11px] text-text-muted mt-5 font-mono">
            {t("auth.footer_line")}
          </p>
        </div>
      </div>
    </div>
  );
}
