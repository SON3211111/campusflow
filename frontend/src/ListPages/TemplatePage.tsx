import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, LayoutDashboard, Search, Settings, UsersRound } from "lucide-react";
import Header from "../components/Header";
import JoinModal from "../components/JoinModal";
import client from "../api/client";
import "./WorkspaceList.css";
import "./TemplatePage.css";

interface Workspace {
  id: string;
  name: string;
  gradient: string;
  starred?: boolean;
}

const TEMPLATES = [
  { id: 1,  name: "초원",            category: "풍경",   bg: "linear-gradient(180deg,#87ceeb 20%,#90ee90 65%,#228b22 100%)" },
  { id: 2,  name: "밤 하늘",         category: "풍경",   bg: "linear-gradient(180deg,#0d0d2b 0%,#1a1a4e 60%,#0f0c29 100%)" },
  { id: 3,  name: "오로라",          category: "풍경",   bg: "linear-gradient(135deg,#0f172a 0%,#164e63 45%,#14b8a6 100%)" },
  { id: 4,  name: "핑크 그라데이션", category: "디자인", bg: "linear-gradient(135deg,#f0abfc 0%,#c084fc 50%,#a78bfa 100%)" },
  { id: 5,  name: "벚꽃 산책",       category: "인기",   bg: "linear-gradient(135deg,#fbc2eb 0%,#f8d9e9 48%,#a6c1ee 100%)" },
  { id: 6,  name: "레몬 소다",       category: "디자인", bg: "linear-gradient(135deg,#fef3c7 0%,#fde68a 45%,#86efac 100%)" },
  { id: 7,  name: "라벤더 노트",     category: "인기",   bg: "linear-gradient(135deg,#ddd6fe 0%,#c4b5fd 50%,#a5b4fc 100%)" },
  { id: 8,  name: "복숭아 아이스티", category: "디자인", bg: "linear-gradient(135deg,#fed7aa 0%,#fda4af 52%,#f9a8d4 100%)" },
  { id: 9,  name: "바다 유리",       category: "풍경",   bg: "linear-gradient(135deg,#bae6fd 0%,#67e8f9 45%,#2dd4bf 100%)" },
  { id: 10, name: "캠퍼스 블루",     category: "인기",   bg: "linear-gradient(135deg,#bfdbfe 0%,#60a5fa 48%,#6366f1 100%)" },
  { id: 11, name: "민트 초코",       category: "디자인", bg: "linear-gradient(135deg,#99f6e4 0%,#5eead4 50%,#475569 100%)" },
  { id: 12, name: "노을",            category: "풍경",   bg: "linear-gradient(135deg,#fb923c 0%,#f472b6 52%,#7c3aed 100%)" },
  { id: 13, name: "구름 라떼",       category: "풍경",   bg: "linear-gradient(135deg,#e0f2fe 0%,#e2e8f0 55%,#cbd5e1 100%)" },
  { id: 14, name: "딸기 우유",       category: "인기",   bg: "linear-gradient(135deg,#ffe4e6 0%,#fda4af 52%,#fb7185 100%)" },
  { id: 15, name: "말차 크림",       category: "디자인", bg: "linear-gradient(135deg,#ecfccb 0%,#bef264 48%,#65a30d 100%)" },
  { id: 16, name: "보라빛 새벽",     category: "풍경",   bg: "linear-gradient(135deg,#312e81 0%,#7c3aed 48%,#c4b5fd 100%)" },
  { id: 17, name: "코튼 캔디",       category: "인기",   bg: "linear-gradient(135deg,#bae6fd 0%,#e9d5ff 50%,#fbcfe8 100%)" },
  { id: 18, name: "오렌지 팝",       category: "디자인", bg: "linear-gradient(135deg,#fdba74 0%,#fb923c 48%,#ef4444 100%)" },
  { id: 19, name: "도서관 우드",     category: "마케팅", bg: "linear-gradient(135deg,#d6b58c 0%,#a16207 52%,#713f12 100%)" },
  { id: 20, name: "새벽 공부",       category: "마케팅", bg: "linear-gradient(135deg,#172554 0%,#1d4ed8 52%,#38bdf8 100%)" },
  { id: 21, name: "포레스트",        category: "풍경",   bg: "linear-gradient(135deg,#14532d 0%,#16a34a 52%,#86efac 100%)" },
  { id: 22, name: "자몽 에이드",     category: "디자인", bg: "linear-gradient(135deg,#fecdd3 0%,#fb7185 48%,#f97316 100%)" },
  { id: 23, name: "은하수",          category: "풍경",   bg: "linear-gradient(135deg,#111827 0%,#312e81 48%,#9333ea 100%)" },
  { id: 24, name: "화이트 모카",     category: "마케팅", bg: "linear-gradient(135deg,#fafaf9 0%,#e7e5e4 52%,#d6d3d1 100%)" },
  { id: 25, name: "체리 콜라",       category: "디자인", bg: "linear-gradient(135deg,#881337 0%,#e11d48 50%,#fb7185 100%)" },
  { id: 26, name: "블루베리 요거트", category: "인기",   bg: "linear-gradient(135deg,#c7d2fe 0%,#818cf8 50%,#6366f1 100%)" },
  { id: 27, name: "비 오는 날",      category: "풍경",   bg: "linear-gradient(135deg,#334155 0%,#64748b 50%,#cbd5e1 100%)" },
  { id: 28, name: "라임 스파클",     category: "디자인", bg: "linear-gradient(135deg,#d9f99d 0%,#84cc16 50%,#22c55e 100%)" },
  { id: 29, name: "플럼 와인",       category: "마케팅", bg: "linear-gradient(135deg,#4c1d95 0%,#7e22ce 50%,#db2777 100%)" },
  { id: 30, name: "살구빛 오후",     category: "인기",   bg: "linear-gradient(135deg,#ffedd5 0%,#fdba74 52%,#fb7185 100%)" },

  // 파스텔 카테고리
  { id: 31, name: "아기 블루",       category: "파스텔", bg: "linear-gradient(135deg,#dbeafe 0%,#bfdbfe 50%,#e0f2fe 100%)" },
  { id: 32, name: "연보라 안개",     category: "파스텔", bg: "linear-gradient(135deg,#ede9fe 0%,#ddd6fe 50%,#e9d5ff 100%)" },
  { id: 33, name: "쑥 라떼",         category: "파스텔", bg: "linear-gradient(135deg,#d1fae5 0%,#bbf7d0 50%,#d1fae5 100%)" },
  { id: 34, name: "샌드 베이지",     category: "파스텔", bg: "linear-gradient(135deg,#fef9ee 0%,#fef3c7 50%,#fde8c8 100%)" },
  { id: 35, name: "코랄 블러쉬",     category: "파스텔", bg: "linear-gradient(135deg,#fce7f3 0%,#fecdd3 50%,#fee2e2 100%)" },
  { id: 36, name: "카모마일",        category: "파스텔", bg: "linear-gradient(135deg,#fefce8 0%,#fef9c3 50%,#ecfccb 100%)" },
  { id: 37, name: "실크 로즈",       category: "파스텔", bg: "linear-gradient(135deg,#fdf2f8 0%,#fce7f3 50%,#fdd5e5 100%)" },
  { id: 38, name: "파우더 민트",     category: "파스텔", bg: "linear-gradient(135deg,#ecfdf5 0%,#d1fae5 50%,#e0f2fe 100%)" },
  { id: 39, name: "버터 크림",       category: "파스텔", bg: "linear-gradient(135deg,#fffbeb 0%,#fef3c7 50%,#fde8d8 100%)" },
  { id: 40, name: "모브 핑크",       category: "파스텔", bg: "linear-gradient(135deg,#f5f3ff 0%,#ede9fe 48%,#fce7f3 100%)" },
  { id: 41, name: "소프트 피치",     category: "파스텔", bg: "linear-gradient(135deg,#fff7ed 0%,#ffedd5 50%,#fce7f3 100%)" },
  { id: 42, name: "블루밍 라일락",   category: "파스텔", bg: "linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 45%,#ede9fe 100%)" },
  { id: 43, name: "밀크티",          category: "파스텔", bg: "linear-gradient(135deg,#fafaf9 0%,#fef3c7 50%,#f5f0eb 100%)" },
  { id: 44, name: "수채화 하늘",     category: "파스텔", bg: "linear-gradient(135deg,#e0f7fa 0%,#b3e5fc 45%,#e8eaf6 100%)" },
  { id: 45, name: "봄 안개",         category: "파스텔", bg: "linear-gradient(135deg,#fce4ec 0%,#f8bbd9 45%,#e1bee7 100%)" },
];

