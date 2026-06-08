import "./PixelAvatar.css";

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

interface PixelAvatarProps {
  config?: AvatarConfig;
  userId?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  title?: string;
}

export default function PixelAvatar({ config, userId, name = "C", size = "md", className = "", title }: PixelAvatarProps) {
  const avatar = config ?? getStoredAvatar(userId);
  const initial = name[0]?.toUpperCase() ?? "C";

  return (
    <div
      className={`pixel-avatar-frame pixel-avatar-frame--${size} ${className}`}
      style={{ background: avatar.bg }}
      aria-label={`${name} 픽셀 아바타`}
      title={title ?? name}
    >
      <div className="pixel-avatar">
        <span className="pixel hair h1" style={{ background: avatar.hair }} />
        <span className="pixel hair h2" style={{ background: avatar.hair }} />
        <span className="pixel hair h3" style={{ background: avatar.hair }} />
        <span className="pixel face f1" style={{ background: avatar.skin }} />
        <span className="pixel face f2" style={{ background: avatar.skin }} />
        <span className="pixel face f3" style={{ background: avatar.skin }} />
        <span className="pixel eye e1" />
        <span className="pixel eye e2" />
        <span className="pixel shirt s1" style={{ background: avatar.shirt }} />
        <span className="pixel shirt s2" style={{ background: avatar.shirt }} />
        <span className="pixel shirt s3" style={{ background: avatar.shirt }} />
        <span className="pixel cap c1" />
        <span className="pixel cap c2" />
        <span className="pixel cap c3" />
        <span className="pixel-initial">{initial}</span>
      </div>
    </div>
  );
}
