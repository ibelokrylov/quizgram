import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "../locales/en/common.json";
import ruCommon from "../locales/ru/common.json";

const resources = {
  en: {
    common: enCommon,
  },
  ru: {
    common: ruCommon,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    debug: import.meta.env.ENV === "development",

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },

    ns: ["common"],
    defaultNS: "common",
  });

export default i18n;
