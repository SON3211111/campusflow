/**
 * 카드 상세 모달 컴포넌트
 * 태스크 클릭 시 열리는 상세 편집 화면
 * 설명/마감일 인라인 편집, 댓글 작성, 파일 첨부 기능 포함
 */
import { useState, useEffect, useRef } from "react";
import { CalendarDays, Paperclip, Trash2, Download } from "lucide-react";
import PixelAvatar from "./PixelAvatar";
import client from "../api/client";
import "./CardDetailModal.css";

interface Comment { user: string; text: string; time: string; }

interface Attachment {
  attachmentId: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  uploaderName: string;
  createdAt: string;
}

const COL_OPTIONS = ["상태 없음", "시작하지 않음", "진행 중", "보류 중", "완료"] as const;
const COL_COLOR: Record<string, string> = {
  "상태 없음": "#aaa",
  "시작하지 않음": "#888",
  "진행 중": "#4f7cff",
  "보류 중": "#f59e0b",
  "완료": "#22c55e",
};

interface Props {
  title: string;
  colName: string;
  taskId?: string;
  workspaceId?: string;
  initialDesc?: string;
  initialStartDate?: string;
  initialDueDate?: string;
  initialComments?: Comment[];
  initialQuickSignal?: string;
  assigneeId?: string;
  assigneeName?: string;
  members?: { userId: string; name: string }[];
  onSaveTitle?: (title: string) => void;
  onSaveDesc?: (desc: string) => void;
  onSaveStartDate?: (startDate: string) => void;
  onSaveDueDate?: (dueDate: string) => void;
  onSaveComments?: (comments: Comment[]) => void;
  onSendSignal?: (signal: string | null) => void;
  onStatusChange?: (newColName: string) => void;
  onChangeAssignee?: (userId: string, name: string) => void;
  onClose: () => void;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function fileIcon(fileType: string) {
  if (!fileType) return "📎";
  if (fileType.startsWith("image/")) return "🖼️";
  if (fileType === "application/pdf") return "📄";
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "📊";
  if (fileType.includes("word") || fileType.includes("wordprocessing")) return "📝";
  if (fileType.includes("hwp") || fileType.includes("hangul")) return "📋";
  if (fileType.includes("powerpoint") || fileType.includes("presentation")) return "📊";
  if (fileType.includes("zip") || fileType.includes("compressed")) return "🗜️";
  return "📎";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function CardDetailModal({ title, colName, taskId, workspaceId, initialDesc = "", initialStartDate = "", initialDueDate = "", initialComments = [], initialQuickSignal, assigneeId, assigneeName, members = [], onSaveTitle, onSaveDesc, onSaveStartDate, onSaveDueDate, onSaveComments, onSendSignal, onStatusChange, onChangeAssignee, onClose }: Props) {
  const userName  = localStorage.getItem("userName") ?? "나";
  const userId    = localStorage.getItem("userId") ?? "";
  const [cardTitle, setCardTitle] = useState(title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [currentCol, setCurrentCol] = useState(colName);
  const [statusDropOpen, setStatusDropOpen] = useState(false);
  const statusDropRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [assigneeView, setAssigneeView] = useState(false); // 담당자 변경 서브뷰
  const [currentAssigneeId, setCurrentAssigneeId] = useState(assigneeId);
  const [currentAssigneeName, setCurrentAssigneeName] = useState(assigneeName);
  const menuRef = useRef<HTMLDivElement>(null);
  const [quickSignal, setQuickSignal] = useState(initialQuickSignal ?? null);
  const [desc, setDesc]         = useState(initialDesc);
  const [editingDesc, setEditingDesc] = useState(false);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [editingStartDate, setEditingStartDate] = useState(false);
  const [dueDate, setDueDate]   = useState(initialDueDate);
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [comment, setComment]   = useState("");
  const [comments, setComments] = useState<Comment[]>(initialComments);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!statusDropOpen) return;
    const handler = (e: MouseEvent) => {
      if (statusDropRef.current && !statusDropRef.current.contains(e.target as Node)) {
        setStatusDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusDropOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setAssigneeView(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (!taskId || !workspaceId) return;
    client.get(`/workspaces/${workspaceId}/tasks/${taskId}/comments`)
      .then((res) => {
        const data = res.data.data ?? [];
        setComments(data.map((c: any) => ({ user: c.senderName, text: c.content, time: timeAgo(c.createdAt) })));
      })
      .catch((err) => console.error("댓글 조회 실패:", err));
  }, [taskId, workspaceId]);

  useEffect(() => {
    if (!taskId || !workspaceId) return;
    client.get(`/workspaces/${workspaceId}/tasks/${taskId}/attachments`)
      .then((res) => setAttachments(res.data.data ?? []))
      .catch((err) => console.error("첨부파일 조회 실패:", err));
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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !taskId || !workspaceId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        if (userId) formData.append("uploaderId", userId);
        if (userName) formData.append("uploaderName", userName);
        const res = await client.post(
          `/workspaces/${workspaceId}/tasks/${taskId}/attachments`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        setAttachments((prev) => [res.data.data, ...prev]);
      }
    } catch (err) {
      console.error("파일 업로드 실패:", err);
      alert("파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!taskId || !workspaceId) return;
    try {
      await client.delete(`/workspaces/${workspaceId}/tasks/${taskId}/attachments/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a.attachmentId !== attachmentId));
    } catch (err) {
      console.error("파일 삭제 실패:", err);
      alert("파일 삭제에 실패했습니다.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  return (
    <div className="cdm-overlay" onClick={onClose}>
      <div
        className="cdm-modal"
        style={quickSignal === "HELP_NEEDED"
          ? { border: "2px solid #f87171", boxShadow: "0 8px 40px rgba(248,113,113,0.25)" }
          : quickSignal === "FEEDBACK_NEEDED"
          ? { border: "2px solid #6ab4f8", boxShadow: "0 8px 40px rgba(106,180,248,0.25)" }
          : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cdm-header">
          {/* 상태 변경 드롭다운 */}
          <div className="cdm-status-wrap" ref={statusDropRef}>
            <button
              className="cdm-col-badge"
              style={{ borderColor: COL_COLOR[currentCol], color: COL_COLOR[currentCol] }}
              onClick={() => setStatusDropOpen((v) => !v)}
            >
              {currentCol} ▾
            </button>
            {statusDropOpen && (
              <div className="cdm-status-dropdown">
                {COL_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    className={`cdm-status-option ${opt === currentCol ? "active" : ""}`}
                    style={{ "--opt-color": COL_COLOR[opt] } as React.CSSProperties}
                    onClick={() => {
                      if (opt !== currentCol) {
                        setCurrentCol(opt);
                        onStatusChange?.(opt);
                      }
                      setStatusDropOpen(false);
                    }}
                  >
                    <span className="cdm-status-dot" style={{ background: COL_COLOR[opt] }} />
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="cdm-header-actions">
            <button className="cdm-icon-btn">⤢</button>
            {/* 점 세 개 메뉴 */}
            <div className="cdm-menu-wrap" ref={menuRef}>
              <button
                className="cdm-icon-btn"
                onClick={() => { setMenuOpen((v) => !v); setAssigneeView(false); }}
              >···</button>
              {menuOpen && (
                <div className="cdm-menu-dropdown">
                  {!assigneeView ? (
                    <>
                      <button
                        className={`cdm-menu-item ${quickSignal === "HELP_NEEDED" ? "cdm-menu-item--active" : ""}`}
                        onClick={() => {
                          const next = quickSignal === "HELP_NEEDED" ? null : "HELP_NEEDED";
                          setQuickSignal(next);
                          onSendSignal?.(next);
                        }}
                      >
                        <span className={`cdm-menu-dot ${quickSignal === "HELP_NEEDED" ? "active-help" : ""}`} />
                        도움 요청
                        {quickSignal === "HELP_NEEDED" && <span className="cdm-menu-check">✓</span>}
                      </button>
                      <button
                        className={`cdm-menu-item ${quickSignal === "FEEDBACK_NEEDED" ? "cdm-menu-item--active" : ""}`}
                        onClick={() => {
                          const next = quickSignal === "FEEDBACK_NEEDED" ? null : "FEEDBACK_NEEDED";
                          setQuickSignal(next);
                          onSendSignal?.(next);
                        }}
                      >
                        <span className={`cdm-menu-dot ${quickSignal === "FEEDBACK_NEEDED" ? "active-feedback" : ""}`} />
                        피드백 요청
                        {quickSignal === "FEEDBACK_NEEDED" && <span className="cdm-menu-check">✓</span>}
                      </button>
                      <div className="cdm-menu-divider" />
                      <button
                        className="cdm-menu-item"
                        onClick={() => setAssigneeView(true)}
                      >
                        담당자 변경
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="cdm-menu-back" onClick={() => setAssigneeView(false)}>
                        ← 담당자 변경
                      </button>
                      <div className="cdm-menu-divider" />
                      {members.length === 0 && (
                        <div className="cdm-menu-empty">멤버 없음</div>
                      )}
                      {members.map((m) => (
                        <button
                          key={m.userId}
                          className={`cdm-menu-item ${m.userId === currentAssigneeId ? "cdm-menu-item--active" : ""}`}
                          onClick={() => {
                            setCurrentAssigneeId(m.userId);
                            setCurrentAssigneeName(m.name);
                            onChangeAssignee?.(m.userId, m.name);
                            setMenuOpen(false);
                            setAssigneeView(false);
                          }}
                        >
                          <PixelAvatar userId={m.userId} name={m.name} size="sm" />
                          {m.name}
                          {m.userId === currentAssigneeId && <span className="cdm-menu-check">✓</span>}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            <button className="cdm-icon-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="cdm-body">
          <div className="cdm-left">
            <div className="cdm-title-row">
              <span className="cdm-title-icon" style={{ color: COL_COLOR[currentCol] ?? "#aaa" }}>●</span>
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
              <div className="cdm-section-title">
                <CalendarDays size={15} />
                시작일
                {!editingStartDate && <button className="cdm-edit-btn" onClick={() => setEditingStartDate(true)}>수정</button>}
              </div>
              {editingStartDate ? (
                <div className="cdm-desc-editor">
                  <input
                    type="date"
                    className="cdm-desc-textarea"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <div className="cdm-desc-actions">
                    <button className="cdm-save-btn" onClick={() => { onSaveStartDate?.(startDate); setEditingStartDate(false); }}>저장</button>
                    <button className="cdm-cancel-btn" onClick={() => setEditingStartDate(false)}>취소</button>
                  </div>
                </div>
              ) : (
                <div className="cdm-desc-placeholder" onClick={() => setEditingStartDate(true)}>
                  {startDate || "시작일을 설정하세요..."}
                </div>
              )}
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

            {/* 파일 첨부 섹션 */}
            <div className="cdm-section">
              <div className="cdm-section-title">
                <Paperclip size={15} />
                첨부파일
                {taskId && workspaceId && (
                  <>
                    <button
                      className="cdm-edit-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? "업로드 중..." : "+ 파일 추가"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.hwp,.ppt,.pptx,.txt,.zip,.rar,.csv"
                      style={{ display: "none" }}
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                  </>
                )}
              </div>

              <div
                className={`cdm-dropzone ${dragging ? "cdm-dropzone--over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                {attachments.length === 0 && !uploading ? (
                  <span className="cdm-dropzone-hint">파일을 여기에 드래그하거나 위 버튼을 클릭하세요</span>
                ) : null}

                {uploading && (
                  <div className="cdm-attach-uploading">
                    <span className="cdm-attach-spinner" />
                    업로드 중...
                  </div>
                )}

                <div className="cdm-attach-list">
                  {attachments.map((a) => (
                    <div key={a.attachmentId} className="cdm-attach-item">
                      {a.fileType?.startsWith("image/") ? (
                        <img
                          className="cdm-attach-thumb"
                          src={`/api/workspaces/${workspaceId}/tasks/${taskId}/attachments/${a.attachmentId}/download`}
                          alt={a.originalName}
                        />
                      ) : (
                        <span className="cdm-attach-icon">{fileIcon(a.fileType)}</span>
                      )}
                      <div className="cdm-attach-info">
                        <span className="cdm-attach-name" title={a.originalName}>{a.originalName}</span>
                        <span className="cdm-attach-meta">{formatSize(a.fileSize)} · {a.uploaderName}</span>
                      </div>
                      <div className="cdm-attach-actions">
                        <a
                          href={`/api/workspaces/${workspaceId}/tasks/${taskId}/attachments/${a.attachmentId}/download`}
                          download={a.originalName}
                          className="cdm-attach-btn-icon"
                          title="다운로드"
                        >
                          <Download size={14} />
                        </a>
                        <button
                          className="cdm-attach-btn-icon cdm-attach-btn-delete"
                          onClick={() => handleDeleteAttachment(a.attachmentId)}
                          title="삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="cdm-right">
            {/* 담당자 */}
            <div className="cdm-section">
              <div className="cdm-section-title">담당자</div>
              {currentAssigneeName ? (
                <div className="cdm-assignee">
                  <PixelAvatar userId={currentAssigneeId} name={currentAssigneeName} size="sm" />
                  <span className="cdm-assignee-name">{currentAssigneeName}</span>
                </div>
              ) : (
                <span className="cdm-assignee-empty">담당자 없음</span>
              )}
            </div>

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
                  <PixelAvatar name={c.user} size="sm" className="cdm-pixel-avatar" />
                  <div className="cdm-activity-content">
                    <span className="cdm-activity-user">{c.user}</span>
                    <span className="cdm-activity-text">{c.text}</span>
                    <span className="cdm-activity-time">{c.time}</span>
                  </div>
                </div>
              ))}
              <div className="cdm-activity-item">
                <PixelAvatar userId={userId} name={userName} size="sm" className="cdm-pixel-avatar" />
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
