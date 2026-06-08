import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
import PixelAvatar from "../components/PixelAvatar";
import client from "../api/client";
import "./CalendarPage.css";

interface Workspace { id: string; name: string; gradient: string; }

interface FreeTimeBlock {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  title: string;
}

interface Task {
  taskId: string;
  title: string;
  status: string;
  startDate?: string;
  dueDate?: string;
  createdAt?: string;
  assigneeId?: string;
  assigneeName?: string;
}

interface BarSegment {
  taskId: string;
  title: string;
  color: string;
  slot: number;
  isStart: boolean;
  isEnd: boolean;
  showTitle: boolean;
  assigneeName?: string;
  assigneeId?: string;
  rawStart: string;
  rawEnd: string;
}

const DAYS_KO   = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS_KO = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const AVATAR_COLORS = ["#a89cf8", "#6ab4f8", "#7de89a", "#f8b4b4", "#f8d08a"];

const STATUS_COLOR: Record<string, string> = {
  TODO:   "#aaa",
  REVIEW: "#888",
  DOING:  "#4f7cff",
  ISSUE:  "#f59e0b",
  DONE:   "#22c55e",
};

const DAYS_WEEK   = ["월", "화", "수", "목", "금", "토", "일"];
const SCHED_HOURS = Array.from({ length: 14 }, (_, i) => i + 8);
const HOUR_H      = 44;
const HOUR_START  = 8;

function timeToTop(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h - HOUR_START) * HOUR_H + (m / 60) * HOUR_H;
}
function timeToHeight(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60 * HOUR_H;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= lastDate; i++) days.push(i);
  return days;
}

function avatarColor(id: string | undefined, members: { userId: string }[]) {
  const idx = members.findIndex(m => m.userId === id);
  return AVATAR_COLORS[(idx >= 0 ? idx : 0) % AVATAR_COLORS.length];
}

