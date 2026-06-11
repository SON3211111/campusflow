export type AvatarConfig = {
  skin: string;
  hair: string;
  shirt: string;
  bg: string;
};

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: "#f2b98f",
  hair: "#2f2430",
  shirt: "#607cff",
  bg: "#dfe8ff",
};

export const AVATAR_OPTIONS = {
  skin: ["#f2b98f", "#d88b63", "#8f5c42", "#f4d2b6"],
  hair: ["#2f2430", "#4b2f24", "#111827", "#7c4a2d"],
  shirt: ["#607cff", "#4ed3c2", "#22c55e", "#f97316", "#a855f7"],
  bg: ["#dfe8ff", "#e8fbf7", "#f3e8ff", "#fff1df", "#e5e7eb"],
};

export function getStoredAvatar(userId?: string): AvatarConfig {
  if (!userId) return DEFAULT_AVATAR;
  try {
    const saved = localStorage.getItem(`pixel_avatar_${userId}`);
    return saved ? { ...DEFAULT_AVATAR, ...JSON.parse(saved) } : DEFAULT_AVATAR;
  } catch {
    return DEFAULT_AVATAR;
  }
}
