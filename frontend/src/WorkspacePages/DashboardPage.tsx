import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
import "./DashboardPage.css";

interface Workspace {
  id: number;
  name: string;
  gradient: string;
}

const R = 35;
const CIRC = 2 * Math.PI * R;

function arc(value: number, offset: number, total: number) {
  const dash = (value / total) * CIRC;
  return { strokeDasharray: `${dash} ${CIRC}`, strokeDashoffset: -offset };
}

const ACTIVITY = [
  { icon: "👥", type: "참여함", desc: "OOO님이 참여하였습니다." },
  { icon: "▶", type: "시작됨", desc: "OO님 태스크 작업이 시작되었습니다." },
  { icon: "✓", type: "완료됨", desc: "OO미마다 작업이 완료되었습니다." },
];


export default function DashboardPage() {
  const { state } = useLocation() as {
    state: { workspace?: Workspace; workspaces?: Workspace[] };
  };

  const savedWs   = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
  const workspace = state?.workspace ?? state?.workspaces?.[0] ?? savedWs;
  const workspaces = state?.workspaces ?? [];
  const wsName    = workspace?.name ?? "워크스페이스";
  const userName  = localStorage.getItem("userName") ?? "나";
  const GRAPH     = [{ name: userName, value: 50 }];

  const savedStats = JSON.parse(localStorage.getItem("board_stats") ?? "null");
  const DONUT = {
    progress:   savedStats?.inProgress  ?? 0,
    done:       savedStats?.done        ?? 0,
    hold:       savedStats?.hold        ?? 0,
    notStarted: savedStats?.notStarted  ?? 0,
  };
  const TOTAL = DONUT.progress + DONUT.done + DONUT.hold + DONUT.notStarted || 1;

  const doneDash        = arc(DONUT.done,       0,                                                           TOTAL);
  const progressDash    = arc(DONUT.progress,   (DONUT.done / TOTAL) * CIRC,                                TOTAL);
  const holdDash        = arc(DONUT.hold,       ((DONUT.done + DONUT.progress) / TOTAL) * CIRC,             TOTAL);
  const notStartedDash  = arc(DONUT.notStarted, ((DONUT.done + DONUT.progress + DONUT.hold) / TOTAL) * CIRC, TOTAL);

  return (
    <div className="dbp-page">
      <Header workspaces={workspaces} />
      <BoardSubHeader wsName={wsName} memberCount={1} workspace={workspace} workspaces={workspaces} initialSelected="Dash Board" />

      <div className="dbp-body" style={{ background: workspace?.gradient ?? "#f0f2f8" }}>

        {/* 상단: Task 진행상황 + 활동로그 */}
        <div className="dbp-top-row">

          {/* Task 진행상황 */}
          <div className="dbp-card">
            <h3 className="dbp-card-title">Task 진행상황</h3>
            <div className="dbp-donut-area">
              <svg viewBox="0 0 100 100" className="dbp-donut-svg">
                <circle cx="50" cy="50" r={R} fill="none" stroke="#e8e8e8" strokeWidth="14" />
                <circle cx="50" cy="50" r={R} fill="none" stroke="#7de89a" strokeWidth="14"
                  strokeDasharray={doneDash.strokeDasharray}
                  strokeDashoffset={doneDash.strokeDashoffset}
                  strokeLinecap="butt" />
                <circle cx="50" cy="50" r={R} fill="none" stroke="#6ab4f8" strokeWidth="14"
                  strokeDasharray={progressDash.strokeDasharray}
                  strokeDashoffset={progressDash.strokeDashoffset}
                  strokeLinecap="butt" />
                <circle cx="50" cy="50" r={R} fill="none" stroke="#f8d08a" strokeWidth="14"
                  strokeDasharray={holdDash.strokeDasharray}
                  strokeDashoffset={holdDash.strokeDashoffset}
                  strokeLinecap="butt" />
                <circle cx="50" cy="50" r={R} fill="none" stroke="#aaa" strokeWidth="14"
                  strokeDasharray={notStartedDash.strokeDasharray}
                  strokeDashoffset={notStartedDash.strokeDashoffset}
                  strokeLinecap="butt" />
                <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#333"
                  transform="rotate(90 50 50)">{DONUT.progress + DONUT.done + DONUT.hold + DONUT.notStarted}</text>
              </svg>
            </div>
            <div className="dbp-stat-list">
              <div className="dbp-stat-row">
                <span className="dbp-stat-dot" style={{ background: "#aaa" }} />
                <span className="dbp-stat-label">시작하지 않음</span>
                <span className="dbp-stat-val">{DONUT.notStarted}건</span>
              </div>
              <div className="dbp-stat-row">
                <span className="dbp-stat-dot" style={{ background: "#6ab4f8" }} />
                <span className="dbp-stat-label">진행중</span>
                <span className="dbp-stat-val">{DONUT.progress}건</span>
              </div>
              <div className="dbp-stat-row">
                <span className="dbp-stat-dot" style={{ background: "#7de89a" }} />
                <span className="dbp-stat-label">완료</span>
                <span className="dbp-stat-val">{DONUT.done}건</span>
              </div>
              <div className="dbp-stat-row">
                <span className="dbp-stat-dot" style={{ background: "#f8d08a" }} />
                <span className="dbp-stat-label">보류</span>
                <span className="dbp-stat-val">{DONUT.hold}건</span>
              </div>
            </div>
          </div>

          {/* 활동 로그 */}
          <div className="dbp-card dbp-activity-card">
            <div className="dbp-activity-header">
              <h3 className="dbp-card-title" style={{ margin: 0 }}>① 활동로그</h3>
              <span className="dbp-activity-user-label">유저</span>
            </div>
            <div className="dbp-timeline">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="dbp-timeline-item">
                  <div className="dbp-timeline-left">
                    <div className="dbp-timeline-icon">{a.icon}</div>
                    {i < ACTIVITY.length - 1 && <div className="dbp-timeline-line" />}
                  </div>
                  <div className="dbp-timeline-content">
                    <span className="dbp-timeline-type">{a.type}</span>
                    <span className="dbp-timeline-desc">{a.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 하단: 그라프 목록 */}
        <div className="dbp-card dbp-graph-card">
          <h3 className="dbp-card-title">그래프 목록</h3>
          <div className="dbp-graph-list">
            {GRAPH.map((g) => (
              <div key={g.name} className="dbp-graph-row">
                <span className="dbp-graph-name">{g.name}</span>
                <div className="dbp-graph-track">
                  <div className="dbp-graph-fill" style={{ width: `${g.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단: 팀 기간 + 마감 임박 */}
        <div className="dbp-bottom-row">

          {/* 팀 기간 */}
          <div className="dbp-card">
            <h3 className="dbp-card-title">팀 기간</h3>
            <div className="dbp-bar-chart">
              <div className="dbp-bar-grid">
                {[100, 75, 50, 25].map((v) => (
                  <div key={v} className="dbp-grid-line">
                    <span className="dbp-grid-label">{v}</span>
                  </div>
                ))}
              </div>
              <div className="dbp-bars">
                {[
                  { name: userName, done: 60, progress: 25, hold: 15 },
                ].map((m) => (
                  <div key={m.name} className="dbp-bar-col">
                    <div className="dbp-bar-track">
                      <div className="dbp-bar-seg hold"   style={{ height: `${m.hold}%` }} />
                      <div className="dbp-bar-seg progress" style={{ height: `${m.progress}%` }} />
                      <div className="dbp-bar-seg done"   style={{ height: `${m.done}%` }} />
                    </div>
                    <div className="dbp-bar-avatar">{m.name[0]}</div>
                    <span className="dbp-bar-name">{m.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="dbp-bar-legend">
              <span className="dbp-legend-item"><span className="dbp-dot" style={{ background: "#7de89a" }} />완료</span>
              <span className="dbp-legend-item"><span className="dbp-dot" style={{ background: "#6ab4f8" }} />진행중</span>
              <span className="dbp-legend-item"><span className="dbp-dot" style={{ background: "#f8d08a" }} />보류</span>
            </div>
          </div>

          {/* 마감 임박 */}
          <div className="dbp-card">
            <h3 className="dbp-card-title">마감 임박</h3>

            <div className="dbp-warning">⚠️ 경보</div>
            <div className="dbp-dl-row">
              <span className="dbp-dl-name">예시</span>
              <div className="dbp-dl-bar"><div className="dbp-dl-fill striped" style={{ width: "95%" }} /></div>
            </div>
            <div className="dbp-dl-row">
              <span className="dbp-dl-name">예시</span>
              <div className="dbp-dl-bar"><div className="dbp-dl-fill striped" style={{ width: "72%" }} /></div>
            </div>

            <div className="dbp-dl-divider" />

            <div className="dbp-request-row">
              <span className="dbp-request-num">2</span>
              <span className="dbp-request-label">보통</span>
            </div>
            <div className="dbp-dl-row">
              <span className="dbp-dl-name">예시</span>
              <div className="dbp-dl-bar"><div className="dbp-dl-fill" style={{ width: "40%" }} /></div>
            </div>
          </div>

        </div>

      </div>

      <WorkspaceTabBar active="board" />
    </div>
  );
}
