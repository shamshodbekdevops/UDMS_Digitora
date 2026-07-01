import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

type Role = "free" | "business";

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({
    username: "", email: "", password: "", password2: "", company_name: "",
  });
  const [role, setRole] = useState<Role>("free");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password2) {
      setError(t("auth.password_mismatch"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post<{ user: User; access: string; refresh: string }>(
        "/accounts/register/",
        { ...form, role, company_name: role === "business" ? form.company_name : undefined }
      );
      setAuth(res.user, { access: res.access, refresh: "" });
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const ROLE_OPTIONS: { value: Role; titleKey: string; descKey: string; badge?: string }[] = [
    { value: "free",     titleKey: "auth.role_free",     descKey: "auth.role_free_desc" },
    { value: "business", titleKey: "auth.role_business", descKey: "auth.role_business_desc", badge: t("auth.business_badge") },
  ];

  return (
    <div className="page-shell min-h-screen flex items-center justify-center p-4 text-text-primary">

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center rounded-3xl mb-3 overflow-hidden"
            style={{
              width: 80, height: 80,
              background: "linear-gradient(135deg, rgba(108,142,255,0.25), rgba(108,142,255,0.08))",
              border: "1.5px solid rgba(138,148,255,0.3)",
              boxShadow: "0 12px 40px rgba(108,142,255,0.2)",
            }}
          >
            <img src="/rasm.png" alt="UDMS" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <h1 className="font-display font-bold text-xl text-text-primary tracking-[0.16em]">UDMS</h1>
          <p className="text-[11px] text-text-muted mt-0.5" style={{ letterSpacing: "0.06em" }}>created by Digitora</p>
        </div>

        <div
          className="rounded-[1.5rem] p-6 md:p-7 shadow-[0_20px_70px_rgba(0,0,0,0.28)]"
          style={{
            background: "var(--login-card-bg)",
            backdropFilter: "blur(24px) saturate(150%)",
            WebkitBackdropFilter: "blur(24px) saturate(150%)",
            border: "1px solid var(--login-card-border)",
          }}
        >
          <h2 className="font-display font-semibold text-lg text-text-primary mb-5">{t("auth.register")}</h2>

          {/* Role selector */}
          <div className="mb-5">
            <Label className="block mb-2">{t("auth.role_label")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={cn(
                    "relative text-left p-3 rounded-xl border transition-all",
                    role === opt.value
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface-el hover:border-border/80"
                  )}
                >
                  {role === opt.value && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </span>
                  )}
                  <p className="text-sm font-medium text-text-primary pr-5">{t(opt.titleKey)}</p>
                  <p className="text-xs text-text-muted mt-0.5">{t(opt.descKey)}</p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reg-username">{t("auth.username")}</Label>
              <Input
                id="reg-username"
                placeholder={t("auth.username_ph")}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-email">{t("auth.email")}</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder={t("auth.email_ph")}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            {role === "business" && (
              <div className="space-y-1.5">
                <Label htmlFor="company">{t("auth.company")}</Label>
                <Input
                  id="company"
                  placeholder={t("auth.company_ph")}
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="pw">{t("auth.password")}</Label>
                <div className="relative">
                  <Input
                    id="pw"
                    type={showPw ? "text" : "password"}
                    placeholder={t("auth.password_ph")}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw2">{t("auth.confirm_password")}</Label>
                <Input
                  id="pw2"
                  type={showPw ? "text" : "password"}
                  placeholder={t("auth.password_ph")}
                  value={form.password2}
                  onChange={(e) => setForm({ ...form, password2: e.target.value })}
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-danger text-sm rounded-lg bg-danger/10 border border-danger/20 px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full mt-1" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {t("auth.register_btn")}
            </Button>
          </form>

          <p className="text-center text-sm text-text-muted mt-5">
            {t("auth.have_account")}{" "}
            <Link to="/login" className="text-accent hover:underline">
              {t("auth.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
