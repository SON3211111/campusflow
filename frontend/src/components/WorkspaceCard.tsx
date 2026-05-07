import './WorkspaceCard.css';

interface Props {
  name: string;
  gradient: string;
  starred?: boolean;
  onToggleStar?: () => void;
}

export default function WorkspaceCard({ name, gradient, starred, onToggleStar }: Props) {
  return (
    <div className="ws-card">
      <div className="card-thumb" style={{ background: gradient }}>
        <span
          className={`star ${starred ? 'star-on' : 'star-off'}`}
          onClick={(e) => { e.stopPropagation(); onToggleStar?.(); }}
        >
          {starred ? '★' : '☆'}
        </span>
        <div className="card-label">{name}</div>
      </div>
    </div>
  );
}
