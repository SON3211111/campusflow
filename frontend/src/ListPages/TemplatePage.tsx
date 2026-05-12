import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import JoinModal from "../components/JoinModal";
import "./WorkspaceList.css";
import "./TemplatePage.css";

interface Workspace {
  id: number;
  name: string;
  gradient: string;
  starred?: boolean;
}

const TEMPLATES = [
  { id: 1, name: "초원",            bg: "linear-gradient(180deg,#87ceeb 20%,#90ee90 65%,#228b22 100%)" },
  { id: 2, name: "밤 하늘",         bg: "linear-gradient(180deg,#0d0d2b 0%,#1a1a4e 60%,#0f0c29 100%)" },
  { id: 3, name: "예쁘다",          bg: "linear-gradient(180deg,#1a1a3e 0%,#6b21a8 45%,#1e40af 100%)" },
  { id: 4, name: "핑크 그라데이션", bg: "linear-gradient(135deg,#f0abfc 0%,#c084fc 50%,#a78bfa 100%)" },
];

const EMPTY_COUNT = 12;
const CATEGORIES = ["인기", "풍경", "마케팅", "디자인"];

export default function TemplatePage() {
  const { state } = useLocation() as {
    state: { workspace: Workspace; teamWorkspaces: Workspace[]; personalWorkspaces: Workspace[] };
  };
  const navigate = useNavigate();

  const workspace  = state?.workspace         ?? { id: 0, name: "워크스페이스", gradient: "#ccc" };
  const teamWs     = state?.teamWorkspaces     ?? [];
  const personalWs = state?.personalWorkspaces ?? [];
  const allWorkspaces = [...teamWs, ...personalWs];

  const [expandedId, setExpandedId]   = useState<number>(workspace.id);
  const [catOpen, setCatOpen]         = useState(false);
  const [joinOpen, setJoinOpen]       = useState(false);
  const [selectedCat, setSelectedCat] = useState<string>("전체");
  const [search, setSearch]           = useState("");

  const toggleSidebar = (id: number) =>
    setExpandedId((prev) => (prev === id ? -1 : id));

  const navState = (ws: Workspace) => ({
    workspace: ws,
    teamWorkspaces: teamWs,
    personalWorkspaces: personalWs,
  });

  const renderSidebarItems = (list: Workspace[]) =>
    list.map((ws) => (
      <div key={ws.id}>
        <div className="sidebar-item" onClick={() => toggleSidebar(ws.id)}>
          <div className="sidebar-item-icon" style={{ background: ws.gradient }}>
            {ws.name[0]}
          </div>
          <span className="sidebar-item-name">{ws.name}</span>
          <span className={`sidebar-arrow ${expandedId === ws.id ? "open" : ""}`}>▾</span>
        </div>
        <div className={`sidebar-submenu ${expandedId === ws.id ? "open" : ""}`}>
          <div className="sidebar-subitem" onClick={() => navigate("/board", { state: navState(ws) })}>
            <span className="subitem-icon">□</span> Board
          </div>
          <div className="sidebar-subitem" onClick={() => navigate("/members", { state: navState(ws) })}>
            <span className="subitem-icon">👥</span> Members
          </div>
          <div className="sidebar-subitem" onClick={() => navigate("/settings", { state: navState(ws) })}>
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
              <span className="nav-icon">🖥</span>
              <span>Board</span>
            </div>
            <button className="join-btn" onClick={() => setJoinOpen(true)}>워크스페이스 참여 !</button>
          </div>
        </aside>

        <main className="template-main">
          <div className="template-top-bar">
            <h2 className="template-page-title">전체 템플릿</h2>
            <div className="template-search-wrap">
              <input
                className="template-search"
                placeholder="검색하여 찾기"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="template-search-icon">🔍</span>
            </div>
          </div>

          <div className="template-filter-bar">
            <span className="template-filter-label">카테고리</span>
            <div className="template-cat-wrap">
              <button
                className="template-cat-btn"
                onClick={() => setCatOpen((v) => !v)}
              >
                {selectedCat} ▾
              </button>
              {catOpen && (
                <div className="template-cat-dropdown">
                  {["전체", ...CATEGORIES].map((cat) => (
                    <div
                      key={cat}
                      className={`template-cat-item ${selectedCat === cat ? "active" : ""}`}
                      onClick={() => { setSelectedCat(cat); setCatOpen(false); }}
                    >
                      {cat}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <hr className="template-page-divider" />

          <div className="template-grid-full">
            {TEMPLATES.filter((t) => t.name.includes(search)).map((t) => (
              <div key={t.id} className="template-card-full">
                <div className="template-thumb-full" style={{ background: t.bg }} />
                <span className="template-name-full">{t.name}</span>
              </div>
            ))}
            {Array.from({ length: EMPTY_COUNT }).map((_, i) => (
              <div key={`empty-${i}`} className="template-card-full">
                <div className="template-thumb-full empty" />
              </div>
            ))}
          </div>
        </main>
      </div>
      {joinOpen && <JoinModal onClose={() => setJoinOpen(false)} />}
    </div>
  );
}
