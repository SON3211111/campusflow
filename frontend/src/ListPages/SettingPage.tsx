import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Globe2, Home, LayoutDashboard, LockKeyhole, Palette, Save, Settings, Trash2, UsersRound } from "lucide-react";
import Header from "../components/Header";
import JoinModal from "../components/JoinModal";
import client from "../api/client";
import "./WorkspaceList.css";
import "./SettingPage.css";

interface Workspace {
  id: string;
  name: string;
  gradient: string;
  starred?: boolean;
}

export default function SettingPage() {
  const { state } = useLocation() as {
    state: { workspace: Workspace; teamWorkspaces: Workspace[]; personalWorkspaces: Workspace[] };
  };
  const navigate = useNavigate();

  const savedWs = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
  const workspace  = state?.workspace ?? savedWs ?? { id: "", name: "워크스페이스", gradient: "#ccc" };
  const teamWs     = (state as any)?.teamWorkspaces ?? (state as any)?.workspaces ?? [];
  const personalWs = (state as any)?.personalWorkspaces ?? [];
  const allWorkspaces = [...teamWs, ...personalWs];

  const savedVisibility = (localStorage.getItem(`visibility_${workspace.id}`) ?? "private") as "private" | "public";

  const [expandedId, setExpandedId]     = useState<string>(workspace.id);
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

  const toggleSidebar = (id: string) =>
    setExpandedId((prev) => (prev === id ? "" : id));

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
      await client.delete(`/workspaces/${workspace.id}?userId=${localStorage.getItem('userId') ?? ''}`);
      navigate("/workspace");
    } catch (err: any) {
      if (err.response?.status === 403) {
        alert("삭제가 불가능합니다.");
      } else {
        alert("삭제에 실패했습니다.");
      }
    }
  };

  const renderSidebarItems = (list: Workspace[], section: string) =>
    list.map((ws) => (
      <div key={`${section}-${ws.id}`}>
        <div className="sidebar-item" onClick={() => toggleSidebar(ws.id)}>
          <div className="sidebar-item-icon" style={{ background: ws.gradient }}>
            {ws.name[0]}
          </div>
          <span className="sidebar-item-name">{ws.id === workspace.id ? wsName : ws.name}</span>
          <span className={`sidebar-arrow ${expandedId === ws.id ? "open" : ""}`}>▾</span>
        </div>
        <div className={`sidebar-submenu ${expandedId === ws.id ? "open" : ""}`}>
          <div className="sidebar-subitem" onClick={() => navigate("/workspace-board", { state: { workspace: ws, workspaces: allWorkspaces } })}>
            <LayoutDashboard className="subitem-icon" size={14} /> Board
          </div>
          <div className="sidebar-subitem" onClick={() => navigate("/members", { state: navState(ws) })}>
            <UsersRound className="subitem-icon" size={14} /> Members
          </div>
          <div className={`sidebar-subitem ${ws.id === workspace.id ? "active-subitem" : ""}`}
            onClick={() => navigate("/settings", { state: navState(ws) })}>
            <Settings className="subitem-icon" size={14} /> Setting
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
            {renderSidebarItems(teamWs, 'team')}
          </div>

          <hr className="sidebar-divider" />

          <div className="sidebar-section">
            <p className="sidebar-label">개인 워크스페이스</p>
            {renderSidebarItems(personalWs, 'personal')}
          </div>

          <div className="sidebar-bottom">
            <hr className="sidebar-divider" />
            <div className="sidebar-nav-item" onClick={() => navigate("/workspace")}>
              <Home size={15} />
              <span>Home</span>
            </div>
            <div className="sidebar-nav-item active">
              <Settings className="nav-icon" size={15} />
              <span>Setting</span>
            </div>
            <button className="join-btn" onClick={() => setJoinOpen(true)}>워크스페이스 참여 !</button>
          </div>
        </aside>

        <main className="setting-main">
          <section className="setting-hero-panel">
            <div>
              <p className="setting-hero-eyebrow">WORKSPACE SETTINGS</p>
              <h1>{wsName}</h1>
              <p>워크스페이스 이름, 공개 범위, 테마와 삭제 위험 설정을 관리합니다.</p>
            </div>
            <button className="setting-save-top-btn" onClick={handleSaveAll} disabled={saving}>
              <Save size={16} />
              {saving ? "저장 중.." : "저장"}
            </button>
          </section>

          <div className="setting-summary-grid">
            <div className="setting-summary-card">
              <Palette size={19} />
              <strong>테마</strong>
              <span>배경 템플릿 변경 가능</span>
            </div>
            <div className="setting-summary-card">
              <LockKeyhole size={19} />
              <strong>{savedVis === "private" ? "Private" : "Public"}</strong>
              <span>현재 공개 범위</span>
            </div>
            <div className="setting-summary-card danger">
              <Trash2 size={19} />
              <strong>주의</strong>
              <span>삭제 후 복구 불가</span>
            </div>
          </div>
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
                {savedVis === "private" ? (
                  <>
                    <LockKeyhole size={13} />
                    <span>private</span>
                  </>
                ) : (
                  <>
                    <Globe2 size={13} />
                    <span>public</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <hr className="setting-divider" />

          {/* 테마/배경 변경 */}
          <section className="setting-section">
            <h3 className="setting-section-title">배경 테마</h3>
            <p className="setting-desc">워크스페이스 배경 색상을 변경합니다.</p>
            <button
              className="setting-template-btn"
              onClick={() => navigate("/templates", {
                state: {
                  workspace: { id: workspace.id, name: wsName, gradient: workspace.gradient },
                  teamWorkspaces: teamWs,
                  personalWorkspaces: personalWs,
                }
              })}
            >
              <Palette size={15} />
              템플릿 선택
            </button>
          </section>

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
                <LockKeyhole size={14} />
                Private
              </button>
              <button
                className={`vis-btn ${visibility === "public" ? "active" : ""}`}
                onClick={() => setVisibility("public")}
              >
                <Globe2 size={14} />
                Public
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
