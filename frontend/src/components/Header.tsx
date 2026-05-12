import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AITaskModal from "./AITaskModal";
import "./Header.css";

interface WorkspaceItem {
  id: number;
  name: string;
  gradient: string;
}

interface HeaderProps {
  workspaces?: WorkspaceItem[];
  showSearch?: boolean;
  onLogout?: () => void;
}

export default function Header({ workspaces = [], showSearch = true, onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('accessToken');
  const userName = localStorage.getItem('userName') ?? '사용자';
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [aiTaskOpen, setAiTaskOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      <div className="header-logo" onClick={() => navigate("/")}>CAMPUS_FLOW</div>

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
                  <div key={ws.id} className="search-result-item" onClick={() => { setSearchOpen(false); setQuery(''); setAiTaskOpen(true); }}>
                    <div className="search-result-thumb" style={{ background: ws.gradient }} />
                    <span className="search-result-name">{ws.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="header-create-btn">Create</button>
        </div>
      )}

      <div className="header-right">
        {showSearch && (
          <>
            <div className="header-myprojects">
              <span className="grid-icon">⊞</span>
              <span>My projects</span>
            </div>
            <button className="header-icon-btn">🔔</button>
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
