import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import JoinModal from "../components/JoinModal";
import client from "../api/client";
import "./WorkspaceList.css";
import "./SettingPage.css";

interface Workspace {
  id: number;
  name: string;
  gradient: string;
  starred?: boolean;
}

export default function SettingPage() {
  const { state } = useLocation() as {
    state: { workspace: Workspace; teamWorkspaces: Workspace[]; personalWorkspaces: Workspace[] };
  };
  const navigate = useNavigate();

  const workspace  = state?.workspace         ?? { id: 0, name: "워크스페이스", gradient: "#ccc" };
  const teamWs     = state?.teamWorkspaces     ?? [];
  const personalWs = state?.personalWorkspaces ?? [];
  const allWorkspaces = [...teamWs, ...personalWs];

  const savedVisibility = (localStorage.getItem(`visibility_${workspace.id}`) ?? "private") as "private" | "public";

  const [expandedId, setExpandedId]     = useState<number>(workspace.id);
  const [wsName, setWsName]             = useState(workspace.name);
  const [nameInput, setNameInput]       = useState(workspace.name);
  const [visibility, setVisibility]     = useState<"private" | "public">(savedVisibility);
  const [savedVis, setSavedVis]         = useState<"private" | "public">(savedVisibility);
  const [saving, setSaving]             = useState(false);
  const [joinOpen, setJoinOpen]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const navState = (ws: Workspace) => ({
    workspace: ws,
    teamWorkspaces: teamWs,
    personalWorkspaces: personalWs,
  });

  const toggleSidebar = (id: number) =>
    setExpandedId((prev) => (prev === id ? -1 : id));

const handleSaveAll = async () => {
    setSaving(true);
    try {
      const trimmed = nameInput.trim();
      if (trimmed && trimmed !== wsName) {
        await client.patch(`/workspaces/${workspace.id}`, { name: trimmed });
        setWsName(trimmed);
      }
      localStorage.setItem(`visibility_${workspace.id}`, visibility);
      setSavedVis(visibility);
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await client.delete(`/workspaces/${workspace.id}`);
      navigate("/workspace");
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  const renderSidebarItems = (list: Workspace[]) =>
    list.map((ws) => (
      <div key={ws.id}>
        <div className="sidebar-item" onClick={() => toggleSidebar(ws.id)}>
          <div className="sidebar-item-icon" style={{ background: ws.gradient }}>
            {ws.name[0]}
          </div>
          <span className="sidebar-item-name">{ws.id === workspace.id ? wsName : ws.name}</span>
          <span className={`sidebar-arrow ${expandedId === ws.id ? "open" : ""}`}>▾</span>
        </div>
        <div className={`sidebar-submenu ${expandedId === ws.id ? "open" : ""}`}>
          <div className="sidebar-subitem" onClick={() => navigate("/board", { state: navState(ws) })}>
            <span className="subitem-icon">□</span> Board
          </div>
          <div className="sidebar-subitem" onClick={() => navigate("/members", { state: navState(ws) })}>
            <span className="subitem-icon">👥</span> Members
          </div>
          <div className={`sidebar-subitem ${ws.id === workspace.id ? "active-subitem" : ""}`}
            onClick={() => navigate("/settings", { state: navState(ws) })}>
            <span className="subitem-icon">⚙</span> Setting
          </div>
        </div>
      </div>
    ));

  return (
    <div className="workspace-page">
      <Header workspaces={allWorkspaces} />

      <div className="workspace-body">
        <aside className="sidebar">
          <div className="sidebar-menu-icon">≡</div>

          <div className="sidebar-section">
            <p className="sidebar-label">팀 워크스페이스</p>
            {renderSidebarItems(teamWs)}
          </div>

          <hr className="sidebar-divider" />

          <div className="sidebar-section">
            <p className="sidebar-label">개인 워크스페이스</p>
            {renderSidebarItems(personalWs)}
          </div>

          <div className="sidebar-bottom">
            <hr className="sidebar-divider" />
            <div className="sidebar-nav-item" onClick={() => navigate("/workspace")}>
              <span className="nav-icon">🏠</span>
              <span>Home</span>
            </div>
            <div className="sidebar-nav-item active">
              <span className="nav-icon">⚙</span>
              <span>Setting</span>
            </div>
            <button className="join-btn" onClick={() => setJoinOpen(true)}>워크스페이스 참여 !</button>
          </div>
        </aside>

        <main className="setting-main">
          <div className="setting-action-bar">
            <button className="setting-save-top-btn" onClick={handleSaveAll} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>

          <div className="setting-ws-header">
            <div className="setting-ws-icon" style={{ background: workspace.gradient }} />
            <div>
              <div className="setting-ws-name">{wsName}</div>
              <div className="setting-ws-private">
                {savedVis === "private" ? "🔒 private" : "🌐 public"}
              </div>
            </div>
          </div>

          <hr className="setting-divider" />

          {/* 이름 변경 */}
          <section className="setting-section">
            <h3 className="setting-section-title">워크스페이스 이름</h3>
            <div className="setting-row">
              <input
                className="setting-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
            </div>
          </section>

          <hr className="setting-divider" />

          {/* 공개 범위 */}
          <section className="setting-section">
            <h3 className="setting-section-title">공개 범위</h3>
            <div className="setting-visibility">
              <button
                className={`vis-btn ${visibility === "private" ? "active" : ""}`}
                onClick={() => setVisibility("private")}
              >
                🔒 Private
              </button>
              <button
                className={`vis-btn ${visibility === "public" ? "active" : ""}`}
                onClick={() => setVisibility("public")}
              >
                🌐 Public
              </button>
            </div>
            <p className="setting-desc">
              {visibility === "private"
                ? "초대된 멤버만 이 워크스페이스에 접근할 수 있습니다."
                : "누구든지 이 워크스페이스를 볼 수 있습니다."}
            </p>
          </section>

          <hr className="setting-divider" />

          {/* 삭제 */}
          <section className="setting-section danger-zone">
            <h3 className="setting-section-title danger">워크스페이스 삭제</h3>
            <p className="setting-desc">삭제된 워크스페이스는 복구할 수 없습니다.</p>
            <button className="setting-delete-btn" onClick={() => setConfirmDelete(true)}>
              워크스페이스 삭제
            </button>
          </section>
        </main>
      </div>

      {joinOpen && <JoinModal onClose={() => setJoinOpen(false)} />}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <p className="modal-title">워크스페이스 삭제</p>
            <p className="modal-desc">
              <strong>{wsName}</strong>을(를) 삭제하시겠습니까?<br />
              삭제된 워크스페이스는 복구할 수 없습니다.
            </p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setConfirmDelete(false)}>취소</button>
              <button className="modal-btn confirm" onClick={handleDelete}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
