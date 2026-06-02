import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
import client from "../api/client";
import WorkspacePlannerPanel from "../components/WorkspacePlannerPanel";
import WorkspaceCommunityPanel from "../components/WorkspaceCommunityPanel";
import "../WorkspacePages/WorkSpacePage.css";
import "./DashboardPage.css";

interface Workspace {
  id: string;
  name: string;
  gradient: string;
}

interface Task {
  taskId: string;
  title: string;
  description?: string;
  status: string;
  dueDate?: string;
  assigneeId?: string;
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

  const [showPlanner,   setShowPlanner]   = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [donut, setDonut] = useState({ progress: 0, done: 0, hold: 0, notStarted: 0, todo: 0 });
  const [wsMembers, setWsMembers] = useState<{ userId: string; name: string }[]>([]);
  const [memberStats, setMemberStats] = useState<Record<string, { done: number; progress: number; hold: number; total: number }>>({});
  const [activityFeed, setActivityFeed] = useState<{ taskId: string; taskTitle: string; changedByName: string; prevStatus: string | null; currStatus: string; occurredAt: string }[]>([]);
  const [bottleneckTasks, setBottleneckTasks] = useState<{ taskId: string; title: string; status: string; assigneeName?: string }[]>([]);

  useEffect(() => {
    if (!workspace?.id) return;
    client.get(`/workspaces/${workspace.id}/members`)
      .then((res) => setWsMembers(res.data.data ?? []))
      .catch(() => {});
    client.get(`/workspaces/${workspace.id}/tasks/activity?limit=20`)
      .then((res) => setActivityFeed(res.data.data ?? []))
      .catch(() => {});
    client.get(`/workspaces/${workspace.id}/tasks/bottleneck?days=3`)
      .then((res) => setBottleneckTasks(res.data.data ?? []))
      .catch(() => {});
  }, [workspace?.id]);
  const [upcomingTasks, setUpcomingTasks] = useState<{ taskId: string; title: string; dueDate: string; daysLeft: number }[]>([]);

