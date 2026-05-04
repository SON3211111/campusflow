import Header from "../components/Header";
import "./WorkspaceList.css";

const teamWorkspaces = [
  { id: 1, name: "ㅁㄴㅇㄹ", gradient: "linear-gradient(135deg, #74aaff, #a8d0ff)", starred: true },
  { id: 2, name: "asdf", gradient: "linear-gradient(135deg, #ff7070, #ffb0b0)", starred: true },
];

const favorites = [
  { id: 1, name: "ㅁㄴㅇㄹ", gradient: "linear-gradient(135deg, #74aaff, #a8d0ff)", starred: true },
];

export default function WorkspaceList() {
  return (
    <div className="workspace-page">
      <Header />

      <div className="workspace-body">
        {/* 사이드바 */}
        <aside className="sidebar">
          <div className="sidebar-menu-icon">≡</div>
          <div className="sidebar-section">
            <p className="sidebar-label">팀 워크스페이스</p>
            {teamWorkspaces.map((ws) => (
              <div key={ws.id} className="sidebar-item">
                <div className="sidebar-item-icon" style={{ background: ws.gradient }}>
                  {ws.name[0]}
                </div>
                <span>{ws.name}</span>
              </div>
            ))}
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">개인 워크스페이스</p>
          </div>

          <div className="sidebar-bottom">
            <div className="sidebar-nav-item">
              <span className="nav-icon">🏠</span>
              <span>Home</span>
            </div>
            <div className="sidebar-nav-item active">
              <span className="nav-icon">🖥</span>
              <span>Board</span>
            </div>
            <button className="join-btn">워크스페이스 참여</button>
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="main-content">
          {/* 팀 워크스페이스 */}
          <section className="ws-section">
            <h3 className="section-title">팀 Work Space</h3>
            <div className="card-grid">
              {teamWorkspaces.map((ws) => (
                <div key={ws.id} className="ws-card">
                  <div className="card-thumb" style={{ background: ws.gradient }}>
                    {ws.starred && <span className="star">★</span>}
                    <div className="card-label">{ws.name}</div>
                  </div>
                </div>
              ))}
              <div className="ws-card new-card">
                <div className="card-thumb gray-thumb">
                  <span className="new-label">새로 만들기</span>
                </div>
              </div>
            </div>
          </section>

          <hr className="divider" />

          {/* 개인 워크스페이스 */}
          <section className="ws-section">
            <h3 className="section-title">개인 Work Space</h3>
            <div className="card-grid">
              <div className="ws-card new-card">
                <div className="card-thumb gray-thumb">
                  <span className="new-label">새로 만들기</span>
                </div>
              </div>
            </div>
          </section>

          <hr className="divider" />

          {/* 즐겨찾기 */}
          <section className="ws-section">
            <h3 className="section-title">즐겨찾기</h3>
            <div className="card-grid">
              {favorites.map((ws) => (
                <div key={ws.id} className="ws-card">
                  <div className="card-thumb" style={{ background: ws.gradient }}>
                    {ws.starred && <span className="star">★</span>}
                    <div className="card-label">{ws.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      <button className="settings-btn">⚙</button>
    </div>
  );
}
