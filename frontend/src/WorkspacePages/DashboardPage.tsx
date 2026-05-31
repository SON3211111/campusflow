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
const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS_KO = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= lastDate; i++) days.push(i);
  return days;
}

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
  const [wsMembers, setWsMembers] = useState<{ userId: string; name: string }[]>([]);
  const [memberStats, setMemberStats] = useState<Record<string, { done: number; progress: number; hold: number; total: number }>>({});

  const [showPlanner,   setShowPlanner]   = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [plannerDotMap, setPlannerDotMap] = useState<Record<string, string[]>>({});
  const [plannerYear,   setPlannerYear]   = useState(() => new Date().getFullYear());
  const [plannerMonth,  setPlannerMonth]  = useState(() => new Date().getMonth());
  const [messages,  setMessages]  = useState<{ user: string; text: string; time: string }[]>([]);
  const [msgInput,  setMsgInput]  = useState("");
  const [writingMsg, setWritingMsg] = useState(false);

  const today = new Date();
  const prevPlan = () => { if (plannerMonth === 0) { setPlannerYear(y => y-1); setPlannerMonth(11); } else setPlannerMonth(m => m-1); };
  const nextPlan = () => { if (plannerMonth === 11) { setPlannerYear(y => y+1); setPlannerMonth(0); } else setPlannerMonth(m => m+1); };
  const plannerDays = getCalendarDays(plannerYear, plannerMonth);

  const handleSendMsg = () => {
    if (!msgInput.trim()) return;
    setMessages(p => [...p, { user: userName, text: msgInput.trim(), time: "방금" }]);
    setMsgInput(""); setWritingMsg(false);
  };

  useEffect(() => {
    if (workspace?.id) {
      client.get(`/workspaces/${workspace.id}/members`)
        .then((res) => setWsMembers(res.data.data ?? []))
        .catch(() => {});
    }
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

        const STATUS_COLOR_D: Record<string,string> = { TODO:"#aaa", REVIEW:"#888", DOING:"#4f7cff", ISSUE:"#f59e0b", DONE:"#22c55e" };
        const dotMap: Record<string, string[]> = {};
        for (const t of tasks) {
          if (!t.dueDate) continue;
          const ds = t.dueDate.slice(0, 10);
          if (!dotMap[ds]) dotMap[ds] = [];
          if (dotMap[ds].length < 3) dotMap[ds].push(STATUS_COLOR_D[t.status] ?? "#aaa");
        }
        setPlannerDotMap(dotMap);
        
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
  const wsActivityLog: { icon: string; type: string; desc: string }[] = workspace?.id
    ? (JSON.parse(localStorage.getItem(`workspace_activity_${workspace.id}`) ?? "[]") as { message: string; time: string }[])
        .map((a) => ({ icon: "👥", type: "참여", desc: a.message }))
    : [];

  const activityLog = (() => {
    const log: { icon: string; type: string; desc: string }[] = [...wsActivityLog];
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

      <div className="dbp-body" style={{ background: workspace?.gradient ?? "#f0f2f8" }}>

        {/* 커뮤니티 패널 */}
        <aside className={`wsp-community ${showCommunity ? "panel-visible" : "panel-hidden"}`}>
          <div className="wsp-panel-title"><span className="wsp-panel-icon">💬</span> community</div>
          <input className="wsp-search" placeholder="채널 및 메시지 검색..." />
          <div className="wsp-channel-label">채널 및 스레드</div>
          <div className="wsp-channel-item"># 일반</div>
          <div className="wsp-channel-item"># UI/UX 디자인</div>
          <div className="wsp-channel-item"># 개발 및 연동<span className="wsp-channel-dot" /></div>
          <div className="wsp-channel-label" style={{ marginTop: 16 }}>최근 메시지</div>
          <div className="wsp-msg-list">
            {messages.length === 0
              ? <div className="wsp-msg-empty">메시지가 없습니다.</div>
              : messages.map((m, i) => (
                <div key={i} className="wsp-msg-item">
                  <div className="wsp-msg-header"><span className="wsp-msg-name">{m.user}</span><span className="wsp-msg-time">{m.time}</span></div>
                  <div className="wsp-msg-text">{m.text}</div>
                </div>
              ))
            }
          </div>
          {writingMsg ? (
            <div className="wsp-msg-form">
              <textarea className="wsp-msg-input" placeholder="메시지 입력..." value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMsg(); } }}
                autoFocus />
              <div className="wsp-msg-actions">
                <button className="wsp-msg-send" onClick={handleSendMsg}>전송</button>
                <button className="wsp-msg-cancel" onClick={() => { setWritingMsg(false); setMsgInput(""); }}>취소</button>
              </div>
            </div>
          ) : (
            <button className="wsp-new-msg-btn" onClick={() => setWritingMsg(true)}>새 메시지 작성</button>
          )}
        </aside>

        {/* 플래너 패널 */}
        <aside className={`wsp-planner ${showPlanner ? "panel-visible" : "panel-hidden"}`}>
          <div className="wsp-panel-title"><span className="wsp-panel-icon">📅</span> Planner</div>
          <div className="wsp-cal-header">
            <button className="wsp-cal-nav" onClick={prevPlan}>‹</button>
            <span className="wsp-cal-title">{plannerYear}년 {plannerMonth + 1}월</span>
            <button className="wsp-cal-nav" onClick={nextPlan}>›</button>
          </div>
          <div className="wsp-cal-grid">
            {DAYS_KO.map(d => (
              <div key={d} className={`wsp-cal-day-label ${d==="일"?"sun":d==="토"?"sat":""}`}>{d}</div>
            ))}
            {plannerDays.map((d, i) => {
              const isToday = d === today.getDate() && plannerMonth === today.getMonth() && plannerYear === today.getFullYear();
              const ds = d ? `${plannerYear}-${String(plannerMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}` : "";
              const dots = ds ? (plannerDotMap[ds] ?? []) : [];
              return (
                <div key={i} className={`wsp-cal-day ${!d?"empty":""} ${isToday?"today":""}`}>
                  {d}
                  {dots.length > 0 && (
                    <div className="planner-dots">
                      {dots.map((c, j) => <span key={j} className="planner-dot" style={{ background: c }} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="wsp-upcoming-label">
            다가오는 마감일
            {upcomingTasks.length > 0 && <span className="wsp-upcoming-count">({upcomingTasks.length})</span>}
          </div>
          {upcomingTasks.length === 0
            ? <div className="wsp-upcoming-empty">마감일이 없습니다.</div>
            : upcomingTasks.map(t => (
              <div key={t.taskId} className="wsp-upcoming-item" style={{ borderLeftColor: t.daysLeft === 0 ? "#f59e0b" : t.daysLeft <= 3 ? "#ef4444" : "#4f7cff" }}>
                <div className="wsp-upcoming-info">
                  <span className="wsp-upcoming-name">{t.title}</span>
                  <span className="wsp-upcoming-date">⊙ {MONTHS_KO[new Date(t.dueDate).getMonth()]} {new Date(t.dueDate).getDate()}일 · {t.daysLeft === 0 ? "오늘" : `${t.daysLeft}일 남음`}</span>
                </div>
              </div>
            ))
          }
        </aside>

        {/* 메인 대시보드 */}
        <div className="dbp-main">

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

        </div> {/* dbp-main */}
      </div>

      <WorkspaceTabBar
        onTabChange={(t) => {
          if (t === "board")     navigate("/workspace-board", { state: { workspace, workspaces } });
          if (t === "planner")   setShowPlanner(v => !v);
          if (t === "community") setShowCommunity(v => !v);
        }}
      />
    </div>
  );
}
