/**
 * 전역 헤더 컴포넌트
 * 워크스페이스 이름 검색, My projects 이동, 알림, 사용자 드롭다운 메뉴 포함
 * JWT 토큰 유무로 로그인 여부 판단하여 UI 분기 처리
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AITaskModal from "./AITaskModal";
import "./Header.css";

interface WorkspaceItem {
  id: string;
  name: string;
  gradient: string;
}

interface HeaderProps {
  workspaces?: WorkspaceItem[];
  showSearch?: boolean;
  onLogout?: () => void;
}

interface Invitation {
  invitationId: string;
  workspaceId: string;
  workspaceName: string;
  inviterName: string;
}

interface KickNotification {
  notificationId: string;
  message: string;
}

export default function Header({ workspaces = [], showSearch = true, onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('accessToken');
  const userName = localStorage.getItem('userName') ?? '사용자';
  const userId = localStorage.getItem('userId') ?? '';
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [aiTaskOpen, setAiTaskOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [kickNotis, setKickNotis] = useState<KickNotification[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notiRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const [invRes, kickRes] = await Promise.all([
        fetch(`/api/invitations?userId=${userId}`),
        fetch(`/api/notifications?userId=${userId}`),
      ]);
      const invJson = await invRes.json();
      const kickJson = await kickRes.json();
      setInvitations(invJson.data ?? []);
      setKickNotis(kickJson.data ?? []);
    } catch {
      setInvitations([]);
      setKickNotis([]);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 15000);
    return () => clearInterval(timer);
  }, [userId]);

  const handleAccept = async (invitationId: string) => {
    await fetch(`/api/invitations/${invitationId}/accept`, { method: "POST" });
    setInvitations((prev) => prev.filter((i) => i.invitationId !== invitationId));
    setNotiOpen(false);
    if (window.location.pathname === '/workspace') {
      window.location.reload();
    } else {
      navigate('/workspace');
    }
  };

  const handleReject = async (invitationId: string) => {
    await fetch(`/api/invitations/${invitationId}/reject`, { method: "POST" });
    setInvitations((prev) => prev.filter((i) => i.invitationId !== invitationId));
  };

  const filtered = query.trim()
    ? workspaces.filter((ws) => ws.name.includes(query))
    : [];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) {
        setNotiOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    onLogout?.();
    navigate('/login');
  };

  return (
    <>
    <header className="header">
      <div className="header-logo" onClick={() => navigate("/")}>C'FLOW</div>

      {showSearch && (
        <div className="header-search" ref={searchRef}>
          <div className="search-input-wrap">
            <input
              type="text"
              placeholder=""
              className="search-input"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
            />
            {searchOpen && filtered.length > 0 && (
              <div className="search-dropdown">
                <p className="search-dropdown-category">Board</p>
                {filtered.map((ws) => (
                  <div key={ws.id} className="search-result-item" onClick={() => { setSearchOpen(false); setQuery(''); localStorage.setItem("clickedWorkspace", JSON.stringify(ws)); navigate('/workspace-board', { state: { workspace: ws, workspaces } }); }}>
                    <div className="search-result-thumb" style={{ background: ws.gradient }} />
                    <span className="search-result-name">{ws.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="header-create-btn">Search</button>
        </div>
      )}

      <div className="header-right">
        {showSearch && (
          <>
            <div className="header-myprojects" onClick={() => navigate('/workspace')} style={{ cursor: 'pointer' }}>
              <span className="grid-icon">⊞</span>
              <span>My projects</span>
            </div>
            <div className="header-noti-wrap" ref={notiRef}>
              <button className="header-icon-btn noti-btn" onClick={() => setNotiOpen((v) => !v)}>
                🔔
                {(invitations.length + kickNotis.length) > 0 && <span className="noti-badge">!</span>}
              </button>
              {notiOpen && (
                <div className="noti-dropdown">
                  <p className="noti-title">알림</p>
                  {invitations.length === 0 && kickNotis.length === 0 ? (
                    <p className="noti-empty">새 알림이 없습니다.</p>
                  ) : (
                    <>
                      {kickNotis.map((n) => (
                        <div key={n.notificationId} className="noti-item noti-item-kick">
                          <p className="noti-msg">🚫 <strong>{n.message}</strong></p>
                          <div className="noti-actions">
                            <button className="noti-reject-btn" onClick={async () => {
                              await fetch(`/api/notifications/${n.notificationId}/read`, { method: "POST" });
                              setKickNotis((prev) => prev.filter((x) => x.notificationId !== n.notificationId));
                              navigate('/workspace');
                            }}>확인</button>
                          </div>
                        </div>
                      ))}
                      {invitations.map((inv) => (
                        <div key={inv.invitationId} className="noti-item">
                          <p className="noti-msg">
                            <strong>{inv.inviterName}</strong>님이 <strong>{inv.workspaceName}</strong> 워크스페이스에 초대했습니다.
                          </p>
                          <div className="noti-actions">
                            <button className="noti-reject-btn" onClick={() => handleReject(inv.invitationId)}>거절</button>
                            <button className="noti-accept-btn" onClick={() => handleAccept(inv.invitationId)}>수락</button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {isLoggedIn ? (
          <div
            className="header-user"
            ref={userMenuRef}
            onClick={() => setUserMenuOpen((v) => !v)}
            style={{ position: 'relative' }}
          >
            <div className="user-avatar" />
            <span className="user-name">{userName}님</span>
            <span className="dropdown-arrow">▾</span>

            {userMenuOpen && (
              <div className="user-dropdown">
                <div
                  className="user-dropdown-item"
                  onClick={() => { setUserMenuOpen(false); navigate('/workspace'); }}
                >
                  내 워크스페이스
                </div>
                <div
                  className="user-dropdown-item"
                  onClick={() => setUserMenuOpen(false)}
                >
                  개인정보 설정
                </div>
                <div
                  className="user-dropdown-item logout"
                  onClick={handleLogout}
                >
                  로그아웃
                </div>
              </div>
            )}
          </div>
        ) : (
          <button className="header-login-btn" onClick={() => navigate('/login')}>
            로그인
          </button>
        )}
      </div>
    </header>
    {aiTaskOpen && <AITaskModal onClose={() => setAiTaskOpen(false)} />}
    </>
  );
}
