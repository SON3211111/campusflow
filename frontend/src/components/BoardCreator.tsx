import { useState } from 'react';
import './BoardCreator.css';

const GRADIENTS = [
  'linear-gradient(135deg, #74aaff, #a8d0ff)',
  '#1c1c1e',
  '#1a2f5e',
  '#e53935',
  '#ce93d8',
  '#80cbc4',
];

interface Props {
  onClose: () => void;
  onCreate: (name: string, gradient: string) => void;
}

export default function BoardCreator({ onClose: _onClose, onCreate }: Props) {
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState(GRADIENTS[0]);

  return (
    <div className="board-creator">
      <p className="bc-heading">보드 만들기</p>
      <div className="bc-preview" style={{ background: selected }} />
      <p className="bc-section-label">배경</p>
      <div className="bc-color-grid">
        {GRADIENTS.map((g) => (
          <div
            key={g}
            className={`bc-swatch ${selected === g ? 'active' : ''}`}
            style={{ background: g }}
            onClick={() => setSelected(g)}
          />
        ))}
      </div>
      <div className="bc-field">
        <label className="bc-field-label">타이틀</label>
        <input
          className="bc-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <button
        className="bc-create-btn"
        disabled={!title.trim()}
        onClick={() => { if (title.trim()) onCreate(title.trim(), selected); }}
      >
        create
      </button>
    </div>
  );
}
