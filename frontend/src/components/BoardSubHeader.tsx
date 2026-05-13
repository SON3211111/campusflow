import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./BoardSubHeader.css";

interface Props {
  wsName?: string;
  memberCount?: number;
  workspace?: { id: number; name: string; gradient: string };
  workspaces?: { id: number; name: string; gradient: string }[];
  initialSelected?: string;
}

const MENU_ITEMS = ["Board", "Dash Board", "Calender", "Notification", "Task Board", "Setting"];

export default function BoardSubHeader({ wsName = "워크스페이스", memberCount = 1, workspace, workspaces = [], initialSelected = "Board" }: Props) {
  const userName = localStorage.getItem("userName") ?? "나";
  const navigate = useNavigate();
  const [dropOpen, setDropOpen] = useState(false);
  const [selected, setSelected] = useState(initialSelected);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="bsh-wrap">
      <div className="bsh-left">
        <span className="bsh-ws-name">{wsName} Board</span>
        <div className="bsh-drop-wrap" ref={dropRef}>
          <button className="bsh-view-btn" onClick={() => setDropOpen((v) => !v)}>
            <span className="bsh-view-icon">🖥</span>
            {selected}
            <span className="bsh-chevron">▾</span>
          </button>
          {dropOpen && (
            <div className="bsh-dropdown">
              {MENU_ITEMS.map((item) => (
                <div
                  key={item}
                  className={`bsh-dropdown-item ${selected === item ? "active" : ""}`}
                  onClick={() => {
                    setSelected(item);
                    setDropOpen(false);
                    if (item === "Dash Board") navigate("/dashboard", { state: { workspace, workspaces } });
                    if (item === "Board") navigate("/workspace-board", { state: { workspace, workspaces } });
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bsh-right">
        <div className="bsh-avatars">
          <div className="bsh-avatar" title={userName}>{userName[0]}</div>
          {memberCount > 1 && (
            <div className="bsh-avatar-more">+{memberCount - 1}</div>
          )}
        </div>
        <button className="bsh-menu-btn">···</button>
      </div>
    </div>
  );
}
