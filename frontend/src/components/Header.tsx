/**
 * 전역 헤더 컴포넌트
 * 워크스페이스 이름 검색, My projects 이동, 알림, 사용자 드롭다운 메뉴 포함
 * JWT 토큰 유무로 로그인 여부 판단하여 UI 분기 처리
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LayoutGrid, LogOut, Search, Settings, UserRound } from "lucide-react";
import PixelAvatar from "./PixelAvatar";
import client from "../api/client";
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
  type?: string;
  taskId?: string;
  createdAt?: string;
}

export default function Header({ workspaces = [], showSearch = true, onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('accessToken');
  const userName = localStorage.getItem('userName') ?? '사용자';
  const userId = localStorage.getItem('userId') ?? '';
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [kickNotis, setKickNotis] = useState<KickNotification[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notiRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const [invRes, kickRes] = await Promise.all([
        client.get(`/invitations?userId=${userId}`),
        client.get(`/notifications?userId=${userId}&unreadOnly=true`),
      ]);
      setInvitations(invRes.data.data ?? []);
      setKickNotis(kickRes.data.data ?? []);
    } catch {
      setInvitations([]);
      setKickNotis([]);
    }
  }, [userId]);

  useEffect(() => {
    const initialTimer = setTimeout(fetchNotifications, 0);
    const timer = setInterval(fetchNotifications, 3000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, [fetchNotifications]);

  const addWorkspaceActivity = (workspaceId: string, message: string) => {
    const key = `workspace_activity_${workspaceId}`;
    const existing = JSON.parse(localStorage.getItem(key) ?? "[]");
    const newEntry = { message, time: new Date().toLocaleString() };
    localStorage.setItem(key, JSON.stringify([newEntry, ...existing].slice(0, 20)));
  };

  const handleAccept = async (invitationId: string) => {
    const inv = invitations.find((i) => i.invitationId === invitationId);
    await client.post(`/invitations/${invitationId}/accept`);
    if (inv) addWorkspaceActivity(inv.workspaceId, `${userName}가 ${inv.workspaceName} 워크스페이스에 참가하였습니다.`);
    setInvitations((prev) => prev.filter((i) => i.invitationId !== invitationId));
    setNotiOpen(false);
    if (window.location.pathname === '/workspace') {
      window.location.reload();
    } else {
      navigate('/workspace');
    }
  };

  const handleReject = async (invitationId: string) => {
    await client.post(`/invitations/${invitationId}/reject`);
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
      <div className="header-logo" onClick={() => navigate("/")}>
        <span className="header-logo-mark">C</span>
        <span>C'FLOW</span>
      </div>

      {showSearch && (
        <div className="header-search" ref={searchRef}>
          <div className="search-input-wrap">
            <Search className="search-input-icon" size={16} />
            <input
              type="text"
              placeholder="워크스페이스를 검색해 보세요"
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
              <LayoutGrid size={15} />
              <span>My projects</span>
            </div>
            <div className="header-noti-wrap" ref={notiRef}>
              <button className="header-icon-btn noti-btn" onClick={() => setNotiOpen((v) => !v)}>
                <Bell size={18} />
                {(invitations.length + kickNotis.length) > 0 && (
                  <span className="noti-badge">{invitations.length + kickNotis.length}</span>
                )}
              </button>
              {notiOpen && (
                <div className="noti-dropdown">
                  <p className="noti-title">알림</p>
                  {invitations.length === 0 && kickNotis.length === 0 ? (
                    <p className="noti-empty">새 알림이 없습니다.</p>
                  ) : (
                    <>
                      {kickNotis.map((n) => {
                        // STATUS_CHANGE 알림
                        if (n.type === "STATUS_CHANGE") {
                          return (
                            <div key={n.notificationId} className="noti-item">
                              <p className="noti-msg">{n.message}</p>
                              <div className="noti-actions">
                                <button className="noti-reject-btn" onClick={async () => {
                                  await client.post(`/notifications/${n.notificationId}/read`).catch(() => {});
                                  setKickNotis((prev) => prev.filter((x) => x.notificationId !== n.notificationId));
                                }}>확인</button>
                              </div>
                            </div>
                          );
                        }

                        // JOIN_REQUEST 알림
                        let joinReq: { type?: string; requesterId?: string; requesterName?: string; workspaceId?: string; workspaceName?: string } | null = null;
                        try { joinReq = JSON.parse(n.message); } catch { joinReq = null; }
                        const isJoinRequest = joinReq?.type === "JOIN_REQUEST";
                        if (isJoinRequest && joinReq) {
                          return (
                            <div key={n.notificationId} className="noti-item">
                              <p className="noti-msg">
                                <strong>{joinReq.requesterName}</strong>님이 <strong>{joinReq.workspaceName}</strong> 워크스페이스에 참가하고 싶어합니다.
                              </p>
                              <div className="noti-actions">
                                <button className="noti-reject-btn" onClick={async () => {
                                  await client.post(`/workspaces/join-requests/${n.notificationId}/reject`);
                                  setKickNotis((prev) => prev.filter((x) => x.notificationId !== n.notificationId));
                                }}>거절</button>
                                <button className="noti-accept-btn" onClick={async () => {
                                  await client.post(`/workspaces/join-requests/${n.notificationId}/accept`);
                                  if (joinReq!.workspaceId) addWorkspaceActivity(joinReq!.workspaceId, `${joinReq!.requesterName}가 ${joinReq!.workspaceName} 워크스페이스에 참가하였습니다.`);
                                  setKickNotis((prev) => prev.filter((x) => x.notificationId !== n.notificationId));
                                  setNotiOpen(false);
                                }}>수락</button>
                              </div>
                            </div>
                          );
                        }

                        // 일반 알림 (수락/거절/강퇴 등)
                        const isAccepted = n.message.includes("수락");
                        const itemClass = isAccepted ? "noti-item noti-item-accept" : "noti-item noti-item-kick";
                        return (
                          <div key={n.notificationId} className={itemClass}>
                            <p className="noti-msg"><strong>{n.message}</strong></p>
                            <div className="noti-actions">
                              <button className="noti-reject-btn" onClick={async () => {
                                await client.post(`/notifications/${n.notificationId}/read`);
                                setKickNotis((prev) => prev.filter((x) => x.notificationId !== n.notificationId));
                                if (isAccepted) navigate('/workspace');
                              }}>확인</button>
                            </div>
                          </div>
                        );
                      })}
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
            <PixelAvatar userId={userId} name={userName} size="sm" className="header-pixel-avatar" />
            <span className="user-name">{userName}님</span>
            <ChevronDown className={`dropdown-arrow ${userMenuOpen ? "open" : ""}`} size={15} />

            {userMenuOpen && (
              <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="user-dropdown-profile">
                  <PixelAvatar userId={userId} name={userName} size="md" />
                  <div>
                    <p className="user-dropdown-name">{userName}님</p>
                    <p className="user-dropdown-caption">오늘도 좋은 하루 보내세요</p>
                  </div>
                </div>
                <div className="user-dropdown-menu">
                <div
                  className="user-dropdown-item"
                  onClick={() => { setUserMenuOpen(false); navigate('/workspace'); }}
                >
                  <UserRound size={16} />
                  내 워크스페이스
                </div>
                <div
                  className="user-dropdown-item"
                  onClick={() => { setUserMenuOpen(false); navigate('/profile-settings'); }}
                >
                  <Settings size={16} />
                  개인정보 설정
                </div>
                <div
                  className="user-dropdown-item logout"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  로그아웃
                </div>
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
    </>
  );
}
