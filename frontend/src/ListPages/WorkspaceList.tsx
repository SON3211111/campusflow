/**
 * 워크스페이스 목록 페이지 (홈)
 * 팀/개인 워크스페이스 목록 조회, 새로 만들기, 즐겨찾기, 삭제 기능 제공
 * ID 기반 랜덤 그라데이션으로 썸네일 색상 자동 지정
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import WorkspaceCard from "../components/WorkspaceCard";
import BoardCreator from "../components/BoardCreator";
import JoinModal from "../components/JoinModal";
import AITaskModal from "../components/AITaskModal";
import client from "../api/client";
import "./WorkspaceList.css";

interface Workspace {
  id: string;
  name: string;
  gradient: string;
  starred?: boolean;
  type?: string;
  ownerId?: string;
}

const GRADIENTS = [
  "linear-gradient(135deg, #74aaff, #a8d0ff)",
  "linear-gradient(135deg, #ff7070, #ffb0b0)",
  "linear-gradient(135deg, #7ed957, #b8f0a0)",
  "linear-gradient(135deg, #ffb347, #ffcc80)",
  "linear-gradient(135deg, #a78bfa, #c4b5fd)",
];

function randomGradient(id: string | number) {
  let sum = 0;
  for (const char of String(id)) sum += char.charCodeAt(0);
  return GRADIENTS[sum % GRADIENTS.length];
}

export default function WorkspaceList() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') ?? '';

  const [teamWorkspaces, setTeamWorkspaces] = useState<Workspace[]>([]);
  const [personalWorkspaces, setPersonalWorkspaces] = useState<Workspace[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creatorRect, setCreatorRect] = useState<DOMRect | null>(null);
  const [creatorSection, setCreatorSection] = useState<'team' | 'personal' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: any; section: 'team' | 'personal'; name: string; ownerId?: string } | null>(null);
  const [joinOpen, setJoinOpen]   = useState(false);
  const [aiTaskOpen, setAiTaskOpen] = useState(false);
  const creatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    client.get(`/workspaces?userId=${userId}`)
      .then((res) => {
        const list: Workspace[] = (res.data.data ?? []).map((ws: any) => {
          const localGradient = localStorage.getItem(`ws_gradient_${ws.workspaceId}`);
          return {
            id: ws.workspaceId,
            name: ws.name,
            gradient: localGradient || ws.gradient || randomGradient(ws.workspaceId),
            starred: false,
            type: ws.type,
            ownerId: ws.ownerId,
          };
        });
        setTeamWorkspaces(list.filter((ws) => ws.type === 'TEAM'));
        setPersonalWorkspaces(list.filter((ws) => ws.type !== 'TEAM'));
      })
      .catch(() => {});
  }, [userId]);

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

  const handleCreate = async (name: string, gradient: string) => {
    const type = creatorSection === 'team' ? 'TEAM' : 'PERSONAL';
    const allNames = [...teamWorkspaces, ...personalWorkspaces].map((ws) => ws.name);
    if (allNames.includes(name.trim())) {
      alert(`"${name}" 이름의 워크스페이스가 이미 존재합니다.`);
      return;
    }
    try {
      const res = await client.post(`/workspaces?userId=${userId}`, { name, type, gradient });
      const created = res.data.data;
      localStorage.setItem(`ws_gradient_${created.workspaceId}`, gradient);
      const newWs: Workspace = {
        id: created.workspaceId,
        name: created.name,
        gradient,
        starred: false,
        type: created.type,
      };
      if (creatorSection === 'team') {
        setTeamWorkspaces((prev) => [...prev, newWs]);
      } else {
        setPersonalWorkspaces((prev) => [...prev, newWs]);
      }
    } catch {
      alert('워크스페이스 생성에 실패했습니다.');
    }
    setCreatorRect(null);
    setCreatorSection(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, section } = deleteTarget;
    try {
      await client.delete(`/workspaces/${id}?userId=${localStorage.getItem('userId') ?? ''}`);
      if (section === 'team') setTeamWorkspaces((prev) => prev.filter((ws) => ws.id !== id));
      else setPersonalWorkspaces((prev) => prev.filter((ws) => ws.id !== id));
    } catch (err: any) {
      if (err.response?.status === 403) {
        alert('삭제가 불가능합니다.');
      } else {
        alert('삭제에 실패했습니다.');
      }
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleStar = (id: string, section: 'team' | 'personal') => {
    const updater = (prev: Workspace[]) =>
      prev.map((ws) => ws.id === id ? { ...ws, starred: !ws.starred } : ws);
    if (section === 'team') setTeamWorkspaces(updater);
    else setPersonalWorkspaces(updater);
  };

  const toggleSidebar = (id: string) => {
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
      <div key={`${section}-${ws.id}`}>
        <div className="sidebar-item" onClick={() => toggleSidebar(ws.id)}>
          <div className="sidebar-item-icon" style={{ background: ws.gradient }}>
            {ws.name[0]}
          </div>
          <span className="sidebar-item-name">{ws.name}</span>
          <span className={`sidebar-arrow ${expandedId === ws.id ? 'open' : ''}`}>▾</span>
        </div>
        <div className={`sidebar-submenu ${expandedId === ws.id ? 'open' : ''}`}>
          <div className="sidebar-subitem" onClick={() => navigate('/workspace-board', { state: { workspace: ws, workspaces: [...teamWorkspaces, ...personalWorkspaces] } })}><span className="subitem-icon">□</span> Board</div>
          <div className="sidebar-subitem" onClick={() => navigate('/members', { state: { workspace: ws, teamWorkspaces, personalWorkspaces } })}><span className="subitem-icon">👥</span> Members</div>
          <div className="sidebar-subitem" onClick={() => navigate('/settings', { state: { workspace: ws, teamWorkspaces, personalWorkspaces } })}><span className="subitem-icon">⚙</span> Setting</div>
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
            <button className="join-btn" onClick={() => setJoinOpen(true)}>워크스페이스 참여 !</button>
          </div>
        </aside>

        <main className="main-content">
          <section className="ws-section">
            <h3 className="section-title">팀 Work Space</h3>
            <div className="card-grid">
              {teamWorkspaces.map((ws) => (
                <WorkspaceCard
                  key={`team-${ws.id}`}
                  name={ws.name}
                  gradient={ws.gradient}
                  starred={ws.starred}
                  onToggleStar={() => toggleStar(ws.id, 'team')}
                  onDelete={() => setDeleteTarget({ id: ws.id, section: 'team', name: ws.name, ownerId: ws.ownerId })}
                  onClick={() => {
                    localStorage.setItem("clickedWorkspace", JSON.stringify(ws));
                    navigate('/workspace-board', { state: { workspace: ws, workspaces: [...teamWorkspaces, ...personalWorkspaces] } });
                  }}
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
                  key={`personal-${ws.id}`}
                  name={ws.name}
                  gradient={ws.gradient}
                  starred={ws.starred}
                  onToggleStar={() => toggleStar(ws.id, 'personal')}
                  onDelete={() => setDeleteTarget({ id: ws.id, section: 'personal', name: ws.name, ownerId: ws.ownerId })}
                  onClick={() => {
                    localStorage.setItem("clickedWorkspace", JSON.stringify(ws));
                    navigate('/workspace-board', { state: { workspace: ws, workspaces: [...teamWorkspaces, ...personalWorkspaces] } });
                  }}
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
                  key={`fav-${ws.id}`}
                  name={ws.name}
                  gradient={ws.gradient}
                  starred
                />
              ))}
            </div>
          </section>
        </main>
      </div>

      {creatorRect && (
        <div
          ref={creatorRef}
          style={{ position: 'fixed', left: creatorLeft, top: creatorTop, zIndex: 300 }}
        >
          <BoardCreator onClose={() => { setCreatorRect(null); setCreatorSection(null); }} onCreate={handleCreate} />
        </div>
      )}

      <button className="settings-btn">⚙</button>
      {joinOpen && <JoinModal onClose={() => setJoinOpen(false)} />}
      {aiTaskOpen && <AITaskModal onClose={() => setAiTaskOpen(false)} workspaces={allWorkspaces} />}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <p className="modal-title">워크스페이스 삭제</p>
            {deleteTarget.ownerId === userId ? (
              <>
                <p className="modal-desc">
                  <strong>{deleteTarget.name}</strong>을(를) 삭제하시겠습니까?<br />
                  삭제된 워크스페이스는 복구할 수 없습니다.
                </p>
                <div className="modal-actions">
                  <button className="modal-btn cancel" onClick={() => setDeleteTarget(null)}>취소</button>
                  <button className="modal-btn confirm" onClick={confirmDelete}>삭제</button>
                </div>
              </>
            ) : (
              <>
                <p className="modal-desc">삭제가 불가능합니다.</p>
                <div className="modal-actions">
                  <button className="modal-btn cancel" onClick={() => setDeleteTarget(null)}>확인</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
