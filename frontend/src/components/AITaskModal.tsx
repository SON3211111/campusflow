/**
 * AI Task 모달 컴포넌트
 * - 새 프롬프트 작성: 새 세션 시작
 * - 진행 중인 업무 이어하기: 기존 세션 복원
 * - 큰 작업 추가: 기존 세션에 새 분해 결과를 누적
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, FileText, Plus, Rocket, Sparkles } from "lucide-react";
import { setAppendBuffer } from "../store/aiTaskBuffer";
import "./AITaskModal.css";

type Screen = "home" | "new-prompt" | "append-prompt";

interface WsItem { id: string; name: string; gradient: string; }

interface Props {
  onClose: () => void;
  workspaces?: WsItem[];
  workspace?: WsItem;
}

export default function AITaskModal({ onClose, workspaces = [], workspace }: Props) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("home");
  const [prompt, setPrompt] = useState("");

  const activeWs = workspace ?? workspaces[0];
  const sessionKey = `ai_task_session_${activeWs?.id ?? "default"}`;
  const hasSession = !!localStorage.getItem(sessionKey);

  const handleNewBreakdown = () => {
    if (!prompt.trim()) return;
    onClose();
    navigate("/task-breakdown", { state: { prompt: prompt.trim(), workspaces, workspace: activeWs } });
  };

  const handleAppendBreakdown = () => {
    if (!prompt.trim()) return;
    // 기존 세션을 buffer에 저장 (이 시점에 localStorage가 최신 상태)
    try {
      const saved = JSON.parse(localStorage.getItem(sessionKey) ?? "null");
      if (saved) {
        setAppendBuffer({
          categories: saved.categories ?? [],
          tasks: saved.tasks ?? [],
          memberBaskets: saved.memberBaskets ?? {},
          sessions: saved.sessions ?? [],
          newSessionPrompt: prompt.trim(),
        });
      }
    } catch {}
    onClose();
    navigate("/task-breakdown", { state: { prompt: prompt.trim(), workspaces, workspace: activeWs, append: true } });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ai-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="ai-modal-close" onClick={onClose}>✕</button>

        {screen === "home" && (
          <>
            <h3 className="ai-modal-title">AI 업무 분해</h3>
            <div className="ai-modal-options">
              {hasSession && (
                <div className="ai-option-card" onClick={() => {
                  onClose();
                  navigate("/ai-task", { state: { workspace: activeWs, workspaces } });
                }}>
                  <div className="ai-option-icon purple">▶</div>
                  <div className="ai-option-info">
                    <span className="ai-option-name">진행 중인 업무 이어하기</span>
                    <span className="ai-option-desc">기존 Pool에서 계속 작업합니다</span>
                  </div>
                </div>
              )}

              {hasSession && (
                <div className="ai-option-card" onClick={() => setScreen("append-prompt")}>
                  <div className="ai-option-icon green"><Plus size={20} /></div>
                  <div className="ai-option-info">
                    <span className="ai-option-name">작업 추가하기</span>
                    <span className="ai-option-desc">새 업무를 분해해서 기존 Pool에 추가합니다</span>
                  </div>
                </div>
              )}

              <div className="ai-option-card" onClick={() => setScreen("new-prompt")}>
                <div className="ai-option-icon blue"><FileText size={20} /></div>
                <div className="ai-option-info">
                  <span className="ai-option-name">새로 시작</span>
                  <span className="ai-option-desc">새 프롬프트로 처음부터 분해합니다</span>
                </div>
              </div>

              <div className="ai-option-card" onClick={() => {
                onClose();
                navigate("/workspace-board", { state: { workspace: activeWs, workspaces } });
              }}>
                <div className="ai-option-icon orange"><Rocket size={20} /></div>
                <div className="ai-option-info">
                  <span className="ai-option-name">보드로 이동</span>
                  <span className="ai-option-desc">워크스페이스 보드로 바로 이동합니다</span>
                </div>
              </div>
            </div>
          </>
        )}

        {screen === "new-prompt" && (
          <>
            <h3 className="ai-modal-title">새로 시작</h3>
            <label className="ai-prompt-label">업무 내용을 입력하세요</label>
            <textarea
              className="ai-prompt-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: 쇼핑몰 웹사이트 제작하기"
              autoFocus
            />
            <button className="ai-generate-btn" disabled={!prompt.trim()} onClick={handleNewBreakdown}>
              <Bot size={17} />
              AI로 업무 분해하기
            </button>
            <button className="ai-modal-back" onClick={() => setScreen("home")}>← 뒤로</button>
          </>
        )}

        {screen === "append-prompt" && (
          <>
            <h3 className="ai-modal-title">작업 추가하기</h3>
            <label className="ai-prompt-label">추가할 업무 내용을 입력하세요</label>
            <textarea
              className="ai-prompt-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: 협업툴 웹사이트 제작하기"
              autoFocus
            />
            <button className="ai-generate-btn" disabled={!prompt.trim()} onClick={handleAppendBreakdown}>
              <Sparkles size={17} />
              기존 Pool에 추가 분해하기
            </button>
            <button className="ai-modal-back" onClick={() => setScreen("home")}>← 뒤로</button>
          </>
        )}
      </div>
    </div>
  );
}
