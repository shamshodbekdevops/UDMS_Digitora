import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  apply: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: true,
      toggle: () => {
        const next = !get().isDark;
        set({ isDark: next });
        document.documentElement.classList.toggle("light", !next);
      },
      apply: () => {
        const { isDark } = get();
        document.documentElement.classList.toggle("light", !isDark);
      },
    }),
    { name: "digitora-theme" }
  )
);
