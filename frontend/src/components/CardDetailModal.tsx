/**
 * 카드 상세 모달 컴포넌트
 * 태스크 클릭 시 열리는 상세 편집 화면
 * 설명/시작일/마감일 인라인 편집, 댓글 작성 기능 포함
 */
import { useState } from "react";
import "./CardDetailModal.css";

interface Comment { user: string; text: string; time: string; }

interface Props {
  title: string;
  colName: string;
  initialDesc?: string;
  initialStartDate?: string;
  initialDueDate?: string;
  initialComments?: Comment[];
  onSaveDesc?: (desc: string) => void;
  onSaveStartDate?: (startDate: string) => Promise<void> | void;
  onSaveDueDate?: (dueDate: string) => Promise<void> | void;
  onSaveComments?: (comments: Comment[]) => void;
  onClose: () => void;
}

export default function CardDetailModal({
  title, colName,
  initialDesc = "", initialStartDate = "", initialDueDate = "", initialComments = [],
  onSaveDesc, onSaveStartDate, onSaveDueDate, onSaveComments, onClose,
}: Props) {
  const userName = localStorage.getItem("userName") ?? "나";
  const [desc, setDesc]               = useState(initialDesc);
  const [editingDesc, setEditingDesc] = useState(false);
  const [startDate, setStartDate]     = useState(initialStartDate);
  const [dueDate, setDueDate]         = useState(initialDueDate);
  const [editingDate, setEditingDate] = useState(false);
  const [comment, setComment]         = useState("");
  const [comments, setComments]       = useState<Comment[]>(initialComments);

  const handleAddComment = () => {
    if (!comment.trim()) return;
    const updated = [...comments, { user: userName, text: comment.trim(), time: "방금" }];
    setComments(updated);
    onSaveComments?.(updated);
    setComment("");
  };

  const handleSaveDate = async () => {
    await onSaveStartDate?.(startDate);
    await onSaveDueDate?.(dueDate);
    setEditingDate(false);
  };

  const dateLabel = (() => {
    if (startDate && dueDate) return `${startDate} ~ ${dueDate}`;
    if (startDate) return `${startDate} 시작`;
    if (dueDate)   return `${dueDate} 마감`;
    return null;
  })();

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
              <h2 className="cdm-title">{title}</h2>
            </div>

            {/* 설명 */}
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

            {/* 날짜 (시작일 ~ 마감일) */}
            <div className="cdm-section">
              <div className="cdm-section-title">
                📅 날짜
                {!editingDate && <button className="cdm-edit-btn" onClick={() => setEditingDate(true)}>수정</button>}
              </div>
              {editingDate ? (
                <div className="cdm-desc-editor">
                  <div className="cdm-date-row">
                    <div className="cdm-date-field">
                      <label className="cdm-date-label">시작일</label>
                      <input
                        type="date"
                        className="cdm-date-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <span className="cdm-date-sep">→</span>
                    <div className="cdm-date-field">
                      <label className="cdm-date-label">마감일</label>
                      <input
                        type="date"
                        className="cdm-date-input"
                        value={dueDate}
                        min={startDate || undefined}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="cdm-desc-actions">
                    <button className="cdm-save-btn" onClick={handleSaveDate}>저장</button>
                    <button className="cdm-cancel-btn" onClick={() => setEditingDate(false)}>취소</button>
                  </div>
                </div>
              ) : (
                <div className="cdm-desc-placeholder" onClick={() => setEditingDate(true)}>
                  {dateLabel || "날짜를 설정하세요..."}
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
