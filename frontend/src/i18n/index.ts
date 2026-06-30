import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import uz from "./locales/uz.json";
import en from "./locales/en.json";
import ko from "./locales/ko.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { uz: { translation: uz }, en: { translation: en }, ko: { translation: ko } },
    fallbackLng: "uz",
    supportedLngs: ["uz", "en", "ko"],
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "digitora-lang",
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
