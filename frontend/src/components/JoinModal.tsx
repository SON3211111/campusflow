import { useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import "./JoinModal.css";

interface Props {
  onClose: () => void;
}

export default function JoinModal({ onClose }: Props) {
  const navigate = useNavigate();
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!link.trim()) return;
    const userId = localStorage.getItem("userId") ?? "";
    const workspaceId = link.trim();
    setLoading(true);
    try {
      const res = await client.post(`/workspaces/${workspaceId}/join?userId=${userId}`);
      const ws = res.data.data;
      alert(`"${ws.name}" 워크스페이스에 참여했습니다!`);
      onClose();
      navigate("/workspace");
    } catch {
      alert("참여에 실패했습니다. 올바른 워크스페이스 ID를 입력해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="join-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="join-modal-close" onClick={onClose}>✕</button>
        <h3 className="join-modal-title">워크 스페이스 참여</h3>
        <p className="join-modal-desc">워크스페이스 ID를 입력하여 참여합니다</p>
        <input
          className="join-modal-input"
          placeholder="워크스페이스 ID 입력"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
        />
        <button
          className="join-modal-btn"
          disabled={!link.trim() || loading}
          onClick={handleJoin}
        >
          {loading ? "참여 중..." : "참여"}
        </button>
      </div>
    </div>
  );
}
