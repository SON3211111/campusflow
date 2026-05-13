import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
import client from "../api/client";
import "./DashboardPage.css";

interface Workspace {
  id: string;
  name: string;
  gradient: string;
}

const R = 35;
const CIRC = 2 * Math.PI * R;

function arc(value: number, offset: number, total: number) {
  const dash = (value / total) * CIRC;
  return { strokeDasharray: `${dash} ${CIRC}`, strokeDashoffset: -offset };
}

export default function DashboardPage() {
  const { state } = useLocation() as {
    state: { workspace?: Workspace; workspaces?: Workspace[] };
  };
  const navigate = useNavigate();

  const savedWs   = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
  const workspace = state?.workspace ?? state?.workspaces?.[0] ?? savedWs;
  const workspaces = state?.workspaces ?? [];
  const wsName    = workspace?.name ?? "워크스페이스";
  const userName  = localStorage.getItem("userName") ?? "나";

  const [donut, setDonut] = useState({ progress: 0, done: 0, hold: 0, notStarted: 0, todo: 0 });

  useEffect(() => {
    if (!workspace?.id) {
      navigate("/workspace", { replace: true });
      return;
    }
    client.get(`/workspaces/${workspace.id}/tasks`)
      .then((res) => {
        const tasks: { status: string }[] = res.data ?? [];
        const counts = { progress: 0, done: 0, hold: 0, notStarted: 0, todo: 0 };
        for (const t of tasks) {
          if (t.status === "DOING")       counts.progress++;
          else if (t.status === "DONE")   counts.done++;
          else if (t.status === "ISSUE")  counts.hold++;
          else if (t.status === "REVIEW") counts.notStarted++;
          else if (t.status === "TODO")   counts.todo++;
        }
        setDonut(counts);
        localStorage.setItem("board_stats", JSON.stringify({
          inProgress: counts.progress,
          done: counts.done,
          hold: counts.hold,
          notStarted: counts.notStarted + counts.todo,
        }));
      })
      .catch(() => {
        const saved = JSON.parse(localStorage.getItem("board_stats") ?? "null");
        if (saved) {
          setDonut({
            progress: saved.inProgress ?? 0,
            done: saved.done ?? 0,
            hold: saved.hold ?? 0,
            notStarted: saved.notStarted ?? 0,
            todo: 0,
          });
        }
      });
  }, [workspace?.id]);

  const total = donut.progress + donut.done + donut.hold + donut.notStarted + donut.todo;
  const activityLog = (() => {
    const log: { icon: string; type: string; desc: string }[] = [];
    if (donut.done > 0)
      log.push({ icon: "✓", type: "완료됨", desc: `${donut.done}개의 태스크가 완료되었습니다.` });
    if (donut.progress > 0)
      log.push({ icon: "▶", type: "진행 중", desc: `${donut.progress}개의 태스크가 진행 중입니다.` });
    if (donut.hold > 0)
      log.push({ icon: "⏸", type: "보류 중", desc: `${donut.hold}개의 태스크가 보류 중입니다.` });
    if (donut.notStarted + donut.todo > 0)
      log.push({ icon: "○", type: "미시작", desc: `${donut.notStarted + donut.todo}개의 태스크가 대기 중입니다.` });
    if (log.length === 0)
      log.push({ icon: "👥", type: "워크스페이스", desc: "보드에 태스크를 추가하면 현황이 표시됩니다." });
    return log;
  })();

  const TOTAL = total || 1;
  const GRAPH = [{ name: userName, value: TOTAL > 0 ? Math.round((donut.done / TOTAL) * 100) : 0 }];

  const doneDash       = arc(donut.done,       0,                                                                    TOTAL);
  const progressDash   = arc(donut.progress,   (donut.done / TOTAL) * CIRC,                                         TOTAL);
  const holdDash       = arc(donut.hold,       ((donut.done + donut.progress) / TOTAL) * CIRC,                      TOTAL);
  const notStartedDash = arc(donut.notStarted + donut.todo, ((donut.done + donut.progress + donut.hold) / TOTAL) * CIRC, TOTAL);

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
                  transform="rotate(90 50 50)">{total}</text>
              </svg>
            </div>
            <div className="dbp-stat-list">
              <div className="dbp-stat-row">
                <span className="dbp-stat-dot" style={{ background: "#aaa" }} />
                <span className="dbp-stat-label">시작하지 않음</span>
                <span className="dbp-stat-val">{donut.notStarted + donut.todo}건</span>
              </div>
              <div className="dbp-stat-row">
                <span className="dbp-stat-dot" style={{ background: "#6ab4f8" }} />
                <span className="dbp-stat-label">진행중</span>
                <span className="dbp-stat-val">{donut.progress}건</span>
              </div>
              <div className="dbp-stat-row">
                <span className="dbp-stat-dot" style={{ background: "#7de89a" }} />
                <span className="dbp-stat-label">완료</span>
                <span className="dbp-stat-val">{donut.done}건</span>
              </div>
              <div className="dbp-stat-row">
                <span className="dbp-stat-dot" style={{ background: "#f8d08a" }} />
                <span className="dbp-stat-label">보류</span>
                <span className="dbp-stat-val">{donut.hold}건</span>
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
              {activityLog.map((a, i) => (
                <div key={i} className="dbp-timeline-item">
                  <div className="dbp-timeline-left">
                    <div className="dbp-timeline-icon">{a.icon}</div>
                    {i < activityLog.length - 1 && <div className="dbp-timeline-line" />}
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

        {/* 하단: 그래프 목록 */}
        <div className="dbp-card dbp-graph-card">
          <h3 className="dbp-card-title">그래프 목록</h3>
          <div className="dbp-graph-list">
            {GRAPH.map((g) => (
              <div key={g.name} className="dbp-graph-row">
                <span className="dbp-graph-name">{g.name}</span>
                <div className="dbp-graph-track">
                  <div className="dbp-graph-fill" style={{ width: `${g.value}%` }} />
                </div>
                <span className="dbp-graph-pct">{g.value}%</span>
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
                {[{ name: userName, done: donut.done, progress: donut.progress, hold: donut.hold }].map((m) => {
                  const total = m.done + m.progress + m.hold || 1;
                  return (
                    <div key={m.name} className="dbp-bar-col">
                      <div className="dbp-bar-track">
                        <div className="dbp-bar-seg hold"     style={{ height: `${(m.hold / total) * 100}%` }} />
                        <div className="dbp-bar-seg progress" style={{ height: `${(m.progress / total) * 100}%` }} />
                        <div className="dbp-bar-seg done"     style={{ height: `${(m.done / total) * 100}%` }} />
                      </div>
                      <div className="dbp-bar-avatar">{m.name[0]}</div>
                      <span className="dbp-bar-name">{m.name}</span>
                    </div>
                  );
                })}
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
            {total === 0 ? (
              <div className="dbp-empty-msg">등록된 마감 업무가 없습니다.</div>
            ) : (
              <>
                <div className="dbp-warning">⚠️ 경보</div>
                <div className="dbp-dl-row">
                  <span className="dbp-dl-name">진행중 업무</span>
                  <div className="dbp-dl-bar">
                    <div className="dbp-dl-fill striped" style={{ width: `${Math.min((donut.progress / TOTAL) * 100 + 20, 100)}%` }} />
                  </div>
                </div>
                <div className="dbp-dl-divider" />
                <div className="dbp-request-row">
                  <span className="dbp-request-num">{donut.notStarted + donut.todo}</span>
                  <span className="dbp-request-label">미시작</span>
                </div>
                <div className="dbp-dl-row">
                  <span className="dbp-dl-name">미시작 업무</span>
                  <div className="dbp-dl-bar">
                    <div className="dbp-dl-fill" style={{ width: `${Math.min(((donut.notStarted + donut.todo) / TOTAL) * 100, 100)}%` }} />
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

      </div>

      <WorkspaceTabBar
        onTabChange={(t) => {
          if (t === "board") navigate("/workspace-board", { state: { workspace, workspaces } });
          if (t === "planner") navigate("/workspace-board", { state: { workspace, workspaces } });
          if (t === "community") navigate("/workspace-board", { state: { workspace, workspaces } });
        }}
      />
    </div>
  );
}
