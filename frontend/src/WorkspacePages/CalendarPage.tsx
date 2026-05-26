import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
import client from "../api/client";
import "./CalendarPage.css";

interface Workspace {
  id: string;
  name: string;
  gradient: string;
}

interface Task {
  taskId: string;
  title: string;
  status: string;
  dueDate?: string;
}

const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS_KO = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

const STATUS_COLOR: Record<string, string> = {
  DOING: "#4f7cff",
  DONE: "#22c55e",
  ISSUE: "#f59e0b",
  REVIEW: "#a89cf8",
  TODO: "#aaa",
};

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= lastDate; i++) days.push(i);
  return days;
}

export default function CalendarPage() {
  const { state } = useLocation() as {
    state: { workspace?: Workspace; workspaces?: Workspace[] };
  };

  const savedWs = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
  const workspace = state?.workspace ?? state?.workspaces?.[0] ?? savedWs;
  const workspaces = state?.workspaces ?? [];
  const gradient = workspace?.gradient ?? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)";
  const wsName = workspace?.name ?? "워크스페이스";

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [plannerYear, setPlannerYear] = useState(today.getFullYear());
  const [plannerMonth, setPlannerMonth] = useState(today.getMonth());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [wsMembers, setWsMembers] = useState<{ userId: string; name: string }[]>([]);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const [showCommunity, setShowCommunity] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [messages, setMessages] = useState<{ user: string; text: string; time: string }[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [writingMsg, setWritingMsg] = useState(false);

  useEffect(() => {
    if (!workspace?.id) return;
    client.get(`/workspaces/${workspace.id}/tasks`)
      .then((res) => setTasks(res.data.data ?? res.data ?? []))
      .catch(() => {});
    client.get(`/workspaces/${workspace.id}/members`)
      .then((res) => setWsMembers(res.data.data ?? []))
      .catch(() => {});
  }, [workspace?.id]);

  const tasksByDate: Record<string, Task[]> = {};
  for (const t of tasks) {
    if (t.dueDate) {
      const key = t.dueDate.slice(0, 10);
      if (!tasksByDate[key]) tasksByDate[key] = [];
      tasksByDate[key].push(t);
    }
  }

  const upcomingTasks = tasks
    .filter((t) => {
      if (!t.dueDate || t.status === "DONE") return false;
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      return diff >= 0 && diff <= 7;
    })
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  const calDays = getCalendarDays(year, month);
  const plannerDays = getCalendarDays(plannerYear, plannerMonth);

  const prevMain = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMain = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const prevPlanner = () => {
    if (plannerMonth === 0) { setPlannerYear((y) => y - 1); setPlannerMonth(11); }
    else setPlannerMonth((m) => m - 1);
  };
  const nextPlanner = () => {
    if (plannerMonth === 11) { setPlannerYear((y) => y + 1); setPlannerMonth(0); }
    else setPlannerMonth((m) => m + 1);
  };

  const handleSendMsg = () => {
    if (!msgInput.trim()) return;
    const userName = localStorage.getItem("userName") ?? "나";
    setMessages((prev) => [...prev, { user: userName, text: msgInput.trim(), time: "방금" }]);
    setMsgInput("");
    setWritingMsg(false);
  };

  const handleTabChange = (t: "planner" | "community" | "board" | "personal") => {
    if (t === "community") setShowCommunity((v) => !v);
    if (t === "planner")   setShowPlanner((v) => !v);
  };

  return (
    <div className="cal-page">
      <Header workspaces={workspaces} />
      <BoardSubHeader
        wsName={wsName}
        members={wsMembers}
        workspace={workspace}
        workspaces={workspaces}
        initialSelected="Calender"
      />

      <div className="cal-body" style={{ background: gradient }}>

        {/* 커뮤니티 패널 */}
        <aside className={`wsp-community ${showCommunity ? "panel-visible" : "panel-hidden"}`}>
          <div className="wsp-panel-title">
            <span className="wsp-panel-icon">💬</span> community
          </div>
          <input className="wsp-search" placeholder="채널 및 메시지 검색..." />
          <div className="wsp-channel-label">채널 및 스레드</div>
          <div className="wsp-channel-item"># 일반</div>
          <div className="wsp-channel-item"># UI/UX 디자인</div>
          <div className="wsp-channel-item">
            # 개발 및 연동
            <span className="wsp-channel-dot" />
          </div>
          <div className="wsp-channel-label" style={{ marginTop: 16 }}>최근 메시지</div>
          <div className="wsp-msg-list">
            {messages.length === 0 ? (
              <div className="wsp-msg-empty">메시지가 없습니다.</div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className="wsp-msg-item">
                  <div className="wsp-msg-header">
                    <span className="wsp-msg-name">{m.user}</span>
                    <span className="wsp-msg-time">{m.time}</span>
                  </div>
                  <div className="wsp-msg-text">{m.text}</div>
                </div>
              ))
            )}
          </div>
          {writingMsg ? (
            <div className="wsp-msg-form">
              <textarea
                className="wsp-msg-input"
                placeholder="메시지 입력..."
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMsg(); } }}
                autoFocus
              />
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
          <div className="wsp-panel-title">
            <span className="wsp-panel-icon">📅</span> Planner
          </div>
          <div className="wsp-cal-header">
            <button className="wsp-cal-nav" onClick={prevPlanner}>‹</button>
            <span className="wsp-cal-title">{plannerYear}년 {plannerMonth + 1}월</span>
            <button className="wsp-cal-nav" onClick={nextPlanner}>›</button>
          </div>
          <div className="wsp-cal-grid">
            {DAYS_KO.map((d) => (
              <div key={d} className={`wsp-cal-day-label ${d === "일" ? "sun" : d === "토" ? "sat" : ""}`}>{d}</div>
            ))}
            {plannerDays.map((d, i) => {
              const isToday = d === today.getDate() && plannerMonth === today.getMonth() && plannerYear === today.getFullYear();
              return (
                <div key={i} className={`wsp-cal-day ${!d ? "empty" : ""} ${isToday ? "today" : ""}`}>
                  {d}
                </div>
              );
            })}
          </div>
          <div className="wsp-upcoming-label">다가오는 마감일</div>
          {upcomingTasks.length === 0 ? (
            <div className="wsp-upcoming-empty">마감일이 없습니다.</div>
          ) : (
            upcomingTasks.map((t) => {
              const d = new Date(t.dueDate!);
              d.setHours(0, 0, 0, 0);
              const now = new Date(); now.setHours(0, 0, 0, 0);
              const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
              return (
                <div key={t.taskId} className="wsp-upcoming-item">
                  <span className="wsp-upcoming-dot" style={{ background: STATUS_COLOR[t.status] ?? "#aaa" }} />
                  <div className="wsp-upcoming-info">
                    <span className="wsp-upcoming-name">{t.title}</span>
                    <span className="wsp-upcoming-date">
                      {MONTHS_KO[d.getMonth()]} {d.getDate()}일
                      {days === 0 ? " · 오늘" : ` · ${days}일 남음`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </aside>

        {/* 메인 캘린더 */}
        <main className="cal-main">
          <div className="cal-main-card">
            <div className="cal-header-row">
              <div className="cal-header-left">
                <button className="cal-nav-btn" onClick={prevMain}>‹</button>
                <button className="cal-today-btn" onClick={goToday}>Today</button>
                <button className="cal-nav-btn" onClick={nextMain}>›</button>
                <span className="cal-header-title">{year}년 {MONTHS_KO[month]}</span>
              </div>
              <div className="cal-header-right">
                <div className="cal-view-toggle">
                  <button className={`cal-view-btn ${viewMode === "month" ? "active" : ""}`} onClick={() => setViewMode("month")}>Month</button>
                  <button className={`cal-view-btn ${viewMode === "week" ? "active" : ""}`} onClick={() => setViewMode("week")}>Week</button>
                </div>
              </div>
            </div>

            <div className="cal-dow-row">
              {DAYS_KO.map((d, i) => (
                <div key={d} className={`cal-dow-cell ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`}>{d}</div>
              ))}
            </div>

            <div className="cal-grid">
              {calDays.map((day, i) => {
                const isToday =
                  day === today.getDate() &&
                  month === today.getMonth() &&
                  year === today.getFullYear();
                const dateStr = day
                  ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  : "";
                const dayTasks = dateStr ? (tasksByDate[dateStr] ?? []) : [];
                const col = i % 7;
                return (
                  <div
                    key={i}
                    className={`cal-cell ${!day ? "empty" : ""} ${isToday ? "today" : ""} ${col === 0 ? "sun" : col === 6 ? "sat" : ""}`}
                  >
                    {day && (
                      <>
                        <span className="cal-day-num">{day}</span>
                        <div className="cal-cell-tasks">
                          {dayTasks.slice(0, 3).map((t) => (
                            <div
                              key={t.taskId}
                              className="cal-task-chip"
                              style={{ borderLeft: `3px solid ${STATUS_COLOR[t.status] ?? "#aaa"}` }}
                              title={t.title}
                            >
                              {t.title}
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <div className="cal-task-more">+{dayTasks.length - 3}개 더</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      <WorkspaceTabBar active="board" onTabChange={handleTabChange} />
    </div>
  );
}
