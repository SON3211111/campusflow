import type { CSSProperties } from "react";

interface WorkspaceTheme {
  id: string;
  gradient: string;
}

const DEFAULT_PRIMARY = "#607cff";
const DEFAULT_SECONDARY = "#805de8";

export function withStoredGradient<T extends WorkspaceTheme>(workspace: T): T {
  const storedGradient = localStorage.getItem(`ws_gradient_${workspace.id}`);
  return storedGradient ? { ...workspace, gradient: storedGradient } : workspace;
}

export function withStoredGradients<T extends WorkspaceTheme>(workspaces: T[]): T[] {
  return workspaces.map(withStoredGradient);
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;
  const number = Number.parseInt(value, 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function isLight(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 178;
}

export function createWorkspaceThemeStyle(gradient?: string): CSSProperties {
  const colors = gradient?.match(/#[0-9a-fA-F]{3,6}\b/g) ?? [];
  const primary = colors[0] ?? DEFAULT_PRIMARY;
  const secondary = colors[1] ?? colors[0] ?? DEFAULT_SECONDARY;
  const { r, g, b } = hexToRgb(primary);

  return {
    "--ws-theme-primary": primary,
    "--ws-theme-secondary": secondary,
    "--ws-theme-primary-rgb": `${r}, ${g}, ${b}`,
    "--ws-theme-on-primary": isLight(primary) ? "#293047" : "#ffffff",
  } as CSSProperties;
}
