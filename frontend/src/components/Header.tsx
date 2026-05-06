import { useNavigate } from "react-router-dom";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') ?? '사용자';

  return (
    <header className="header">
      <div className="header-logo" onClick={() => navigate("/")}>CAMPUS_FLOW</div>

      <div className="header-search">
        <input type="text" placeholder="" className="search-input" />
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