  useEffect(() => {
    if (!workspace?.id) {
      navigate("/workspace", { replace: true });
      return;
    }
    client.get(`/workspaces/${workspace.id}/tasks`)
      .then((res) => {
        const tasks: Task[] = res.data.data ?? [];
        const counts = { progress: 0, done: 0, hold: 0, notStarted: 0, todo: 0 };
        const perMember: Record<string, { done: number; progress: number; hold: number; total: number }> = {};

        for (const t of tasks) {
          if (t.status === "DOING")       counts.progress++;
          else if (t.status === "DONE")   counts.done++;
          else if (t.status === "ISSUE")  counts.hold++;
          else if (t.status === "REVIEW") counts.notStarted++;
          else if (t.status === "TODO")   counts.todo++;

          if (t.assigneeId) {
            if (!perMember[t.assigneeId]) perMember[t.assigneeId] = { done: 0, progress: 0, hold: 0, total: 0 };
            perMember[t.assigneeId].total++;
            if (t.status === "DONE")        perMember[t.assigneeId].done++;
            else if (t.status === "DOING")  perMember[t.assigneeId].progress++;
            else if (t.status === "ISSUE")  perMember[t.assigneeId].hold++;
          }
        }
        setDonut(counts);
        setMemberStats(perMember);
        
        // 마감 임박 작업 필터링 (오늘 기준 7일 이내)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming: { taskId: string; title: string; dueDate: string; daysLeft: number }[] = [];
        
        for (const t of tasks) {
          if (t.dueDate) {
            const dueDate = new Date(t.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            // 마감일이 오늘부터 7일 이내인 미완료 작업만 표시
            if (daysLeft >= 0 && daysLeft <= 7 && t.status !== "DONE") {
              upcoming.push({
                taskId: t.taskId,
                title: t.title,
                dueDate: t.dueDate,
                daysLeft: daysLeft,
              });
            }
          }
        }
        
        // 마감일이 가까운 순으로 정렬
        upcoming.sort((a, b) => a.daysLeft - b.daysLeft);
        setUpcomingTasks(upcoming);
        
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
  const STATUS_LABEL: Record<string, string> = {
    DONE: "완료", DOING: "진행 중", ISSUE: "보류 중", REVIEW: "검토 중", TODO: "시작 전",
  };
  const STATUS_ICON: Record<string, string> = {
    DONE: "✓", DOING: "▶", ISSUE: "⏸", REVIEW: "◎", TODO: "○",
  };

  function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "방금 전";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  }

  const activityLog = activityFeed.length > 0
    ? activityFeed.map((a) => ({
        icon: STATUS_ICON[a.currStatus] ?? "·",
        type: STATUS_LABEL[a.currStatus] ?? a.currStatus,
        desc: `${a.changedByName}이(가) [${a.taskTitle}]을(를) ${STATUS_LABEL[a.currStatus] ?? a.currStatus} 처리`,
        time: timeAgo(a.occurredAt),
      }))
    : [{ icon: "👥", type: "활동 없음", desc: "보드에서 태스크를 이동하면 여기에 기록됩니다.", time: "" }];

  const TOTAL = total || 1;
  const GRAPH = wsMembers.length > 0
    ? wsMembers.map((m) => {
        const s = memberStats[m.userId] ?? { done: 0, progress: 0, hold: 0, total: 0 };
        return { name: m.name, value: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0 };
      })
    : [{ name: userName, value: TOTAL > 0 ? Math.round((donut.done / TOTAL) * 100) : 0 }];

  const TEAM_BARS = wsMembers.length > 0
    ? wsMembers.map((m) => {
        const s = memberStats[m.userId] ?? { done: 0, progress: 0, hold: 0, total: 0 };
        return { name: m.name, done: s.done, progress: s.progress, hold: s.hold };
      })
    : [{ name: userName, done: donut.done, progress: donut.progress, hold: donut.hold }];

  const doneDash       = arc(donut.done,       0,                                                                    TOTAL);
  const progressDash   = arc(donut.progress,   (donut.done / TOTAL) * CIRC,                                         TOTAL);
  const holdDash       = arc(donut.hold,       ((donut.done + donut.progress) / TOTAL) * CIRC,                      TOTAL);
  const notStartedDash = arc(donut.notStarted + donut.todo, ((donut.done + donut.progress + donut.hold) / TOTAL) * CIRC, TOTAL);

  return (
    <div className="dbp-page">
      <Header workspaces={workspaces} />
      <BoardSubHeader wsName={wsName} members={wsMembers} workspace={workspace} workspaces={workspaces} initialSelected="Dash Board" />

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
      <WorkspaceCommunityPanel visible={showCommunity} workspaceId={workspace?.id} />
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
              <h3 className="dbp-card-title" style={{ margin: 0 }}>활동 피드</h3>
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
                    {a.time && <span className="dbp-timeline-time">{a.time}</span>}
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
                {TEAM_BARS.map((m) => {
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

          {/* 병목 태스크 */}
          <div className="dbp-card">
            <h3 className="dbp-card-title">⚠️ 주의 필요 태스크</h3>
            {bottleneckTasks.length === 0 ? (
              <div className="dbp-empty-msg">병목 태스크가 없습니다.</div>
            ) : (
              <div className="dbp-upcoming-list">
                {bottleneckTasks.map((t) => (
                  <div key={t.taskId} className="dbp-upcoming-item">
                    <div className="dbp-upcoming-title">{t.title}</div>
                    <div className="dbp-upcoming-info">
                      <span className={`dbp-upcoming-days urgent`}>
                        {t.status === "DOING" ? "진행 중" : "보류 중"} · 3일 이상 정체
                      </span>
                      {t.assigneeName && <span className="dbp-upcoming-date">담당: {t.assigneeName}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 마감 임박 */}
          <div className="dbp-card">
            <h3 className="dbp-card-title">마감 임박</h3>
            {upcomingTasks.length === 0 ? (
              <div className="dbp-empty-msg">마감 임박 업무가 없습니다.</div>
            ) : (
              <>
                <div className="dbp-warning">⚠️ {upcomingTasks.length}건의 작업이 마감 예정입니다</div>
                <div className="dbp-upcoming-list">
                  {upcomingTasks.map((task) => (
                    <div key={task.taskId} className="dbp-upcoming-item">
                      <div className="dbp-upcoming-title">{task.title}</div>
                      <div className="dbp-upcoming-info">
                        <span className="dbp-upcoming-date">{task.dueDate}</span>
                        <span className={`dbp-upcoming-days ${task.daysLeft === 0 ? "today" : task.daysLeft <= 3 ? "urgent" : "warning"}`}>
                          {task.daysLeft === 0 ? "오늘" : `${task.daysLeft}일 남음`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>

      </div>
      <WorkspacePlannerPanel visible={showPlanner} workspaceId={workspace?.id} />
      </div>

      <WorkspaceTabBar
        onTabChange={(t) => {
          if (t === "board")     navigate("/workspace-board", { state: { workspace, workspaces } });
          if (t === "planner")   setShowPlanner((v) => !v);
          if (t === "community") setShowCommunity((v) => !v);
          if (t === "personal")  navigate("/workspace");
        }}
      />
    </div>
  );
}
