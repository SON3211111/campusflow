/**
 * 워크스페이스 보드 상단 서브헤더 컴포넌트
 * 뷰 전환 드롭다운(Board/AI Task/Dash Board 등)과 멤버 아바타 표시
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import "./BoardSubHeader.css";

interface Member { userId: string; name: string; }

interface Props {
  wsName?: string;
  memberCount?: number;
  members?: Member[];
  workspace?: { id: string; name: string; gradient: string };
  workspaces?: { id: string; name: string; gradient: string }[];
  initialSelected?: string;
  onAiTaskClick?: () => void;
}

const MENU_ITEMS = ["Board", "AI Task", "Dash Board", "Calender", "Notification", "Task Board", "Setting"];

const AVATAR_COLORS = ["#a89cf8", "#6ab4f8", "#7de89a", "#f8b4b4", "#f8d08a"];

export default function BoardSubHeader({ wsName = "워크스페이스", members = [], workspace, workspaces = [], initialSelected = "Board", onAiTaskClick }: Props) {
  const userName = localStorage.getItem("userName") ?? "나";
  const MAX_SHOW = 3;
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
            <LayoutDashboard className="bsh-view-icon" size={15} />
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
                    if (item === "Board") navigate("/workspace-board", { state: { workspace, workspaces } });
                    if (item === "AI Task") { if (onAiTaskClick) onAiTaskClick(); else navigate("/ai-task", { state: { workspace, workspaces } }); }
                    if (item === "Dash Board") navigate("/dashboard", { state: { workspace, workspaces } });
                    if (item === "Notification") navigate("/notifications", { state: { workspace, workspaces } });
                    if (item === "Setting") navigate("/settings", { state: { workspace, workspaces } });
                    if (item === "Calender" || item === "Task Board") navigate("/workspace-board", { state: { workspace, workspaces } });
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
          {members.length > 0 ? (
            <>
              {members.slice(0, MAX_SHOW).map((m, i) => (
                <div
                  key={m.userId}
                  className="bsh-avatar"
                  title={m.name}
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {m.name[0]}
                </div>
              ))}
              {members.length > MAX_SHOW && (
                <div className="bsh-avatar-more">+{members.length - MAX_SHOW}</div>
              )}
            </>
          ) : (
            <div className="bsh-avatar" title={userName}>{userName[0]}</div>
          )}
        </div>
        <button className="bsh-menu-btn">···</button>
      </div>
    </div>
  );
}
