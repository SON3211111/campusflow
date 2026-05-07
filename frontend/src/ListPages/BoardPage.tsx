import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import WorkspaceCard from "../components/WorkspaceCard";
import "./WorkspaceList.css";
import "./BoardPage.css";

interface Workspace {
  id: number;
  name: string;
  gradient: string;
  starred?: boolean;
}

const templates = [
  { id: 1, name: "초원",           bg: "linear-gradient(180deg,#87ceeb 20%,#90ee90 65%,#228b22 100%)" },
  { id: 2, name: "밤 하늘",        bg: "linear-gradient(180deg,#0d0d2b 0%,#1a1a4e 60%,#0f0c29 100%)" },
  { id: 3, name: "예쁘다",         bg: "linear-gradient(180deg,#1a1a3e 0%,#6b21a8 45%,#1e40af 100%)" },
  { id: 4, name: "핑크 그라데이션", bg: "linear-gradient(135deg,#f0abfc 0%,#c084fc 50%,#a78bfa 100%)" },
];

export default function BoardPage() {
  const { state } = useLocation() as {
    state: { workspace: Workspace; teamWorkspaces: Workspace[]; personalWorkspaces: Workspace[] };
  };
  const navigate = useNavigate();

  const workspace  = state?.workspace          ?? { id: 0, name: "워크스페이스", gradient: "#ccc" };
  const teamWs     = state?.teamWorkspaces      ?? [];
  const personalWs = state?.personalWorkspaces  ?? [];
  const allWorkspaces = [...teamWs, ...personalWs];

  const [wsName, setWsName]       = useState(workspace.name);
  const [wsBg, setWsBg]           = useState(workspace.gradient);
  const [selectedTpl, setSelectedTpl] = useState<number | null>(null);
  const [editing, setEditing]     = useState(false);
  const [editValue, setEditValue] = useState(workspace.name);
  const [expandedId, setExpandedId] = useState<number>(workspace.id);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEdit = () => {
    setEditValue(wsName);
    setEditing(true);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed) setWsName(trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false);
  };

  const handleSelectTemplate = (tpl: typeof templates[0]) => {
    setSelectedTpl(tpl.id);
    setWsBg(tpl.bg);
  };

  const toggleSidebar = (id: number) =>
    setExpandedId((prev) => (prev === id ? -1 : id));

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
          <div
            className={`sidebar-subitem ${ws.id === workspace.id ? "active-subitem" : ""}`}
            onClick={() => navigate("/board", { state: { workspace: ws, teamWorkspaces: teamWs, personalWorkspaces: personalWs } })}
          >
            <span className="subitem-icon">□</span> Board
          </div>
          <div className="sidebar-subitem"><span className="subitem-icon">👥</span> Members</div>
          <div className="sidebar-subitem"><span className="subitem-icon">⚙</span> Setting</div>
        </div>
      </div>
    ));

  return (
    <div className="workspace-page">
      <Header workspaces={allWorkspaces} />

      <div className="workspace-body">
        {/* 사이드바 */}
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
            <div className="sidebar-nav-item" onClick={() => {
              const updatedTeam = teamWs.map(ws => ws.id === workspace.id ? { ...ws, name: wsName, gradient: wsBg } : ws);
              const updatedPersonal = personalWs.map(ws => ws.id === workspace.id ? { ...ws, name: wsName, gradient: wsBg } : ws);
              navigate("/workspace", { state: { teamWorkspaces: updatedTeam, personalWorkspaces: updatedPersonal } });
            }}>
              <span className="nav-icon">🏠</span>
              <span>Home</span>
            </div>
            <div className="sidebar-nav-item active">
              <span className="nav-icon">🖥</span>
              <span>Board</span>
            </div>
            <button className="join-btn">워크스페이스 참여 !</button>
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="board-main">
          {/* 워크스페이스 헤더 */}
          <div className="board-ws-header">
            <div className="board-ws-icon" style={{ background: wsBg }}>
              <div className="board-ws-icon-inner" />
            </div>
            <div className="board-ws-info">
              <div className="board-ws-name-row">
                {editing ? (
                  <input
                    ref={inputRef}
                    className="board-ws-name-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={handleKeyDown}
                  />
                ) : (
                  <span className="board-ws-name">{wsName}</span>
                )}
                <span className="board-ws-edit" onClick={startEdit}>✏️</span>
              </div>
              <div className="board-ws-private">
                <span>🔒</span>
                <span>private</span>
              </div>
            </div>
          </div>

          <hr className="board-divider" />

          {/* 템플릿 섹션 */}
          <div className="board-section">
            <h3 className="board-section-title">기존 화면 템플릿 변경</h3>
            <p className="board-section-sub">인기 템플릿</p>
            <div className="template-grid">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className={`template-card ${selectedTpl === t.id ? "selected" : ""}`}
                  onClick={() => handleSelectTemplate(t)}
                >
                  <div className="template-thumb" style={{ background: t.bg }} />
                  <span className="template-name">{t.name}</span>
                </div>
              ))}
            </div>
            <p className="template-more">전체 템플릿으로 찾아보기</p>
          </div>

          <hr className="board-divider" />

          {/* 워크스페이스 카드 섹션 */}
          <div className="board-section">
            <h3 className="board-section-title">Work Space</h3>
            <div className="card-grid">
              {teamWs.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  name={ws.id === workspace.id ? wsName : ws.name}
                  gradient={ws.id === workspace.id ? wsBg : ws.gradient}
                  starred={ws.starred}
                />
              ))}
              {personalWs.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  name={ws.id === workspace.id ? wsName : ws.name}
                  gradient={ws.id === workspace.id ? wsBg : ws.gradient}
                  starred={ws.starred}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
