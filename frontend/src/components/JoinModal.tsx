/**
 * 워크스페이스 참여 모달
 * 초대 링크 또는 워크스페이스 ID 입력 시 오너에게 참여 요청 알림 전송
 */
import { useState } from "react";
import client from "../api/client";
import "./JoinModal.css";

interface Props {
  onClose: () => void;
}

function extractWorkspaceId(input: string): string {
  // 초대 링크 형식: .../join/{workspaceId}
  const match = input.match(/\/join\/([a-zA-Z0-9-]+)/);
  if (match) return match[1];
  return input.trim();
}

export default function JoinModal({ onClose }: Props) {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleJoin = async () => {
    if (!link.trim()) return;
    const userId = localStorage.getItem("userId") ?? "";
    const workspaceId = extractWorkspaceId(link);
    setLoading(true);
    try {
      await client.post(`/workspaces/${workspaceId}/request-join?userId=${userId}`);
      setDone(true);
    } catch (err: any) {
      const msg = err.response?.data?.message ?? "요청에 실패했습니다.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="join-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="join-modal-close" onClick={onClose}>✕</button>
        <h3 className="join-modal-title">워크 스페이스 참여</h3>
        {done ? (
          <p className="join-modal-desc" style={{ color: "#4f7cff", textAlign: "center" }}>
            참여 요청을 보냈습니다! 팀장의 수락을 기다려주세요.
          </p>
        ) : (
          <>
            <p className="join-modal-desc">초대 링크 또는 워크스페이스 ID를 입력하세요</p>
            <input
              className="join-modal-input"
              placeholder="초대 링크 또는 ID 입력"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
            />
            <button
              className="join-modal-btn"
              disabled={!link.trim() || loading}
              onClick={handleJoin}
            >
              {loading ? "요청 중..." : "참여"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
