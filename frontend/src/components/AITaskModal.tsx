/**
 * AI Task 모달 컴포넌트
 * 3가지 화면 전환: home(선택) → prompt(새 프롬프트 입력) / existing(저장된 결과 불러오기)
 * 프롬프트 입력 후 TaskBreakdownPage로 이동하여 AI 분석 시작
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AITaskModal.css";

type Screen = "home" | "prompt";


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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ai-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="ai-modal-close" onClick={onClose}>✕</button>

        {screen === "home" && (
          <>
            <h3 className="ai-modal-title">새 AI Task 생성</h3>
            <div className="ai-modal-options">
              {hasSession && (
                <div className="ai-option-card" onClick={() => {
                  onClose();
                  navigate("/ai-task", { state: { workspace: activeWs, workspaces } });
                }}>
                  <div className="ai-option-icon purple">▶</div>
                  <div className="ai-option-info">
                    <span className="ai-option-name">진행 중인 업무 이어하기</span>
                    <span className="ai-option-desc">마지막 업무 분해 세션을 이어서 진행합니다</span>
                  </div>
                </div>
              )}
              <div className="ai-option-card" onClick={() => setScreen("prompt")}>
                <div className="ai-option-icon blue">📄</div>
                <div className="ai-option-info">
                  <span className="ai-option-name">새 프롬프트 작성</span>
                  <span className="ai-option-desc">새 프롬프트를 작성하여 작업을 생성합니다</span>
                </div>
              </div>

              <div className="ai-option-card" onClick={() => {
                onClose();
                navigate("/workspace-board", { state: { workspace: activeWs, workspaces } });
              }}>
                <div className="ai-option-icon orange">🚀</div>
                <div className="ai-option-info">
                  <span className="ai-option-name">바로 워크스페이스로 이동</span>
                  <span className="ai-option-desc">워크스페이스 보드로 바로 이동합니다</span>
                </div>
              </div>
            </div>
          </>
        )}

        {screen === "prompt" && (
          <>
            <h3 className="ai-modal-title">프롬프트 작성</h3>
            <label className="ai-prompt-label">과제 내용</label>
            <textarea
              className="ai-prompt-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              className="ai-generate-btn"
              disabled={!prompt.trim()}
              onClick={() => {
                onClose();
                navigate("/task-breakdown", { state: { prompt, workspaces, workspace } });
              }}
            >
              🤖 AI로 업무 분해하기
            </button>
            <button className="ai-modal-back" onClick={() => setScreen("home")}>← 뒤로</button>
          </>
        )}

      </div>
    </div>
  );
}
