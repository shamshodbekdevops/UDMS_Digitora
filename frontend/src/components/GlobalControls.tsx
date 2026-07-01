import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Sun } from "lucide-react";
import { useThemeStore } from "@/store/theme";
import { cn } from "@/lib/utils";

function GalaxyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
      <path d="M12 2 L13.5 8 L12 7 L10.5 8 Z" fill="currentColor" stroke="none"/>
      <path d="M12 22 L10.5 16 L12 17 L13.5 16 Z" fill="currentColor" stroke="none"/>
      <path d="M2 12 L8 10.5 L7 12 L8 13.5 Z" fill="currentColor" stroke="none"/>
      <path d="M22 12 L16 13.5 L17 12 L16 10.5 Z" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="12" r="4.5"/>
      <ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-30 12 12)"/>
    </svg>
  );
}

const LANGS = [
  { code: "uz", flag: "🇺🇿", label: "UZ" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "ko", flag: "🇰🇷", label: "KO" },
];

export function GlobalControls() {
  const { i18n } = useTranslation();
  const { isDark, toggle } = useThemeStore();

  return (
    <div className="fixed top-3 left-1/2 z-[1200] -translate-x-1/2 pointer-events-none">
      <div className="glass pointer-events-auto flex items-center gap-1.5 rounded-full px-2 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="flex items-center gap-1 rounded-full border border-border/70 bg-surface-el/70 p-1">
          {LANGS.map((lang) => {
            const active = i18n.language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => i18n.changeLanguage(lang.code)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all duration-200",
                  active ? "bg-accent text-white shadow-sm" : "text-text-muted hover:bg-surface hover:text-text-primary"
                )}
              >
                <span className="text-[13px] leading-none">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggle}
          className="btn-press flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-surface-el/80 text-text-primary transition-all duration-200 hover:bg-surface"
          title={isDark ? "Light mode" : "Dark mode"}
        >
          <motion.div
            key={isDark ? "sun" : "galaxy"}
            initial={{ rotate: -30, opacity: 0, scale: 0.9 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.22 }}
          >
            {isDark ? <Sun size={16} /> : <GalaxyIcon />}
          </motion.div>
        </button>
      </div>
    </div>
  );
}