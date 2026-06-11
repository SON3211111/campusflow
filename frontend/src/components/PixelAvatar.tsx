import "./PixelAvatar.css";
import { getStoredAvatar, type AvatarConfig } from "../utils/pixelAvatar";

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