function computeBarMap(tasks: Task[], year: number, month: number): Record<string, BarSegment[]> {
  const firstDay = toDateStr(year, month, 1);
  const lastDay  = toDateStr(year, month, new Date(year, month + 1, 0).getDate());

  const bars = tasks
    .filter(t => t.dueDate)
    .map(t => {
      const rawStart = (t.startDate || t.dueDate!).slice(0, 10);
      const rawEnd   = t.dueDate!.slice(0, 10);
      if (rawEnd < firstDay || rawStart > lastDay) return null;
      return {
        taskId:       t.taskId,
        title:        t.title,
        color:        STATUS_COLOR[t.status] ?? "#bbb",
        assigneeName: t.assigneeName,
        assigneeId:   t.assigneeId,
        rawStart,
        rawEnd,
        visStart: rawStart < firstDay ? firstDay : rawStart,
        visEnd:   rawEnd   > lastDay  ? lastDay  : rawEnd,
      };
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof bars[0]>>[];

  bars.sort((a, b) => a.rawStart.localeCompare(b.rawStart) || a.taskId.localeCompare(b.taskId));

  const slotEnds: string[] = [];
  const placed = bars.map(bar => {
    let slot = slotEnds.findIndex(end => end < bar.visStart);
    if (slot === -1) slot = slotEnds.length;
    slotEnds[slot] = bar.visEnd;
    return { ...bar, slot };
  });

  const dsOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  const map: Record<string, BarSegment[]> = {};
  for (const bar of placed) {
    const cur = new Date(bar.visStart + "T00:00:00");
    const end = new Date(bar.visEnd   + "T00:00:00");
    while (cur <= end) {
      const ds = dsOf(cur);
      if (!map[ds]) map[ds] = [];
      map[ds].push({
        taskId:       bar.taskId,
        title:        bar.title,
        color:        bar.color,
        slot:         bar.slot,
        isStart:      ds === bar.visStart,
        isEnd:        ds === bar.visEnd,
        showTitle:    false,
        assigneeName: bar.assigneeName,
        assigneeId:   bar.assigneeId,
        rawStart:     bar.rawStart,
        rawEnd:       bar.rawEnd,
      });
      cur.setDate(cur.getDate() + 1);
    }
  }

  for (const bar of placed) {
    const barEnd = new Date(bar.visEnd + "T00:00:00");
    let rowStart = new Date(bar.visStart + "T00:00:00");
    while (rowStart <= barEnd) {
      const rowEnd = new Date(rowStart);
      while (rowEnd.getDay() !== 6 && rowEnd.getTime() < barEnd.getTime()) {
        rowEnd.setDate(rowEnd.getDate() + 1);
      }
      const midMs = Math.round((rowStart.getTime() + rowEnd.getTime()) / 2);
      const midDs = dsOf(new Date(midMs));
      const seg = map[midDs]?.find(s => s.taskId === bar.taskId);
      if (seg) seg.showTitle = true;
      if (rowEnd.getDay() === 6 && rowEnd.getTime() < barEnd.getTime()) {
        rowEnd.setDate(rowEnd.getDate() + 1);
        rowStart = new Date(rowEnd);
      } else {
        break;
      }
    }
  }

  return map;
}

const MAX_SLOTS  = 3;
const CARD_H     = 26;
const CARD_GAP   = 4;
const DAY_NUM_H  = 26;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function timeToMins(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function minsToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

// 여러 멤버의 공강 블록에서 공통 여유 시간 교집합 계산
function computeCommonFree(memberFreeMap: Record<string, FreeTimeBlock[]>, memberIds: string[]): FreeTimeBlock[] {
  if (memberIds.length === 0) return [];
  const result: FreeTimeBlock[] = [];
  const SLOT = 15; // 15분 단위
  for (const day of DAYS_WEEK) {
    let mergeStart: number | null = null;
    for (let min = 8 * 60; min < 21 * 60; min += SLOT) {
      const allFree = memberIds.every(uid => {
        const blocks = memberFreeMap[uid] ?? [];
        return blocks.some(b => b.dayOfWeek === day && timeToMins(b.startTime) <= min && min + SLOT <= timeToMins(b.endTime));
      });
      if (allFree) {
        if (mergeStart === null) mergeStart = min;
      } else if (mergeStart !== null) {
        result.push({ dayOfWeek: day, startTime: minsToTime(mergeStart), endTime: minsToTime(min), title: `공강 종합 (${memberIds.length}명)` });
        mergeStart = null;
      }
    }
    if (mergeStart !== null) {
      result.push({ dayOfWeek: day, startTime: minsToTime(mergeStart), endTime: "21:00", title: `공강 종합 (${memberIds.length}명)` });
    }
  }
  return result;
}

export default function CalendarPage() {
  const { state } = useLocation() as { state: { workspace?: Workspace; workspaces?: Workspace[] } };
  const navigate = useNavigate();

  const savedWs    = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
  const workspace  = state?.workspace ?? state?.workspaces?.[0] ?? savedWs;
  const workspaces = state?.workspaces ?? [];
  const gradient   = workspace?.gradient ?? "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)";
  const wsName     = workspace?.name ?? "워크스페이스";

  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [plannerYear,  setPlannerYear]  = useState(today.getFullYear());
  const [plannerMonth, setPlannerMonth] = useState(today.getMonth());

  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [wsMembers, setWsMembers] = useState<{ userId: string; name: string }[]>([]);

  const [showCommunity, setShowCommunity] = useState(false);
  const [showPlanner,   setShowPlanner]   = useState(false);
  const [messages,  setMessages]  = useState<{ user: string; text: string; time: string }[]>([]);
  const [msgInput,  setMsgInput]  = useState("");
  const [writingMsg, setWritingMsg] = useState(false);
  const [viewMode,  setViewMode]  = useState<"month" | "week">("month");

  const [freeBlocks,  setFreeBlocks]  = useState<FreeTimeBlock[]>([]);
  const [addingFree,  setAddingFree]  = useState(false);
  const [freeForm,    setFreeForm]    = useState({ title: "", dayOfWeek: "월", startTime: "09:00", endTime: "11:00" });
  const [freeLoading, setFreeLoading] = useState(false);
  const [schedView,    setSchedView]    = useState<"week" | "month">("week");
  const [schedYear,    setSchedYear]    = useState(today.getFullYear());
  const [schedMonth,   setSchedMonth]   = useState(today.getMonth());
  const [showFreeDays, setShowFreeDays] = useState(false);

  // 팀원 시간표
  const myUserId = localStorage.getItem("userId") ?? "";
  const [viewingUserId, setViewingUserId] = useState<string>(myUserId); // 현재 보는 멤버 (본인 or 팀원)
  const [combinedMode, setCombinedMode] = useState(false); // 공강 종합 모드
  const [memberFreeMap, setMemberFreeMap] = useState<Record<string, FreeTimeBlock[]>>({}); // 캐시

  // 보여줄 공강 블록 (현재 선택된 모드에 따라)
  const displayFreeBlocks = useMemo(() => {
    if (combinedMode) {
      const ids = [myUserId, ...wsMembers.map(m => m.userId)].filter(Boolean);
      return computeCommonFree(memberFreeMap, ids);
    }
    return memberFreeMap[viewingUserId] ?? [];
  }, [combinedMode, viewingUserId, memberFreeMap, myUserId, wsMembers]);

  const prevSchedMonth = () => { if (schedMonth === 0) { setSchedYear(y => y-1); setSchedMonth(11); } else setSchedMonth(m => m-1); };
  const nextSchedMonth = () => { if (schedMonth === 11) { setSchedYear(y => y+1); setSchedMonth(0); } else setSchedMonth(m => m+1); };

  const taskDaySet = useMemo(() => {
    const set = new Set<string>();
    const dsOf = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const cur = new Date(((t.startDate || t.dueDate).slice(0,10)) + "T00:00:00");
      const end = new Date(t.dueDate.slice(0,10) + "T00:00:00");
      while (cur <= end) { set.add(dsOf(cur)); cur.setDate(cur.getDate() + 1); }
    }
    return set;
  }, [tasks]);

  useEffect(() => {
    if (!workspace?.id) return;
    client.get(`/workspaces/${workspace.id}/tasks`)
      .then(res => setTasks(res.data.data ?? res.data ?? []))
      .catch(err => console.error("태스크 조회 실패:", err));
    client.get(`/workspaces/${workspace.id}/members`)
      .then(res => setWsMembers(res.data.data ?? []))
      .catch(err => console.error("멤버 조회 실패:", err));
  }, [workspace?.id]);

  // 특정 유저의 공강 블록 fetch (캐시 있으면 skip)
  const fetchMemberFree = async (userId: string) => {
    if (memberFreeMap[userId]) return;
    try {
      const res = await client.get(`/schedules/free/${userId}`);
      setMemberFreeMap(prev => ({ ...prev, [userId]: res.data ?? [] }));
    } catch (err) {
      console.error("공강 조회 실패:", err);
    }
  };

  // 내 공강 초기 로드
  useEffect(() => {
    if (!myUserId) return;
    fetchMemberFree(myUserId);
  }, [myUserId]);

  // 팀원 목록 로드 후 모든 멤버 공강 프리페치
  useEffect(() => {
    if (wsMembers.length === 0) return;
    wsMembers.forEach(m => fetchMemberFree(m.userId));
  }, [wsMembers]);

  // freeBlocks는 하위 호환(공강 추가 후 갱신)을 위해 유지
  useEffect(() => {
    setFreeBlocks(memberFreeMap[myUserId] ?? []);
  }, [memberFreeMap, myUserId]);

  const handleAddFreeTime = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId || !freeForm.startTime || !freeForm.endTime) return;
    setFreeLoading(true);
    try {
      await client.post("/schedules/free", {
        userId,
        title: freeForm.title || "공강",
        dayOfWeek: freeForm.dayOfWeek,
        startTime: freeForm.startTime + ":00",
        endTime: freeForm.endTime + ":00",
      });
      const res = await client.get(`/schedules/free/${userId}`);
      setMemberFreeMap(prev => ({ ...prev, [userId]: res.data ?? [] }));
      setAddingFree(false);
      setFreeForm({ title: "", dayOfWeek: "월", startTime: "09:00", endTime: "11:00" });
    } catch (err) {
      console.error("공강 추가 실패:", err);
      alert("공강 시간 저장에 실패했습니다.");
    } finally {
      setFreeLoading(false);
    }
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const barMap = useMemo(() => {
    const active = tasks.filter(t => t.dueDate && t.dueDate.slice(0, 10) >= todayStr);
    return computeBarMap(active, year, month);
  }, [tasks, year, month]);

  const calDays     = getCalendarDays(year, month);
  const plannerDays = getCalendarDays(plannerYear, plannerMonth);

  const plannerDotMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const ds = t.dueDate.slice(0, 10);
      if (!map[ds]) map[ds] = [];
      if (map[ds].length < 3) map[ds].push(STATUS_COLOR[t.status] ?? "#aaa");
    }
    return map;
  }, [tasks]);

  const upcomingTasks = tasks.filter(t => {
    if (!t.dueDate || t.status === "DONE") return false;
    const d = new Date(t.dueDate); d.setHours(0,0,0,0);
    const now = new Date(); now.setHours(0,0,0,0);
    const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
    return diff >= 0 && diff <= 5;
  }).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  const prevMain  = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMain  = () => { if (month ===11) { setYear(y => y+1); setMonth(0);  } else setMonth(m => m+1); };
  const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };
  const prevPlan  = () => { if (plannerMonth===0) { setPlannerYear(y=>y-1); setPlannerMonth(11); } else setPlannerMonth(m=>m-1); };
  const nextPlan  = () => { if (plannerMonth===11){ setPlannerYear(y=>y+1); setPlannerMonth(0);  } else setPlannerMonth(m=>m+1); };

  const handleSendMsg = () => {
    if (!msgInput.trim()) return;
    const uName = localStorage.getItem("userName") ?? "나";
    setMessages(p => [...p, { user: uName, text: msgInput.trim(), time: "방금" }]);
    setMsgInput(""); setWritingMsg(false);
  };

  const handleTabChange = (t: "planner" | "community" | "board" | "personal") => {
    if (t === "community") setShowCommunity(v => !v);
    if (t === "planner")   setShowPlanner(v => !v);
    if (t === "board")     navigate("/workspace-board", { state: { workspace, workspaces } });
  };

  return (
    <div className="cal-page">
      <Header workspaces={workspaces} />
      <BoardSubHeader wsName={wsName} members={wsMembers} workspace={workspace} workspaces={workspaces} initialSelected="Calender" />

      <div className="cal-body" style={{ background: gradient }}>

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
                onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); handleSendMsg(); } }}
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
              const isToday = d===today.getDate() && plannerMonth===today.getMonth() && plannerYear===today.getFullYear();
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
            : upcomingTasks.map(t => {
              const d = new Date(t.dueDate!); d.setHours(0,0,0,0);
              const now = new Date(); now.setHours(0,0,0,0);
              const days = Math.ceil((d.getTime()-now.getTime())/86400000);
              const color = STATUS_COLOR[t.status] ?? "#aaa";
              return (
                <div key={t.taskId} className="wsp-upcoming-item" style={{ borderLeftColor: color }}>
                  <div className="wsp-upcoming-info">
                    <span className="wsp-upcoming-name">{t.title}</span>
                    <span className="wsp-upcoming-date">
                      ⊙ {MONTHS_KO[d.getMonth()]} {d.getDate()}일{days === 0 ? " · 오늘" : ` · ${days}일 남음`}
                    </span>
                  </div>
                </div>
              );
            })
          }
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
                  <button className={`cal-view-btn ${viewMode==="month"?"active":""}`} onClick={() => setViewMode("month")}>Month</button>
                  <button className={`cal-view-btn ${viewMode==="week" ?"active":""}`} onClick={() => setViewMode("week")}>Week</button>
                </div>
              </div>
            </div>

            <div className="cal-dow-row">
              {DAYS_KO.map((d, i) => (
                <div key={d} className={`cal-dow-cell ${i===0?"sun":i===6?"sat":""}`}>{d}</div>
              ))}
            </div>

            <div className="cal-grid">
              {calDays.map((day, i) => {
                const isToday = day===today.getDate() && month===today.getMonth() && year===today.getFullYear();
                const dateStr = day ? toDateStr(year, month, day) : "";
                const segments = dateStr ? (barMap[dateStr] ?? []) : [];
                const colIdx = i % 7;
                const slotArr: (BarSegment | null)[] = Array(MAX_SLOTS).fill(null);
                segments.forEach(s => { if (s.slot < MAX_SLOTS) slotArr[s.slot] = s; });
                const isRowStart = colIdx === 0;
                const isRowEnd   = colIdx === 6;

                return (
                  <div
                    key={i}
                    className={`cal-cell ${!day?"empty":""} ${isToday?"today":""} ${colIdx===0?"sun":colIdx===6?"sat":""}`}
                    style={{ minHeight: `${DAY_NUM_H + MAX_SLOTS * (CARD_H + CARD_GAP) + 4}px` }}
                  >
                    {day && (
                      <>
                        <span className="cal-day-num">{day}</span>
                        <div className="cal-cards-area">
                          {slotArr.map((seg, slotIdx) => {
                            if (!seg) return <div key={slotIdx} className="cal-card-placeholder" style={{ height: CARD_H + CARD_GAP }} />;
                            const visualStart = seg.isStart || isRowStart;
                            const visualEnd   = seg.isEnd   || isRowEnd;
                            return (
                              <div
                                key={seg.taskId}
                                className={`cal-event-card ${visualStart?"card-start":""} ${visualEnd?"card-end":""}`}
                                style={{
                                  top: `${DAY_NUM_H + slotIdx * (CARD_H + CARD_GAP)}px`,
                                  background: hexToRgba(seg.color, 0.18),
                                  borderTop: `3px solid ${seg.color}`,
                                  boxShadow: visualStart ? `inset 3px 0 0 ${seg.color}` : undefined,
                                }}
                                title={seg.title}
                              >
                                <div className="cal-event-body">
                                  {seg.showTitle && (
                                    <span className="cal-event-title" style={{ color: seg.color }}>{seg.title}</span>
                                  )}
                                  {seg.isEnd && (
                                    <span className="cal-event-avatar" style={{ background: avatarColor(seg.assigneeId, wsMembers) }}>
                                      {seg.assigneeName ? seg.assigneeName[0] : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 공강 시간표 섹션 */}
          <div className="cs-section">
            {/* 팀원 아바타 row */}
            <div className="cs-member-row">
              <span className="cs-member-label">시간표</span>
              <div className="cs-member-avatars">
                {/* 내 아바타 */}
                <button
                  className={`cs-member-btn ${!combinedMode && viewingUserId === myUserId ? "active" : ""}`}
                  onClick={() => { setCombinedMode(false); setViewingUserId(myUserId); }}
                  title="내 시간표"
                >
                  <PixelAvatar userId={myUserId} name={localStorage.getItem("userName") ?? "나"} size="sm" />
                  <span className="cs-member-name">나</span>
                </button>
                {/* 팀원 아바타 */}
                {wsMembers.filter(m => m.userId !== myUserId).map(m => (
                  <button
                    key={m.userId}
                    className={`cs-member-btn ${!combinedMode && viewingUserId === m.userId ? "active" : ""}`}
                    onClick={() => { setCombinedMode(false); setViewingUserId(m.userId); }}
                    title={`${m.name}의 시간표`}
                  >
                    <PixelAvatar userId={m.userId} name={m.name} size="sm" />
                    <span className="cs-member-name">{m.name.slice(0, 3)}</span>
                  </button>
                ))}
              </div>
              {/* 공강 종합 버튼 */}
              <button
                className={`cs-combined-btn ${combinedMode ? "active" : ""}`}
                onClick={() => {
                  setCombinedMode(v => !v);
                  setSchedView("week");
                }}
                title="팀원 전체 공강 교집합 보기"
              >
                🔗 공강 종합
              </button>
            </div>

            {/* 현재 보는 사람 표시 */}
            <div className="cs-viewing-label">
              {combinedMode
                ? `팀원 ${wsMembers.length + 1}명의 공통 여유 시간`
                : viewingUserId === myUserId
                  ? "내 공강 시간표"
                  : `${wsMembers.find(m => m.userId === viewingUserId)?.name ?? "팀원"}의 공강 시간표`
              }
            </div>

            <div className="cs-header">
              <div className="cs-header-left">
                <span className="cs-icon">📚</span>
                <h3 className="cs-title">{combinedMode ? "공강 종합" : "공강 시간표"}</h3>
              </div>
              <div className="cs-header-right">
                {schedView === "month" && (
                  <div className="cs-month-nav">
                    <button className="cs-nav-btn" onClick={prevSchedMonth}>‹</button>
                    <span className="cs-month-label">{schedYear}년 {schedMonth + 1}월</span>
                    <button className="cs-nav-btn" onClick={nextSchedMonth}>›</button>
                  </div>
                )}
                <div className="cs-view-toggle">
                  <button className={`cs-view-btn ${schedView === "week" ? "active" : ""}`} onClick={() => setSchedView("week")}>주</button>
                  <button className={`cs-view-btn ${schedView === "month" ? "active" : ""}`} onClick={() => setSchedView("month")}>월</button>
                </div>
                {!combinedMode && (
                  <button
                    className={`cs-rec-btn ${showFreeDays ? "active" : ""}`}
                    onClick={() => { setShowFreeDays(v => !v); setSchedView("month"); }}
                  >
                    ✨ 공강 추천
                  </button>
                )}
                {!combinedMode && viewingUserId === myUserId && (
                  <button className="cs-add-btn" onClick={() => setAddingFree(v => !v)}>
                    {addingFree ? "✕ 닫기" : "+ 공강 추가"}
                  </button>
                )}
              </div>
            </div>

            {addingFree && (
              <div className="cs-form">
                <div className="cs-form-row">
                  <input
                    className="cs-input cs-input-title"
                    placeholder="제목 (예: 점심 공강, 오후 자유시간)"
                    value={freeForm.title}
                    onChange={e => setFreeForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="cs-form-row">
                  <select className="cs-select" value={freeForm.dayOfWeek}
                    onChange={e => setFreeForm(p => ({ ...p, dayOfWeek: e.target.value }))}>
                    {DAYS_WEEK.map(d => <option key={d}>{d}</option>)}
                  </select>
                  <input type="time" className="cs-input cs-time"
                    value={freeForm.startTime}
                    onChange={e => setFreeForm(p => ({ ...p, startTime: e.target.value }))} />
                  <span className="cs-arrow">→</span>
                  <input type="time" className="cs-input cs-time"
                    value={freeForm.endTime}
                    onChange={e => setFreeForm(p => ({ ...p, endTime: e.target.value }))} />
                  <button className="cs-save-btn" onClick={handleAddFreeTime} disabled={freeLoading}>
                    {freeLoading ? "저장 중..." : "저장"}
                  </button>
                  <button className="cs-cancel-btn" onClick={() => setAddingFree(false)}>취소</button>
                </div>
              </div>
            )}

            {schedView === "week" && (
              <div className="cs-timetable-wrap">
                <div className="cs-timetable">
                  <div className="cs-time-labels">
                    <div className="cs-day-header-empty" />
                    {SCHED_HOURS.map(h => (
                      <div key={h} className="cs-hour-label">{String(h).padStart(2, "0")}:00</div>
                    ))}
                  </div>
                  {DAYS_WEEK.map(day => (
                    <div key={day} className="cs-day-col">
                      <div className="cs-day-header">{day}</div>
                      <div className="cs-day-body">
                        {SCHED_HOURS.map(h => <div key={h} className="cs-hour-cell" />)}
                        {displayFreeBlocks
                          .filter(b => b.dayOfWeek === day)
                          .map((b, i) => {
                            const top    = timeToTop(b.startTime);
                            const height = Math.max(timeToHeight(b.startTime, b.endTime), 20);
                            return (
                              <div key={i} className="cs-free-block" style={{ top, height }}>
                                <span className="cs-block-title">{b.title}</span>
                                {height >= 36 && (
                                  <span className="cs-block-time">{b.startTime.slice(0, 5)}~{b.endTime.slice(0, 5)}</span>
                                )}
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {schedView === "month" && (
              <div className="cs-month-grid-wrap">
                <div className="cs-month-grid">
                  {DAYS_KO.map((d, i) => (
                    <div key={d} className={`cs-month-dow ${i===0?"sun":i===6?"sat":""}`}>{d}</div>
                  ))}
                  {getCalendarDays(schedYear, schedMonth).map((day, i) => {
                    const isToday  = day === today.getDate() && schedMonth === today.getMonth() && schedYear === today.getFullYear();
                    const colIdx   = i % 7;
                    const dow      = day ? ["일","월","화","수","목","금","토"][colIdx] : "";
                    const blocks   = day ? displayFreeBlocks.filter(b => b.dayOfWeek === dow) : [];
                    const ds       = day ? `${schedYear}-${String(schedMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}` : "";
                    const isFreeDay = showFreeDays && !!day && !taskDaySet.has(ds);
                    return (
                      <div key={i} className={`cs-month-cell ${!day ? "empty" : ""} ${isToday ? "today" : ""} ${colIdx===0?"sun":colIdx===6?"sat":""}`}>
                        {day && (
                          <>
                            <span className="cs-month-day-num">{day}</span>
                            {isFreeDay && <div className="cs-free-day-tag">작업 없음</div>}
                            {blocks.slice(0, isFreeDay ? 1 : 2).map((b, j) => (
                              <div key={j} className="cs-month-block">
                                {b.startTime.slice(0,5)} {b.title}
                              </div>
                            ))}
                            {blocks.length > (isFreeDay ? 1 : 2) && (
                              <div className="cs-month-more">+{blocks.length - (isFreeDay ? 1 : 2)}개 더</div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {displayFreeBlocks.length === 0 && !addingFree && (
              <p className="cs-empty">
                {combinedMode
                  ? "공통 여유 시간이 없습니다. 팀원들이 공강 시간을 등록하면 자동으로 표시됩니다."
                  : viewingUserId === myUserId
                    ? "등록된 공강 시간이 없습니다. 위 버튼으로 추가해보세요."
                    : "이 팀원이 아직 공강 시간을 등록하지 않았습니다."}
              </p>
            )}
          </div>
        </main>
      </div>

      <WorkspaceTabBar active="board" onTabChange={handleTabChange} />
    </div>
  );
}