const CATEGORIES = ["인기", "파스텔", "풍경", "마케팅", "디자인"];

export default function TemplatePage() {
  const { state } = useLocation() as {
    state: { workspace: Workspace; teamWorkspaces: Workspace[]; personalWorkspaces: Workspace[] };
  };
  const navigate = useNavigate();

  const savedWs    = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
  const workspace  = state?.workspace ?? savedWs ?? { id: "", name: "워크스페이스", gradient: "#ccc" };
  const teamWs     = state?.teamWorkspaces     ?? [];
  const personalWs = state?.personalWorkspaces ?? [];
  const allWorkspaces = [...teamWs, ...personalWs];

  const [expandedId, setExpandedId]       = useState<string>(workspace.id);
  const [catOpen, setCatOpen]             = useState(false);
  const [joinOpen, setJoinOpen]           = useState(false);
  const [selectedCat, setSelectedCat]     = useState<string>("전체");
  const [search, setSearch]               = useState("");
  const [applying, setApplying]           = useState(false);
  const [selectedGradient, setSelectedGradient] = useState<string | null>(null);

  const toggleSidebar = (id: string) =>
    setExpandedId((prev) => (prev === id ? "" : id));

  const navState = (ws: Workspace) => ({
    workspace: ws,
    teamWorkspaces: teamWs,
    personalWorkspaces: personalWs,
  });

  const handleApplyTemplate = async (gradient: string) => {
    const updated = { ...workspace, gradient };
    localStorage.setItem("clickedWorkspace", JSON.stringify(updated));
    if (workspace.id) {
      localStorage.setItem(`ws_gradient_${workspace.id}`, gradient);
    }

    if (workspace.id) {
      setApplying(true);
      try {
        await client.patch(`/workspaces/${workspace.id}`, {
          name: workspace.name,
          gradient,
        });
      } catch {
        // 로컬에 저장됨 - API 실패해도 계속 진행
      } finally {
        setApplying(false);
      }
    }

    navigate("/workspace-board", { state: { workspace: updated, workspaces: allWorkspaces } });
  };

  const renderSidebarItems = (list: Workspace[]) =>
    list.map((ws) => (
      <div key={ws.id}>
        <div className="sidebar-item" onClick={() => toggleSidebar(ws.id)}>
          <div className="sidebar-item-icon" style={{ background: ws.gradient }}>
            {ws.name[0]}
          </div>
          <span className="sidebar-item-name">{ws.name}</span>
          <span className={`sidebar-arrow ${expandedId === ws.id ? "open" : ""}`}>▾</span>
        </div>
        <div className={`sidebar-submenu ${expandedId === ws.id ? "open" : ""}`}>
          <div className="sidebar-subitem" onClick={() => navigate("/workspace-board", { state: { workspace: ws, workspaces: allWorkspaces } })}>
            <LayoutDashboard className="subitem-icon" size={14} /> Board
          </div>
          <div className="sidebar-subitem" onClick={() => navigate("/members", { state: navState(ws) })}>
            <UsersRound className="subitem-icon" size={14} /> Members
          </div>
          <div className="sidebar-subitem" onClick={() => navigate("/settings", { state: navState(ws) })}>
            <Settings className="subitem-icon" size={14} /> Setting
          </div>
        </div>
      </div>
    ));

  return (
    <div className="workspace-page">
      <Header workspaces={allWorkspaces} />

      <div className="workspace-body">
        <aside className="sidebar">
          <div className="sidebar-menu-icon">≡</div>

          <div className="sidebar-section">
            <p className="sidebar-label">팀 워크스페이스</p>
            {renderSidebarItems(teamWs)}
          </div>

          <hr className="sidebar-divider" />

          <div className="sidebar-section">
            <p className="sidebar-label">개인 워크스페이스</p>
            {renderSidebarItems(personalWs)}
          </div>

          <div className="sidebar-bottom">
            <hr className="sidebar-divider" />
            <div className="sidebar-nav-item" onClick={() => navigate("/workspace")}>
              <Home size={15} />
              <span>Home</span>
            </div>
            <div className="sidebar-nav-item active">
              <LayoutDashboard className="nav-icon" size={15} />
              <span>Board</span>
            </div>
            <button className="join-btn" onClick={() => setJoinOpen(true)}>워크스페이스 참여 !</button>
          </div>
        </aside>

        <main className="template-main">
          <div className="template-top-bar">
            <h2 className="template-page-title">전체 템플릿</h2>
            <div className="template-apply-bar">
              {selectedGradient && (
                <div className="template-preview-chip" style={{ background: selectedGradient }} />
              )}
              <button
                className="template-apply-btn"
                disabled={!selectedGradient || applying}
                onClick={() => selectedGradient && handleApplyTemplate(selectedGradient)}
              >
                {applying ? "적용 중..." : "적용하기"}
              </button>
            </div>
            <div className="template-search-wrap">
              <input
                className="template-search"
                placeholder="검색하여 찾기"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search className="template-search-icon" size={16} />
            </div>
          </div>


          <div className="template-filter-bar">
            <span className="template-filter-label">카테고리</span>
            <div className="template-cat-wrap">
              <button
                className="template-cat-btn"
                onClick={() => setCatOpen((v) => !v)}
              >
                {selectedCat} ▾
              </button>
              {catOpen && (
                <div className="template-cat-dropdown">
                  {["전체", ...CATEGORIES].map((cat) => (
                    <div
                      key={cat}
                      className={`template-cat-item ${selectedCat === cat ? "active" : ""}`}
                      onClick={() => { setSelectedCat(cat); setCatOpen(false); }}
                    >
                      {cat}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <hr className="template-page-divider" />

          <div className="template-grid-full">
            {TEMPLATES
              .filter((t) => selectedCat === "전체" || t.category === selectedCat)
              .filter((t) => t.name.includes(search))
              .map((t) => (
              <div
                key={t.id}
                className={`template-card-full ${selectedGradient === t.bg ? "selected" : ""}`}
                style={{ cursor: applying ? "wait" : "pointer" }}
                onClick={() => !applying && setSelectedGradient(t.bg)}
              >
                <div className="template-thumb-full" style={{ background: t.bg }} />
                <span className="template-name-full">{t.name}</span>
                <span className="template-apply-hint">
                  {selectedGradient === t.bg ? "선택됨 ✓" : "클릭하여 선택"}
                </span>
              </div>
            ))}
          </div>
        </main>
      </div>
      {joinOpen && <JoinModal onClose={() => setJoinOpen(false)} />}
    </div>
  );
}
