/**
 * 워크스페이스 카드 컴포넌트
 * 그라데이션 썸네일, 즐겨찾기(별) 토글, 호버 시 삭제 버튼 표시
 */
import { useState } from 'react';
import './WorkspaceCard.css';

interface Props {
  name: string;
  gradient: string;
  starred?: boolean;
  onToggleStar?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

export default function WorkspaceCard({ name, gradient, starred, onToggleStar, onDelete, onClick }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="ws-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
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
