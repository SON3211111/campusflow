import { useState } from 'react';
import './WorkspaceCard.css';

interface Props {
  name: string;
  gradient: string;
  starred?: boolean;
  onToggleStar?: () => void;
  onDelete?: () => void;
}

export default function WorkspaceCard({ name, gradient, starred, onToggleStar, onDelete }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="ws-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="card-thumb" style={{ background: gradient }}>
        <span
          className={`star ${starred ? 'star-on' : 'star-off'}`}
          onClick={(e) => { e.stopPropagation(); onToggleStar?.(); }}
        >
          {starred ? '★' : '☆'}
        </span>
        {onDelete && hovered && (
          <span
            className="card-delete-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="삭제"
          >
            ✕
          </span>
        )}
        <div className="card-label">{name}</div>
      </div>
    </div>
  );
}
