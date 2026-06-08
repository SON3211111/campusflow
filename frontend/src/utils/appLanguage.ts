export type AppLanguage = "ko" | "en" | "zh" | "ja" | "ru" | "de";

export const LANGUAGE_STORAGE_KEY = "app_language";

export const LANGUAGES: { code: AppLanguage; label: string; native: string; htmlLang: string }[] = [
  { code: "ko", label: "Korean", native: "한국어", htmlLang: "ko" },
  { code: "en", label: "English", native: "English", htmlLang: "en" },
  { code: "zh", label: "Chinese", native: "中文", htmlLang: "zh" },
  { code: "ja", label: "Japanese", native: "日本語", htmlLang: "ja" },
  { code: "ru", label: "Russian", native: "Русский", htmlLang: "ru" },
  { code: "de", label: "German", native: "Deutsch", htmlLang: "de" },
];

export function getStoredLanguage(): AppLanguage {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return LANGUAGES.some((lang) => lang.code === saved) ? (saved as AppLanguage) : "ko";
}

export function getLanguageMeta(code: AppLanguage) {
  return LANGUAGES.find((lang) => lang.code === code) ?? LANGUAGES[0];
}

export function applyLanguage(language: AppLanguage) {
  document.documentElement.lang = getLanguageMeta(language).htmlLang;
}

export function applyStoredLanguage() {
  applyLanguage(getStoredLanguage());
}

export function saveLanguage(language: AppLanguage) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  applyLanguage(language);
  window.dispatchEvent(new CustomEvent("app-language-change", { detail: language }));
}
