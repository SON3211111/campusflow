import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import JoinModal from "../components/JoinModal";
import "./WorkspaceList.css";
import "./MemberPage.css";

interface Workspace {
  id: string;
  name: string;
  gradient: string;
  starred?: boolean;
}

export default function MemberPage() {
  const { state } = useLocation() as {
    state: { workspace: Workspace; teamWorkspaces: Workspace[]; personalWorkspaces: Workspace[] };
  };
  const navigate = useNavigate();

  const workspace  = state?.workspace         ?? { id: "", name: "워크스페이스", gradient: "#ccc" };
  const teamWs     = state?.teamWorkspaces     ?? [];
  const personalWs = state?.personalWorkspaces ?? [];
  const allWorkspaces = [...teamWs, ...personalWs];

  const userName = localStorage.getItem("userName") ?? "사용자";
  const userId   = localStorage.getItem("userId")   ?? "-";

  const [expandedId, setExpandedId]     = useState<string>(workspace.id);
  const [search, setSearch]             = useState("");
  const [copied, setCopied]             = useState(false);
  const [roleDropOpen, setRoleDropOpen] = useState(false);
  const [inviteOpen, setInviteOpen]     = useState(false);
  const [linkCopied, setLinkCopied]     = useState(false);
  const [joinOpen, setJoinOpen]         = useState(false);

  const toggleSidebar = (id: string) =>
    setExpandedId((prev) => (prev === id ? "" : id));

  const handleCopyId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const navTo = (path: string, navState?: object) =>
    navigate(path, navState ? { state: navState } : undefined);

  const renderSidebarItems = (list: Workspace[], section: string) =>
    list.map((ws) => (
      <div key={`${section}-${ws.id}`}>
        <div className="sidebar-item" onClick={() => toggleSidebar(ws.id)}>
          <div className="sidebar-item-icon" style={{ background: ws.gradient }}>
            {ws.name[0]}
          </div>
          <span className="sidebar-item-name">{ws.name}</span>
          <span className={`sidebar-arrow ${expandedId === ws.id ? "open" : ""}`}>▾</span>
        </div>
        <div className={`sidebar-submenu ${expandedId === ws.id ? "open" : ""}`}>
          <div
            className="sidebar-subitem"
            onClick={() => navigate("/workspace-board", { state: { workspace: ws, workspaces: allWorkspaces } })}
          >
            <span className="subitem-icon">□</span> Board
          </div>
          <div
            className={`sidebar-subitem ${ws.id === workspace.id ? "active-subitem" : ""}`}
            onClick={() => navTo("/members", { workspace: ws, teamWorkspaces: teamWs, personalWorkspaces: personalWs })}
          >
            <span className="subitem-icon">👥</span> Members
          </div>
          <div className="sidebar-subitem" onClick={() => navTo("/settings", { workspace: ws, teamWorkspaces: teamWs, personalWorkspaces: personalWs })}>
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
            {renderSidebarItems(teamWs, 'team')}
          </div>

          <hr className="sidebar-divider" />

          <div className="sidebar-section">
            <p className="sidebar-label">개인 워크스페이스</p>
            {renderSidebarItems(personalWs, 'personal')}
          </div>

          <div className="sidebar-bottom">
            <hr className="sidebar-divider" />
            <div className="sidebar-nav-item" onClick={() => navTo("/workspace")}>
              <span className="nav-icon">🏠</span>
              <span>Home</span>
            </div>
            <div className="sidebar-nav-item active">
              <span className="nav-icon">👥</span>
              <span>Members</span>
            </div>
            <button className="join-btn" onClick={() => setJoinOpen(true)}>워크스페이스 참여 !</button>
          </div>
        </aside>

        <main className="member-main">
          <div className="member-header-row">
            <h2 className="member-title">
              멤버 <span className="member-count">1 / 20</span>
            </h2>
          </div>

          <div className="member-section">
            <div className="member-section-top">
              <span className="member-section-label">멤버 목록</span>
              <button className="invite-btn" onClick={() => { setInviteOpen(true); setLinkCopied(false); }}>초대하기 👥</button>
            </div>

            <input
              className="member-search"
              placeholder="이름 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="member-list">
              {[{ name: userName, id: userId }]
                .filter((m) => m.name.includes(search))
                .map((m) => (
                  <div key={m.id} className="member-row">
                    <div className="member-avatar" />
                    <div className="member-info">
                      <span className="member-name">{m.name}</span>
                      <span className="member-last">최근 접속 오늘</span>
                    </div>
                    <div className="member-actions">
                      <div className="role-wrap">
                        <button className="role-btn" onClick={() => setRoleDropOpen((v) => !v)}>
                          개인 보드 목록 ▾
                        </button>
                        {roleDropOpen && (
                          <div className="role-dropdown">
                            {teamWs.length === 0 ? (
                              <div className="role-dropdown-item empty">팀 워크스페이스 없음</div>
                            ) : (
                              teamWs.map((ws) => (
                                <div key={ws.id} className="role-dropdown-item">{ws.name}</div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <button className="leave-btn">나가기</button>
                      <button
                        className="copy-id-btn"
                        onClick={handleCopyId}
                        title="ID 복사"
                      >
                        {copied ? "✓" : "ID"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </main>
      </div>
      {joinOpen && <JoinModal onClose={() => setJoinOpen(false)} />}

      {inviteOpen && (
        <div className="modal-overlay" onClick={() => setInviteOpen(false)}>
          <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
            <button className="invite-modal-close" onClick={() => setInviteOpen(false)}>✕</button>
            <h3 className="invite-modal-title">워크 스페이스 초대하기</h3>
            <input className="invite-email-input" placeholder="이메일 검색" />
            <div className="invite-modal-footer">
              <button
                className="invite-link-btn"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setLinkCopied(true);
                }}
              >
                초대 링크 복사 🔗
              </button>
              {linkCopied && <span className="invite-link-copied">복사 완료!</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
