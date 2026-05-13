import "./WorkspaceTabBar.css";

type Tab = "planner" | "community" | "board" | "personal";

interface Props {
  active?: Tab;
  onTabChange?: (tab: Tab) => void;
}

export default function WorkspaceTabBar({ active, onTabChange }: Props) {
  return (
    <div className="wtb-wrap">
      <button className={`wtb-tab ${active === "planner" ? "active" : ""}`} onClick={() => onTabChange?.("planner")}>
        📅 플래너
      </button>
      <button className={`wtb-tab ${active === "community" ? "active" : ""}`} onClick={() => onTabChange?.("community")}>
        💬 커뮤
      </button>
      <button className={`wtb-tab ${active === "board" ? "active" : ""}`} onClick={() => onTabChange?.("board")}>
        🖥 보드
      </button>
      <button className={`wtb-tab ${active === "personal" ? "active" : ""}`} onClick={() => onTabChange?.("personal")}>
        개인 워크스페이스
      </button>
    </div>
  );
}
