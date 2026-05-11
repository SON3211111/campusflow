import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";

interface WorkspaceItem {
  id: number;
  name: string;
  gradient: string;
}

interface HeaderProps {
  workspaces?: WorkspaceItem[];
}

export default function Header({ workspaces = [] }: HeaderProps) {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') ?? '사용자';
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? workspaces.filter((ws) => ws.name.includes(query))
    : [];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="header">
      <div className="header-logo" onClick={() => navigate("/")}>CAMPUS_FLOW</div>

      <div className="header-search" ref={searchRef}>
        <div className="search-input-wrap">
          <input
            type="text"
            placeholder=""
            className="search-input"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
          />
          {open && filtered.length > 0 && (
            <div className="search-dropdown">
              <p className="search-dropdown-category">Board</p>
              {filtered.map((ws) => (
                <div key={ws.id} className="search-result-item">
                  <div className="search-result-thumb" style={{ background: ws.gradient }} />
                  <span className="search-result-name">{ws.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="header-create-btn">Create</button>
      </div>

      <div className="header-right">
        <div className="header-myprojects">
          <span className="grid-icon">⊞</span>
          <span>My projects</span>
        </div>
        <button className="header-icon-btn">🔔</button>
        <div className="header-user">
          <div className="user-avatar"></div>
          <span>{userName}</span>
          <span className="dropdown-arrow">▾</span>
        </div>
      </div>
    </header>
  );
}
