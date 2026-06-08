export type AppTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "app_theme";

export function getStoredTheme(): AppTheme {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return saved === "dark" ? "dark" : "light";
}

export function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function applyStoredTheme() {
  applyTheme(getStoredTheme());
}

export function saveTheme(theme: AppTheme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent("app-theme-change", { detail: theme }));
}
