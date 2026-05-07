import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import WorkspaceCard from "../components/WorkspaceCard";
import BoardCreator from "../components/BoardCreator";
import "./WorkspaceList.css";

interface Workspace {
  id: number;
  name: string;
  gradient: string;
  starred?: boolean;
}

let nextId = 10;

const DEFAULT_TEAM: Workspace[] = [
  { id: 1, name: "ㅁㄴㅇㄹ", gradient: "linear-gradient(135deg, #74aaff, #a8d0ff)", starred: true },
  { id: 2, name: "ㅂㅈㄷㄱㅂㅈㄷㄱㅂㅈㄷㄱ", gradient: "linear-gradient(135deg, #ff7070, #ffb0b0)", starred: true },
];

export default function WorkspaceList() {
  const navigate = useNavigate();
  const location = useLocation();
  const locState = location.state as { teamWorkspaces?: Workspace[]; personalWorkspaces?: Workspace[] } | null;

  const [teamWorkspaces, setTeamWorkspaces] = useState<Workspace[]>(locState?.teamWorkspaces ?? DEFAULT_TEAM);
  const [personalWorkspaces, setPersonalWorkspaces] = useState<Workspace[]>(locState?.personalWorkspaces ?? []);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [creatorRect, setCreatorRect] = useState<DOMRect | null>(null);
  const [creatorSection, setCreatorSection] = useState<'team' | 'personal' | null>(null);
  const creatorRef = useRef<HTMLDivElement>(null);

  const handleNewCardClick = (section: 'team' | 'personal') => (e: React.MouseEvent<HTMLDivElement>) => {
    if (creatorRect && creatorSection === section) {
      setCreatorRect(null);
      setCreatorSection(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setCreatorRect(rect);
    setCreatorSection(section);
  };

  const handleCreate = (name: string, gradient: string) => {
    const newWs: Workspace = { id: nextId++, name, gradient, starred: false };
    if (creatorSection === 'team') {
      setTeamWorkspaces((prev) => [...prev, newWs]);
    } else {
      setPersonalWorkspaces((prev) => [...prev, newWs]);
    }
    setCreatorRect(null);
    setCreatorSection(null);
  };

  const toggleStar = (id: number, section: 'team' | 'personal') => {
    const updater = (prev: Workspace[]) =>
      prev.map((ws) => ws.id === id ? { ...ws, starred: !ws.starred } : ws);
    if (section === 'team') setTeamWorkspaces(updater);
    else setPersonalWorkspaces(updater);
  };

  const toggleSidebar = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (!creatorRect) return;
    const handleOutside = (e: MouseEvent) => {
      if (creatorRef.current && !creatorRef.current.contains(e.target as Node)) {
        setCreatorRect(null);
        setCreatorSection(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [creatorRect]);

  const creatorLeft = creatorRect
    ? Math.min(creatorRect.right + 8, window.innerWidth - 230)
    : 0;
  const creatorTop = creatorRect ? creatorRect.top : 0;

  const allWorkspaces = [...teamWorkspaces, ...personalWorkspaces];
  const favorites = allWorkspaces.filter((ws) => ws.starred);

  const renderSidebarItems = (workspaces: Workspace[], section: 'team' | 'personal') =>
    workspaces.map((ws) => (
      <div key={ws.id}>
        <div className="sidebar-item" onClick={() => toggleSidebar(ws.id)}>
          <div className="sidebar-item-icon" style={{ background: ws.gradient }}>
            {ws.name[0]}
          </div>
          <span className="sidebar-item-name">{ws.name}</span>
          <span className={`sidebar-arrow ${expandedId === ws.id ? 'open' : ''}`}>▾</span>
        </div>
        <div className={`sidebar-submenu ${expandedId === ws.id ? 'open' : ''}`}>
          <div className="sidebar-subitem" onClick={() => navigate('/board', { state: { workspace: ws, teamWorkspaces, personalWorkspaces } })}><span className="subitem-icon">□</span> Board</div>
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
            {renderSidebarItems(teamWorkspaces, 'team')}
          </div>

          <hr className="sidebar-divider" />

          <div className="sidebar-section">
            <p className="sidebar-label">개인 워크스페이스</p>
            {renderSidebarItems(personalWorkspaces, 'personal')}
          </div>

          <div className="sidebar-bottom">
            <hr className="sidebar-divider" />
            <div className="sidebar-nav-item">
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
        <main className="main-content">
          <section className="ws-section">
            <h3 className="section-title">팀 Work Space</h3>
            <div className="card-grid">
              {teamWorkspaces.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  name={ws.name}
                  gradient={ws.gradient}
                  starred={ws.starred}
                  onToggleStar={() => toggleStar(ws.id, 'team')}
                />
              ))}
              <div
                className="ws-card new-card"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleNewCardClick('team')}
              >
                <div className="gray-thumb">
                  <span className="new-label">새로 만들기</span>
                </div>
              </div>
            </div>
          </section>

          <hr className="divider" />

          <section className="ws-section">
            <h3 className="section-title">개인 Work Space</h3>
            <div className="card-grid">
              {personalWorkspaces.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  name={ws.name}
                  gradient={ws.gradient}
                  starred={ws.starred}
                  onToggleStar={() => toggleStar(ws.id, 'personal')}
                />
              ))}
              <div
                className="ws-card new-card"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleNewCardClick('personal')}
              >
                <div className="gray-thumb">
                  <span className="new-label">새로 만들기</span>
                </div>
              </div>
            </div>
          </section>

          <hr className="divider" />

          <section className="ws-section">
            <h3 className="section-title">즐겨찾기</h3>
            <div className="card-grid">
              {favorites.map((ws) => (
                <WorkspaceCard
                  key={ws.id}
                  name={ws.name}
                  gradient={ws.gradient}
                  starred
                />
              ))}
            </div>
          </section>
        </main>
      </div>

      {/* 보드 만들기 팝업 */}
      {creatorRect && (
        <div
          ref={creatorRef}
          style={{ position: 'fixed', left: creatorLeft, top: creatorTop, zIndex: 300 }}
        >
          <BoardCreator onClose={() => { setCreatorRect(null); setCreatorSection(null); }} onCreate={handleCreate} />
        </div>
      )}

      <button className="settings-btn">⚙</button>
    </div>
  );
}
