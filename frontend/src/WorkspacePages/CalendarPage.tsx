import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
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
const SCHED_HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8~21
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

function renderMentions(text: string, members: { name: string }[]) {
  return text.split(/(@[\w가-힣]+)/g).map((part, i) => {
    if (part.startsWith("@") && members.some(m => m.name === part.slice(1)))
      return <span key={i} className="cp-mention">{part}</span>;
    return <span key={i}>{part}</span>;
  });
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

// 태스크 바 슬롯 할당 (겹치지 않게 그리디 배치)
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

  // 슬롯 배정
  const slotEnds: string[] = [];
  const placed = bars.map(bar => {
    let slot = slotEnds.findIndex(end => end < bar.visStart);
    if (slot === -1) slot = slotEnds.length;
    slotEnds[slot] = bar.visEnd;
    return { ...bar, slot };
  });

  const dsOf = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  // 날짜별 세그먼트 맵 구성
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

  // 각 행(row)별 중앙 셀에 제목 표시 플래그 설정
  for (const bar of placed) {
    const barEnd = new Date(bar.visEnd + "T00:00:00");
    let rowStart = new Date(bar.visStart + "T00:00:00");

    while (rowStart <= barEnd) {
      // 이 행에서 바의 끝: 토요일(6) 또는 bar 끝, 둘 중 빠른 것
      const rowEnd = new Date(rowStart);
      while (rowEnd.getDay() !== 6 && rowEnd.getTime() < barEnd.getTime()) {
        rowEnd.setDate(rowEnd.getDate() + 1);
      }
      // 중앙 날짜 계산
      const midMs = Math.round((rowStart.getTime() + rowEnd.getTime()) / 2);
      const midDs = dsOf(new Date(midMs));
      const seg = map[midDs]?.find(s => s.taskId === bar.taskId);
      if (seg) seg.showTitle = true;

      // 다음 행 시작 (일요일)
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

export default function CalendarPage() {
  const { state } = useLocation() as { state: { workspace?: Workspace; workspaces?: Workspace[] } };

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
  const [messages,  setMessages]  = useState<{ user: string; userId: string; text: string; time: string }[]>([]);
  const [msgInput,  setMsgInput]  = useState("");
  const [writingMsg, setWritingMsg] = useState(false);

  // 커뮤니티 글 목록
  const [cpPosts,       setCpPosts]       = useState<{postId:string;title:string;content:string;authorId:string;authorName:string;solved:boolean;createdAt:string}[]>([]);
  const [cpTab,         setCpTab]         = useState<"unsolved"|"solved">("unsolved");
  const [cpSearch,      setCpSearch]      = useState("");
  const [cpDetail,      setCpDetail]      = useState<{postId:string;title:string;content:string;authorId:string;authorName:string;solved:boolean;createdAt:string;comments:{commentId:string;content:string;helperName:string;isAdopted:boolean;replies:{commentId:string;content:string;helperName:string}[]}[]} | null>(null);
  const [showPostForm,  setShowPostForm]  = useState(false);
  const [postForm,      setPostForm]      = useState({ title:"", content:"" });
  const [cpComment,     setCpComment]     = useState("");

  useEffect(() => { if (showCommunity) fetchCpPosts(); }, [showCommunity]);
  const fetchCpPosts = () => client.get("/community").then(r => setCpPosts(r.data ?? [])).catch(()=>{});
  const openCpDetail = async (id:string) => { try { const r = await client.get(`/community/${id}`); setCpDetail(r.data); setCpComment(""); } catch{} };
  const handleCpSubmit = async () => {
    if (!postForm.title.trim() || !postForm.content.trim() || !workspace?.id) return;
    await client.post("/community", { title:postForm.title, content:postForm.content, userId:localStorage.getItem("userId"), workspaceId:workspace.id }).catch(()=>{});
    fetchCpPosts(); setPostForm({title:"",content:""}); setShowPostForm(false);
  };
  const handleCpComment = async () => {
    if (!cpComment.trim() || !cpDetail) return;
    await client.post(`/community/${cpDetail.postId}/comments`, { content:cpComment, userId:localStorage.getItem("userId") }).catch(()=>{});
    const r = await client.get(`/community/${cpDetail.postId}`).catch(()=>null);
    if (r) { setCpDetail(r.data); setCpComment(""); }
  };
  const handleCpDeletePost = async(id:string)=>{ await client.delete(`/community/${id}`).catch(()=>{}); fetchCpPosts(); setCpDetail(null); };
  const handleCpUpdate = async(id:string)=>{ await client.patch(`/community/${id}`,{title:cpEditForm.title,content:cpEditForm.content}).catch(()=>{}); fetchCpPosts(); setCpEditingId(null); };
  const handleCpSolve  = async(id:string)=>{ await client.patch(`/community/${id}/solve`).catch(()=>{}); fetchCpPosts(); };
  const [cpEditingId,  setCpEditingId]  = useState<string|null>(null);
  const [cpEditForm,   setCpEditForm]   = useState({title:"",content:""});
  const cpMyId = localStorage.getItem("userId");
  const cpTimeAgo = (d:string) => { const m=Math.floor((Date.now()-new Date(d).getTime())/60000); return m<1?"방금":m<60?`${m}분 전`:m<1440?`${Math.floor(m/60)}시간 전`:`${Math.floor(m/1440)}일 전`; };
  const cpFiltered = cpPosts.filter(p=>cpTab==="unsolved"?!p.solved:p.solved).filter(p=>p.title.includes(cpSearch)||p.content.includes(cpSearch));
  const cpUnsolved = cpPosts.filter(p=>!p.solved).length;
  const [viewMode,  setViewMode]  = useState<"month" | "week">("month");

  const [freeBlocks,  setFreeBlocks]  = useState<FreeTimeBlock[]>([]);
  const [addingFree,  setAddingFree]  = useState(false);
  const [freeForm,    setFreeForm]    = useState({ title: "", dayOfWeek: "월", startTime: "09:00", endTime: "11:00" });
  const [freeLoading, setFreeLoading] = useState(false);
  const [schedView,    setSchedView]    = useState<"week" | "month">("week");
  const [schedYear,    setSchedYear]    = useState(today.getFullYear());
  const [schedMonth,   setSchedMonth]   = useState(today.getMonth());
  const [showFreeDays, setShowFreeDays] = useState(false);

  const prevSchedMonth = () => { if (schedMonth === 0) { setSchedYear(y => y-1); setSchedMonth(11); } else setSchedMonth(m => m-1); };
  const nextSchedMonth = () => { if (schedMonth === 11) { setSchedYear(y => y+1); setSchedMonth(0); } else setSchedMonth(m => m+1); };

  // 작업이 걸쳐있는 날짜 Set (startDate~dueDate 범위 전체)
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
      .catch(() => {});
    client.get(`/workspaces/${workspace.id}/members`)
      .then(res => setWsMembers(res.data.data ?? []))
      .catch(() => {});
  }, [workspace?.id]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    client.get(`/schedules/free/${userId}`)
      .then(res => setFreeBlocks(res.data ?? []))
      .catch(() => {});
  }, []);

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
      setFreeBlocks(res.data ?? []);
      setAddingFree(false);
      setFreeForm({ title: "", dayOfWeek: "월", startTime: "09:00", endTime: "11:00" });
    } catch { /* silent */ } finally {
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
    const uId   = localStorage.getItem("userId") ?? "";
    setMessages(p => [...p, { user: uName, userId: uId, text: msgInput.trim(), time: "방금" }]);
    setMsgInput(""); setWritingMsg(false);
  };

  const handleTabChange = (t: "planner" | "community" | "board" | "personal") => {
    if (t === "community") setShowCommunity(v => !v);
    if (t === "planner")   setShowPlanner(v => !v);
  };

  return (
    <div className="cal-page">
      <Header workspaces={workspaces} />
      <BoardSubHeader wsName={wsName} members={wsMembers} workspace={workspace} workspaces={workspaces} initialSelected="Calender" />

      <div className="cal-body" style={{ background: gradient }}>

        {/* 커뮤니티 패널 */}
        <aside className={`wsp-community ${showCommunity ? "panel-visible" : "panel-hidden"}`}>
          <div className="wsp-panel-title"><span className="wsp-panel-icon">💬</span> community</div>
          <input className="wsp-search" placeholder="도움 요청 검색..." value={cpSearch} onChange={e => setCpSearch(e.target.value)} />

          {cpDetail ? (
            /* 상세 뷰 */
            <div className="cp-detail">
              <button className="cp-back-btn" onClick={() => setCpDetail(null)}>← 목록</button>
              <div className="cp-detail-header-row">
                <div className="cp-detail-title">{cpDetail.title}</div>
                {cpDetail.authorId===cpMyId&&<button className="cp-del-post-btn" onClick={()=>handleCpDeletePost(cpDetail.postId)}>삭제</button>}
              </div>
              <div className="cp-detail-meta">
                <span>{cpDetail.authorName}</span>
                <span className={`cp-badge ${cpDetail.solved?"solved":"unsolved"}`}>{cpDetail.solved?"✅ 해결됨":"🔴 미해결"}</span>
              </div>
              <p className="cp-detail-content">{renderMentions(cpDetail.content, wsMembers)}</p>
              <div className="cp-comments-title">댓글 {cpDetail.comments?.length ?? 0}개</div>
              <div className="cp-comments-list">
                {(cpDetail.comments??[]).length===0
                  ? <div className="cp-comments-empty">첫 댓글을 달아보세요!</div>
                  : (cpDetail.comments??[]).map(c=>(
                    <div key={c.commentId} className="cp-comment">
                      <div className="cp-comment-header"><span className="cp-comment-name">{c.helperName}</span>{c.isAdopted&&<span className="cp-adopted">채택</span>}</div>
                      <div className="cp-comment-text">{renderMentions(c.content, wsMembers)}</div>
                      {(c.replies??[]).map(r=>(
                        <div key={r.commentId} className="cp-reply">
                          <span className="cp-reply-name">└ {r.helperName}</span>
                          <div className="cp-comment-text">{r.content}</div>
                        </div>
                      ))}
                    </div>
                  ))
                }
              </div>
              <div className="cp-comment-form">
                <input className="cp-comment-input" placeholder="댓글 작성..." value={cpComment} onChange={e=>setCpComment(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleCpComment();}} />
                <button className="cp-comment-send" onClick={handleCpComment}>전송</button>
              </div>
            </div>
          ) : (
            /* 목록 뷰 */
            <>
              <div className="cp-tabs-row">
                <div className="cp-tabs">
                  <button className={`cp-tab ${cpTab==="unsolved"?"active":""}`} onClick={()=>setCpTab("unsolved")}>미해결{cpUnsolved>0&&<span className="cp-tab-count">{cpUnsolved}</span>}</button>
                  <button className={`cp-tab ${cpTab==="solved"?"active":""}`} onClick={()=>setCpTab("solved")}>해결됨</button>
                </div>
                <button className="cp-new-btn" onClick={()=>setShowPostForm(v=>!v)}>{showPostForm?"✕":"+"}</button>
              </div>
              {showPostForm && (
                <div className="cp-form">
                  <input className="cp-input" placeholder="제목" value={postForm.title} onChange={e=>setPostForm(p=>({...p,title:e.target.value}))} />
                  <textarea className="cp-textarea" placeholder="어떤 도움이 필요하신가요?" value={postForm.content} onChange={e=>setPostForm(p=>({...p,content:e.target.value}))} />
                  <div className="cp-form-actions">
                    <button className="cp-submit-btn" onClick={handleCpSubmit}>요청 등록</button>
                    <button className="cp-cancel-btn" onClick={()=>setShowPostForm(false)}>취소</button>
                  </div>
                </div>
              )}
              <div className="cp-list">
                {cpFiltered.length===0
                  ? <div className="cp-empty">{cpTab==="unsolved"?"미해결 요청이 없습니다.":"해결된 요청이 없습니다."}</div>
                  : cpFiltered.map(p=>(
                    <div key={p.postId} className="cp-post-item">
                      {cpEditingId===p.postId ? (
                        <div className="cp-form" onClick={e=>e.stopPropagation()}>
                          <input className="cp-input" value={cpEditForm.title} onChange={e=>setCpEditForm(f=>({...f,title:e.target.value}))} />
                          <textarea className="cp-textarea" value={cpEditForm.content} onChange={e=>setCpEditForm(f=>({...f,content:e.target.value}))} />
                          <div className="cp-form-actions">
                            <button className="cp-submit-btn" onClick={()=>handleCpUpdate(p.postId)}>저장</button>
                            <button className="cp-cancel-btn" onClick={()=>setCpEditingId(null)}>취소</button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={()=>openCpDetail(p.postId)}>
                          <div className="cp-post-header">
                            <span className={`cp-status-dot ${p.solved?"solved":"unsolved"}`}/>
                            <span className="cp-post-title">{p.title}</span>
                            {p.authorId===cpMyId&&<>
                              {!p.solved&&<button className="cp-solve-btn" onClick={e=>{e.stopPropagation();handleCpSolve(p.postId);}}>✓</button>}
                              <button className="cp-edit-btn" onClick={e=>{e.stopPropagation();setCpEditingId(p.postId);setCpEditForm({title:p.title,content:p.content});}}>✏</button>
                              <button className="cp-del-btn" onClick={e=>{e.stopPropagation();handleCpDeletePost(p.postId);}}>✕</button>
                            </>}
                          </div>
                          <div className="cp-post-preview">{p.content.slice(0,45)}{p.content.length>45?"...":""}</div>
                          <div className="cp-post-meta">{p.authorName} · {cpTimeAgo(p.createdAt)}</div>
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
            </>
          )}

          <div className="wsp-channel-label" style={{ marginTop: 8 }}>최근 메시지</div>
          <div className="wsp-msg-list">
            {messages.length === 0
              ? <div className="wsp-msg-empty">메시지가 없습니다.</div>
              : messages.map((m, i) => (
                <div key={i} className="wsp-msg-item">
                  <div className="wsp-msg-header">
                    <span className="wsp-msg-name">{m.user}</span>
                    <span className="wsp-msg-time">{m.time}</span>
                    {m.userId===localStorage.getItem("userId")&&<button className="cp-del-btn" onClick={()=>setMessages(p=>p.filter((_,j)=>j!==i))}>✕</button>}
                  </div>
                  <div className="wsp-msg-text">{renderMentions(m.text, wsMembers)}</div>
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
            {upcomingTasks.length > 0 && (
              <span className="wsp-upcoming-count">({upcomingTasks.length})</span>
            )}
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
            {/* 헤더 */}
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

            {/* 요일 헤더 */}
            <div className="cal-dow-row">
              {DAYS_KO.map((d, i) => (
                <div key={d} className={`cal-dow-cell ${i===0?"sun":i===6?"sat":""}`}>{d}</div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="cal-grid">
              {calDays.map((day, i) => {
                const isToday = day===today.getDate() && month===today.getMonth() && year===today.getFullYear();
                const dateStr = day ? toDateStr(year, month, day) : "";
                const segments = dateStr ? (barMap[dateStr] ?? []) : [];
                const colIdx = i % 7;

                // 슬롯별 세그먼트 배열 (빈 슬롯 = null)
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
                                    <span
                                      className="cal-event-avatar"
                                      style={{ background: avatarColor(seg.assigneeId, wsMembers) }}
                                    >
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

          {/* ===== 공강 시간표 섹션 ===== */}
          <div className="cs-section">
            <div className="cs-header">
              <div className="cs-header-left">
                <span className="cs-icon">📚</span>
                <h3 className="cs-title">내 공강 시간표</h3>
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
                <button
                  className={`cs-rec-btn ${showFreeDays ? "active" : ""}`}
                  onClick={() => {
                    setShowFreeDays(v => !v);
                    setSchedView("month");
                  }}
                >
                  ✨ 공강 추천
                </button>
                <button className="cs-add-btn" onClick={() => setAddingFree(v => !v)}>
                  {addingFree ? "✕ 닫기" : "+ 공강 추가"}
                </button>
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

            {/* 주 뷰 */}
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
                        {freeBlocks
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

            {/* 월 뷰 */}
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
                    const blocks   = day ? freeBlocks.filter(b => b.dayOfWeek === dow) : [];
                    const ds       = day ? `${schedYear}-${String(schedMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}` : "";
                    const isFreeDay = showFreeDays && !!day && !taskDaySet.has(ds);
                    return (
                      <div key={i} className={`cs-month-cell ${!day ? "empty" : ""} ${isToday ? "today" : ""} ${colIdx===0?"sun":colIdx===6?"sat":""}`}>
                        {day && (
                          <>
                            <span className="cs-month-day-num">{day}</span>
                            {isFreeDay && (
                              <div className="cs-free-day-tag">작업 없음</div>
                            )}
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

            {freeBlocks.length === 0 && !addingFree && (
              <p className="cs-empty">등록된 공강 시간이 없습니다. 위 버튼으로 추가해보세요.</p>
            )}
          </div>
        </main>
      </div>

      <WorkspaceTabBar active="board" onTabChange={handleTabChange} />
    </div>
  );
}
