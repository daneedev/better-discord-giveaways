import i18n, { t } from "i18next";
import en from "./locales/en.json";
import cs from "./locales/cs.json";

i18n.init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: en },
    cs: { translation: cs },
  },
  supportedLngs: ["en", "cs"],
});

const languages = i18n.languages;

export { i18n, t };
