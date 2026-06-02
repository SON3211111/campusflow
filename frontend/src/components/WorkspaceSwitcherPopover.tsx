import { LayoutGrid, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withStoredGradient, withStoredGradients } from "../utils/workspaceTheme";
import "./WorkspaceSwitcherPopover.css";

interface Workspace {
  id: string;
  name: string;
  gradient: string;
}

interface Props {
  visible: boolean;
  workspace?: Workspace;
  workspaces?: Workspace[];
  onClose: () => void;
}

export default function WorkspaceSwitcherPopover({ visible, workspace, workspaces = [], onClose }: Props) {
  const navigate = useNavigate();
  const currentWorkspace = workspace ? withStoredGradient(workspace) : undefined;
  const items = workspaces.length > 0 ? withStoredGradients(workspaces) : currentWorkspace ? [currentWorkspace] : [];

  if (!visible) return null;

  return (
    <div className="wsp-workspace-overlay" onClick={onClose}>
      <aside className="wsp-workspace-panel" onClick={(e) => e.stopPropagation()}>
        <div className="wsp-workspace-panel-header">
          <div>
            <p className="wsp-workspace-panel-eyebrow">MY WORKSPACE</p>
            <h2>워크스페이스 전환</h2>
          </div>
          <button className="wsp-workspace-panel-close" onClick={onClose} aria-label="워크스페이스 팝오버 닫기">
            <X size={17} />
          </button>
        </div>
        <p className="wsp-workspace-panel-desc">이동할 보드를 선택하세요.</p>
        <div className="wsp-workspace-panel-list">
          {items.length > 0 ? items.map((ws) => (
            <button
              key={ws.id}
              className={`wsp-workspace-switch-card ${currentWorkspace?.id === ws.id ? "active" : ""}`}
              onClick={() => {
                localStorage.setItem("clickedWorkspace", JSON.stringify(ws));
                onClose();
                navigate("/workspace-board", { state: { workspace: ws, workspaces: items } });
              }}
            >
              <span className="wsp-workspace-switch-thumb" style={{ background: ws.gradient }} />
              <span className="wsp-workspace-switch-info">
                <strong>{ws.name}</strong>
                <small>{currentWorkspace?.id === ws.id ? "현재 보드" : "보드 열기"}</small>
              </span>
              <LayoutGrid size={16} />
            </button>
          )) : (
            <div className="wsp-workspace-panel-empty">표시할 워크스페이스가 없습니다.</div>
          )}
        </div>
        <button className="wsp-workspace-panel-all" onClick={() => navigate("/workspace")}>
          전체 워크스페이스 관리
        </button>
      </aside>
    </div>
  );
}
