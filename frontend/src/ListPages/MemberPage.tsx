/**
 * 멤버 관리 페이지
 * 워크스페이스에 속한 멤버 목록 확인, 이름 검색, 초대 링크 복사, 사용자 ID 복사 기능 제공
 */
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Crown, Home, LayoutDashboard, Settings, UserPlus, UsersRound } from "lucide-react";
import client from "../api/client";
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

  const userId   = localStorage.getItem("userId")   ?? "-";

  const [expandedId, setExpandedId]     = useState<string>(workspace.id);
  const [search, setSearch]             = useState("");
  const [copied, setCopied]             = useState(false);
  const [roleDropOpen, setRoleDropOpen] = useState(false);
  const [inviteOpen, setInviteOpen]     = useState(false);
  const [linkCopied, setLinkCopied]     = useState(false);
  const [joinOpen, setJoinOpen]         = useState(false);
  const [inviteEmail, setInviteEmail]   = useState("");
  const [searchResult, setSearchResult] = useState<{ userId: string; name: string; email: string } | null>(null);
  const [searchError, setSearchError]   = useState("");
  const [inviteSentMsg, setInviteSentMsg] = useState("");
  const [members, setMembers] = useState<{ userId: string; name: string; email: string; role: string }[]>([]);

  useEffect(() => {
    if (!workspace.id) return;
    client.get(`/workspaces/${workspace.id}/members`)
      .then((res) => setMembers(res.data.data ?? []))
      .catch(() => {});
  }, [workspace.id]);

  const toggleSidebar = (id: string) =>
    setExpandedId((prev) => (prev === id ? "" : id));

  const handleCopyId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleInviteSearch = async () => {
    if (!inviteEmail.trim()) return;
    setSearchResult(null);
    setSearchError("");
    try {
      const res = await client.get(`/auth/search?email=${encodeURIComponent(inviteEmail.trim())}`);
      const data = res.data.data;
      setSearchResult({ userId: data.userId, name: data.name, email: data.email });
    } catch (err: any) {
      if (err.response?.status === 404) {
        setSearchError("계정을 찾을 수 없습니다.");
      } else {
        setSearchError("검색에 실패했습니다.");
      }
    }
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
            <LayoutDashboard className="subitem-icon" size={14} /> Board
          </div>
          <div
            className={`sidebar-subitem ${ws.id === workspace.id ? "active-subitem" : ""}`}
            onClick={() => navTo("/members", { workspace: ws, teamWorkspaces: teamWs, personalWorkspaces: personalWs })}
          >
            <UsersRound className="subitem-icon" size={14} /> Members
          </div>
          <div className="sidebar-subitem" onClick={() => navTo("/settings", { workspace: ws, teamWorkspaces: teamWs, personalWorkspaces: personalWs })}>
            <Settings className="subitem-icon" size={14} /> Setting
          </div>
        </div>
      </div>
    ));

  const owner = members.find((m) => m.role === "OWNER");
  const memberSlotsLeft = Math.max(20 - members.length, 0);

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
              <Home size={15} />
              <span>Home</span>
            </div>
            <div className="sidebar-nav-item active">
              <UsersRound className="nav-icon" size={15} />
              <span>Members</span>
            </div>
            <button className="join-btn" onClick={() => setJoinOpen(true)}>워크스페이스 참여 !</button>
          </div>
        </aside>

        <main className="member-main">
          <section className="member-hero-panel">
            <div>
              <p className="member-hero-eyebrow">WORKSPACE MEMBERS</p>
              <h1>{workspace.name}</h1>
              <p>팀원이 어떤 역할로 참여하고 있는지 한눈에 확인하고 초대할 수 있습니다.</p>
            </div>
            <div className="member-hero-actions">
              <button
                className="invite-btn"
                onClick={() => { setInviteOpen(true); setLinkCopied(false); setInviteEmail(""); setSearchResult(null); setSearchError(""); }}
              >
                <UserPlus size={16} />
                초대하기
              </button>
            </div>
          </section>

          <div className="member-summary-grid">
            <div className="member-summary-card">
              <UsersRound size={19} />
              <strong>{members.length}</strong>
              <span>현재 멤버</span>
            </div>
            <div className="member-summary-card">
              <Crown size={19} />
              <strong>{owner?.name ?? "-"}</strong>
              <span>워크스페이스 소유자</span>
            </div>
            <div className="member-summary-card">
              <UserPlus size={19} />
              <strong>{memberSlotsLeft}</strong>
              <span>초대 가능 인원</span>
            </div>
          </div>

          <div className="member-header-row">
            <h2 className="member-title">
              멤버 <span className="member-count">{members.length} / 20</span>
            </h2>
          </div>

          <div className="member-section">
            <div className="member-section-top">
              <span className="member-section-label">멤버 목록</span>
            </div>

            <input
              className="member-search"
              placeholder="이름 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="member-list">
              {[...members]
                .sort((a, b) => (a.role === "OWNER" ? -1 : b.role === "OWNER" ? 1 : 0))
                .filter((m) => m.name.includes(search))
                .map((m) => {
                  const isOwner = members.find((x) => x.userId === userId)?.role === "OWNER";
                  const isMe = m.userId === userId;
                  return (
                    <div key={m.userId} className="member-row">
                      <div className="member-avatar" />
                      <div className="member-info">
                        <span className="member-name">
                          {m.name}
                          {m.role === "OWNER" && <span className="member-owner-badge">팀장</span>}
                        </span>
                        <span className="member-last">{m.role === "OWNER" ? "소유자" : "멤버"}</span>
                      </div>
                      <div className="member-actions">
                        {isOwner && !isMe ? (
                          /* 팀장이 다른 팀원 볼 때 */
                          <>
                            <button className="role-btn">권한 부여하기</button>
                            <button
                              className="leave-btn kick-btn"
                              onClick={async () => {
                                if (!window.confirm(`${m.name}님을 내보내시겠습니까?`)) return;
                                try {
                                  await client.delete(`/workspaces/${workspace.id}/members/${m.userId}`);
                                  setMembers((prev) => prev.filter((x) => x.userId !== m.userId));
                                } catch (err) {
                                  console.error("내보내기 실패", err);
                                  alert("내보내기에 실패했습니다.");
                                }
                              }}
                            >내보내기</button>
                            <button className="copy-id-btn" title="ID 복사" onClick={handleCopyId}>{copied ? "✓" : "ID"}</button>
                          </>
                        ) : isMe && !isOwner ? (
                          /* 팀원이 본인 칸 볼 때 */
                          <>
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
                            <button
                              className="leave-btn"
                              onClick={async () => {
                                if (!window.confirm("워크스페이스에서 나가시겠습니까?")) return;
                                try {
                                  await client.delete(`/workspaces/${workspace.id}/members/${userId}`);
                                  navigate("/workspace");
                                } catch {
                                  alert("나가기에 실패했습니다.");
                                }
                              }}
                            >나가기</button>
                            <button className="copy-id-btn" onClick={handleCopyId} title="ID 복사">{copied ? "✓" : "ID"}</button>
                          </>
                        ) : isMe && isOwner ? (
                          /* 팀장이 본인 칸 볼 때 */
                          <>
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
                            <button className="copy-id-btn" title="ID 복사" onClick={handleCopyId}>{copied ? "✓" : "ID"}</button>
                          </>
                        ) : (
                          /* 팀원이 팀장 or 다른 팀원 볼 때 */
                          <button className="copy-id-btn" title="ID 복사" onClick={handleCopyId}>{copied ? "✓" : "ID"}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </main>
      </div>
      {joinOpen && <JoinModal onClose={() => setJoinOpen(false)} />}

      {inviteOpen && (
        <div className="modal-overlay" onClick={() => { setInviteOpen(false); setInviteEmail(""); setSearchResult(null); setSearchError(""); }}>
          <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
            <button className="invite-modal-close" onClick={() => { setInviteOpen(false); setInviteEmail(""); setSearchResult(null); setSearchError(""); }}>✕</button>
            <h3 className="invite-modal-title">워크 스페이스 초대하기</h3>
            <input
              className="invite-email-input"
              placeholder="이메일 검색"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setSearchResult(null); setSearchError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleInviteSearch(); }}
            />
            {searchResult && (
              <div className="invite-search-result">
                <div className="invite-result-avatar" />
                <div className="invite-result-info">
                  <span className="invite-result-name">{searchResult.name}</span>
                  <span className="invite-result-email">{searchResult.email}</span>
                </div>
                <button
                  className="invite-result-add-btn"
                  onClick={async () => {
                    const inviterId = localStorage.getItem("userId") ?? "";
                    try {
                      await client.post(`/invitations?inviterId=${inviterId}&inviteeId=${searchResult.userId}&workspaceId=${workspace.id}`);
                      setInviteSentMsg(`${searchResult.name}님께 초대를 보냈습니다.`);
                      setTimeout(() => setInviteSentMsg(""), 3000);
                    } catch {
                      setInviteSentMsg("초대 전송에 실패했습니다.");
                      setTimeout(() => setInviteSentMsg(""), 3000);
                    }
                  }}
                >+</button>
              </div>
            )}
            {searchError && <p className="invite-search-error">{searchError}</p>}
            {inviteSentMsg && (
              <div className="invite-sent-toast">
                <span className="invite-sent-icon">✓</span>
                {inviteSentMsg}
              </div>
            )}
            <div className="invite-modal-footer">
              <button
                className="invite-link-btn"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/join?workspaceId=${workspace.id}`);
                  setLinkCopied(true);
                }}
              >
                초대 링크 복사
              </button>
              {linkCopied && <span className="invite-link-copied">복사 완료!</span>}
              <button className="invite-search-btn" onClick={handleInviteSearch}>
                검색
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
