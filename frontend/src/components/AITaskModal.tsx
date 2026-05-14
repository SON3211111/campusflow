import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AITaskModal.css";

type Screen = "home" | "prompt" | "existing";

interface SavedItem { id: string; title: string; prompt: string; result: any; }

interface WsItem { id: string; name: string; gradient: string; }

interface Props {
  onClose: () => void;
  workspaces?: WsItem[];
  workspace?: WsItem;
}

function ExistingList({ workspaces, workspace, onClose }: { workspaces: Props["workspaces"]; workspace: Props["workspace"]; onClose: () => void }) {
  const navigate = useNavigate();
  const [list, setList] = useState<SavedItem[]>(
    JSON.parse(localStorage.getItem("saved_ai_tasks") ?? "[]")
  );

  const handleDelete = (id: string) => {
    const updated = list.filter((item) => item.id !== id);
    localStorage.setItem("saved_ai_tasks", JSON.stringify(updated));
    setList(updated);
  };

  return (
    <>
      {list.length === 0 ? (
        <div className="ai-empty">기존 task가 없습니다</div>
      ) : (
        <div className="ai-existing-list">
          {list.map((item) => (
            <div key={item.id} className="ai-existing-item">
              <span className="ai-existing-icon">⊛</span>
              <span
                className="ai-existing-title"
                onClick={() => {
                  onClose();
                  navigate("/ai-task", { state: { workspaces, workspace, result: item.result, prompt: item.prompt } });
                }}
              >
                {item.title}
              </span>
              <button className="ai-existing-delete" onClick={() => handleDelete(item.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function AITaskModal({ onClose, workspaces = [], workspace }: Props) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("home");
  const [prompt, setPrompt] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ai-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="ai-modal-close" onClick={onClose}>✕</button>

        {screen === "home" && (
          <>
            <h3 className="ai-modal-title">새 AI Task 생성</h3>
            <div className="ai-modal-options">
              <div className="ai-option-card" onClick={() => setScreen("prompt")}>
                <div className="ai-option-icon blue">📄</div>
                <div className="ai-option-info">
                  <span className="ai-option-name">새 프롬프트 작성</span>
                  <span className="ai-option-desc">새 프롬프트를 작성하여 작업을 생성합니다</span>
                </div>
              </div>
              <div className="ai-option-card" onClick={() => setScreen("existing")}>
                <div className="ai-option-icon green">📂</div>
                <div className="ai-option-info">
                  <span className="ai-option-name">기존 Task 가져오기</span>
                  <span className="ai-option-desc">기존 작업을 가져오기</span>
                </div>
              </div>
              <div className="ai-option-card" onClick={() => {
                onClose();
                navigate("/workspace-board", { state: { workspace: workspace ?? workspaces[0], workspaces } });
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

        {screen === "existing" && (
          <>
            <h3 className="ai-modal-title">기존 Task 가져오기</h3>
            <ExistingList workspaces={workspaces} workspace={workspace} onClose={onClose} />
            <button className="ai-modal-back" onClick={() => setScreen("home")}>← 뒤로</button>
          </>
        )}
      </div>
    </div>
  );
}
