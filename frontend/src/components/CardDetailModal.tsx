/**
 * 카드 상세 모달 컴포넌트
 * 태스크 클릭 시 열리는 상세 편집 화면
 * 설명/마감일 인라인 편집, 댓글 작성 기능 포함
 */
import { useState, useEffect } from "react";
import { CalendarDays, MessageSquare } from "lucide-react";
import client from "../api/client";
import "./CardDetailModal.css";

interface Comment { user: string; text: string; time: string; }

interface Props {
  title: string;
  colName: string;
  taskId?: string;
  workspaceId?: string;
  initialDesc?: string;
  initialDueDate?: string;
  initialComments?: Comment[];
  initialQuickSignal?: string;
  onSaveTitle?: (title: string) => void;
  onSaveDesc?: (desc: string) => void;
  onSaveDueDate?: (dueDate: string) => void;
  onSaveComments?: (comments: Comment[]) => void;
  onSendSignal?: (signal: string | null) => void;
  onClose: () => void;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function CardDetailModal({ title, colName, taskId, workspaceId, initialDesc = "", initialDueDate = "", initialComments = [], initialQuickSignal, onSaveTitle, onSaveDesc, onSaveDueDate, onSaveComments, onSendSignal, onClose }: Props) {
  const userName  = localStorage.getItem("userName") ?? "나";
  const userId    = localStorage.getItem("userId") ?? "";
  const [cardTitle, setCardTitle] = useState(title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [quickSignal, setQuickSignal] = useState(initialQuickSignal ?? null);
  const [desc, setDesc]         = useState(initialDesc);
  const [editingDesc, setEditingDesc] = useState(false);
  const [dueDate, setDueDate]   = useState(initialDueDate);
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [comment, setComment]   = useState("");
  const [comments, setComments] = useState<Comment[]>(initialComments);

  useEffect(() => {
    if (!taskId || !workspaceId) return;
    client.get(`/workspaces/${workspaceId}/tasks/${taskId}/comments`)
      .then((res) => {
        const data = res.data.data ?? [];
        setComments(data.map((c: any) => ({ user: c.senderName, text: c.content, time: timeAgo(c.createdAt) })));
      })
      .catch(() => {});
  }, [taskId, workspaceId]);

  const appendComment = (newComment: Comment) => {
    const nextComments = [...comments, newComment];
    setComments(nextComments);
    onSaveComments?.(nextComments);
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    const text = comment.trim();
    setComment("");
    if (taskId && workspaceId && userId) {
      try {
        const res = await client.post(`/workspaces/${workspaceId}/tasks/${taskId}/comments`, { senderId: userId, content: text });
        const c = res.data.data;
        appendComment({ user: c.senderName, text: c.content, time: "방금 전" });
      } catch (err) {
        console.error("댓글 저장 실패:", err);
        appendComment({ user: userName, text, time: "방금 전" });
      }
    } else {
      appendComment({ user: userName, text, time: "방금 전" });
    }
  };

  return (
    <div className="cdm-overlay" onClick={onClose}>
      <div className="cdm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cdm-header">
          <span className="cdm-col-badge">{colName} ▾</span>
          <div className="cdm-header-actions">
            <button className="cdm-icon-btn">⤢</button>
            <button className="cdm-icon-btn">···</button>
            <button className="cdm-icon-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="cdm-body">
          <div className="cdm-left">
            <div className="cdm-title-row">
              <span className="cdm-title-icon">○</span>
              {editingTitle ? (
                <div className="cdm-title-editor">
                  <input
                    className="cdm-title-input"
                    value={cardTitle}
                    onChange={(e) => setCardTitle(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { onSaveTitle?.(cardTitle); setEditingTitle(false); }
                      if (e.key === "Escape") setEditingTitle(false);
                    }}
                  />
                  <div className="cdm-desc-actions">
                    <button className="cdm-save-btn" onClick={() => { onSaveTitle?.(cardTitle); setEditingTitle(false); }}>저장</button>
                    <button className="cdm-cancel-btn" onClick={() => { setCardTitle(title); setEditingTitle(false); }}>취소</button>
                  </div>
                </div>
              ) : (
                <h2 className="cdm-title" onClick={() => setEditingTitle(true)} title="클릭하여 제목 수정">{cardTitle}</h2>
              )}
            </div>
            <div className="cdm-section">
              <div className="cdm-section-title">
                ≡ 설명
                {!editingDesc && <button className="cdm-edit-btn" onClick={() => setEditingDesc(true)}>수정</button>}
              </div>
              {editingDesc ? (
                <div className="cdm-desc-editor">
                  <textarea
                    className="cdm-desc-textarea"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="자세한 설명을 추가하세요..."
                    autoFocus
                  />
                  <div className="cdm-desc-actions">
                    <button className="cdm-save-btn" onClick={() => { onSaveDesc?.(desc); setEditingDesc(false); }}>저장</button>
                    <button className="cdm-cancel-btn" onClick={() => setEditingDesc(false)}>취소</button>
                  </div>
                </div>
              ) : (
                <div className="cdm-desc-placeholder" onClick={() => setEditingDesc(true)}>
                  {desc || "자세한 설명을 추가하세요..."}
                </div>
              )}
            </div>
            <div className="cdm-section">
              <div className="cdm-section-title">🆘 도움 요청</div>
              <div className="cdm-signal-btns">
                <button
                  className={`cdm-signal-btn ${quickSignal === "HELP_NEEDED" ? "active-help" : ""}`}
                  onClick={() => {
                    const next = quickSignal === "HELP_NEEDED" ? null : "HELP_NEEDED";
                    setQuickSignal(next);
                    onSendSignal?.(next);
                  }}
                >
                  🆘 도움 요청
                </button>
                <button
                  className={`cdm-signal-btn ${quickSignal === "FEEDBACK_NEEDED" ? "active-feedback" : ""}`}
                  onClick={() => {
                    const next = quickSignal === "FEEDBACK_NEEDED" ? null : "FEEDBACK_NEEDED";
                    setQuickSignal(next);
                    onSendSignal?.(next);
                  }}
                >
                  <MessageSquare size={14} />
                  피드백 요청
                </button>
              </div>
            </div>

            <div className="cdm-section">
              <div className="cdm-section-title">
                <CalendarDays size={15} />
                마감일
                {!editingDueDate && <button className="cdm-edit-btn" onClick={() => setEditingDueDate(true)}>수정</button>}
              </div>
              {editingDueDate ? (
                <div className="cdm-desc-editor">
                  <input
                    type="date"
                    className="cdm-desc-textarea"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                  <div className="cdm-desc-actions">
                    <button className="cdm-save-btn" onClick={() => { onSaveDueDate?.(dueDate); setEditingDueDate(false); }}>저장</button>
                    <button className="cdm-cancel-btn" onClick={() => setEditingDueDate(false)}>취소</button>
                  </div>
                </div>
              ) : (
                <div className="cdm-desc-placeholder" onClick={() => setEditingDueDate(true)}>
                  {dueDate || "마감일을 설정하세요..."}
                </div>
              )}
            </div>
          </div>

          <div className="cdm-right">
            <div className="cdm-section-title">
              댓글 및 활동
              <button className="cdm-show-detail">상세 보기</button>
            </div>
            <input
              className="cdm-comment-input"
              placeholder="댓글 작성..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
            />
            <div className="cdm-activity-list">
              {comments.map((c, i) => (
                <div key={i} className="cdm-activity-item">
                  <div className="cdm-activity-avatar">{c.user[0]}</div>
                  <div className="cdm-activity-content">
                    <span className="cdm-activity-user">{c.user}</span>
                    <span className="cdm-activity-text">{c.text}</span>
                    <span className="cdm-activity-time">{c.time}</span>
                  </div>
                </div>
              ))}
              <div className="cdm-activity-item">
                <div className="cdm-activity-avatar">{userName[0]}</div>
                <div className="cdm-activity-content">
                  <span className="cdm-activity-user">{userName}</span>
                  <span className="cdm-activity-text">이 카드를 {colName} 목록에 추가했습니다.</span>
                  <span className="cdm-activity-time">방금</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
