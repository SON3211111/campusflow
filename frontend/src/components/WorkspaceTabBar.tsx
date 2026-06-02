/**
 * 워크스페이스 하단 탭바 컴포넌트
 * planner/community/board/My workspace 탭 전환 + 휴지통 버튼(삭제 항목 수 뱃지) 포함
 */
import { CalendarDays, MessageSquare, LayoutGrid, Home, Trash2 } from "lucide-react";
import "./WorkspaceTabBar.css";

type Tab = "planner" | "community" | "board" | "personal";

interface Props {
  active?: Tab;
  onTabChange?: (tab: Tab) => void;
  onTrashClick?: () => void;
  trashCount?: number;
}

export default function WorkspaceTabBar({ active, onTabChange, onTrashClick, trashCount = 0 }: Props) {
  return (
    <div className="wtb-wrap">
      <button className={`wtb-tab ${active === "planner" ? "active" : ""}`} onClick={() => onTabChange?.("planner")}>
        <CalendarDays size={14} /> planner
      </button>
      <button className={`wtb-tab ${active === "community" ? "active" : ""}`} onClick={() => onTabChange?.("community")}>
        <MessageSquare size={14} /> community
      </button>
      <button className={`wtb-tab ${active === "board" ? "active" : ""}`} onClick={() => onTabChange?.("board")}>
        <LayoutGrid size={14} /> board
      </button>
      <button className={`wtb-tab ${active === "personal" ? "active" : ""}`} onClick={() => onTabChange?.("personal")}>
        <Home size={14} /> My workspace
      </button>
      <div className="wtb-divider" />
      <button className="wtb-tab wtb-trash-tab" onClick={onTrashClick} aria-label="휴지통 열기">
        <Trash2 size={14} /> {trashCount > 0 && <span className="wtb-trash-count">{trashCount}</span>}
      </button>
    </div>
  );
}
