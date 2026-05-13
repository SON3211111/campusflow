import { useState } from "react";
import "./JoinModal.css";

interface Props {
  onClose: () => void;
}

export default function JoinModal({ onClose }: Props) {
  const [link, setLink] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="join-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="join-modal-close" onClick={onClose}>✕</button>
        <h3 className="join-modal-title">워크 스페이스 참여</h3>
        <p className="join-modal-desc">링크 검색시 워크 스페이스로 이동합니다</p>
        <input
          className="join-modal-input"
          placeholder="링크 검색"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <button className="join-modal-btn" disabled={!link.trim()}>참여</button>
      </div>
    </div>
  );
}
