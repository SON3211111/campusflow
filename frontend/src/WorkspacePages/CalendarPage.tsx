import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
import PixelAvatar from "../components/PixelAvatar";
import client from "../api/client";
import "./CalendarPage.css";

// ── 타입 ──────────────────────────────────────────────────────────────
interface Workspace { id: string; name: string; gradient: string; }

interface ScheduleBlockItem {
  blockId: string;
  category: string;  // CLASS | PRIVATE | TASK | FREE
  title: string;
  dayOfWeek: string;
  startTime: string; // "HH:mm" or "HH:mm:ss"
  endTime: string;
}

interface Task {
  taskId: string; title: string; status: string;
  startDate?: string; dueDate?: string;
  assigneeId?: string; assigneeName?: string;
}

interface BarSegment {
  taskId: string; title: string; color: string; slot: number;
  isStart: boolean; isEnd: boolean; showTitle: boolean;
  assigneeName?: string; assigneeId?: string;
  rawStart: string; rawEnd: string;
}

// ── 상수 ──────────────────────────────────────────────────────────────
const DAYS_KO   = ["일","월","화","수","목","금","토"];
const MONTHS_KO = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const AVATAR_COLORS = ["#a89cf8","#6ab4f8","#7de89a","#f8b4b4","#f8d08a"];
const DAYS_WEEK = ["월","화","수","목","금","토","일"];

const STATUS_COLOR: Record<string,string> = {
  TODO:"#aaa", REVIEW:"#888", DOING:"#4f7cff", ISSUE:"#f59e0b", DONE:"#22c55e",
};

const CAT_COLOR: Record<string,string> = {
  CLASS:"#4f7cff", PRIVATE:"#a855f7", TASK:"#f59e0b", FREE:"#22c55e",
};
const CAT_BG: Record<string,string> = {
  CLASS:"rgba(79,124,255,0.13)", PRIVATE:"rgba(168,85,247,0.13)",
  TASK:"rgba(245,158,11,0.13)", FREE:"rgba(34,197,94,0.13)",
};
const CAT_LABEL: Record<string,string> = {
  CLASS:"수업", PRIVATE:"개인", TASK:"태스크", FREE:"공강",
};

// 시간표 시간 범위: 8:00 ~ 22:00
const HOUR_START = 8;
const HOUR_END   = 22;
const TIMETABLE_HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);
const HOUR_H = 52; // px per hour

// ── 유틸 ──────────────────────────────────────────────────────────────
const timeToMins = (t: string) => { const [h,m] = t.split(":").map(Number); return h*60+m; };
const minsToTime = (m: number) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
const timeToTop  = (t: string) => (timeToMins(t) - HOUR_START*60) / 60 * HOUR_H;
const timeToH    = (s: string, e: string) => Math.max((timeToMins(e)-timeToMins(s))/60*HOUR_H, 20);

function toDateStr(y:number,m:number,d:number){return`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}
function getCalendarDays(y:number,m:number):(number|null)[]{
  const fd=new Date(y,m,1).getDay(),ld=new Date(y,m+1,0).getDate();
  const days:(number|null)[]=Array(fd).fill(null);
  for(let i=1;i<=ld;i++)days.push(i);
  return days;
}
function avatarColor(id:string|undefined,members:{userId:string}[]){
  const idx=members.findIndex(m=>m.userId===id);
  return AVATAR_COLORS[(idx>=0?idx:0)%AVATAR_COLORS.length];
}
function hexToRgba(hex:string,a:number){
  const h=hex.replace('#','');
  const full=h.length===3?h.split('').map(c=>c+c).join(''):h;
  return`rgba(${parseInt(full.slice(0,2),16)},${parseInt(full.slice(2,4),16)},${parseInt(full.slice(4,6),16)},${a})`;
}

// ── 캘린더 바 계산 ────────────────────────────────────────────────────
function computeBarMap(tasks:Task[],year:number,month:number):Record<string,BarSegment[]>{
  const firstDay=toDateStr(year,month,1),lastDay=toDateStr(year,month,new Date(year,month+1,0).getDate());
  const bars=tasks.filter(t=>t.dueDate).map(t=>{
    const rawStart=(t.startDate||t.dueDate!).slice(0,10),rawEnd=t.dueDate!.slice(0,10);
    if(rawEnd<firstDay||rawStart>lastDay)return null;
    return{taskId:t.taskId,title:t.title,color:STATUS_COLOR[t.status]??"#bbb",
      assigneeName:t.assigneeName,assigneeId:t.assigneeId,rawStart,rawEnd,
      visStart:rawStart<firstDay?firstDay:rawStart,visEnd:rawEnd>lastDay?lastDay:rawEnd};
  }).filter(Boolean) as NonNullable<ReturnType<typeof bars[0]>>[];
  bars.sort((a,b)=>a.rawStart.localeCompare(b.rawStart)||a.taskId.localeCompare(b.taskId));
  const slotEnds:string[]=[];
  const placed=bars.map(bar=>{let slot=slotEnds.findIndex(e=>e<bar.visStart);if(slot===-1)slot=slotEnds.length;slotEnds[slot]=bar.visEnd;return{...bar,slot};});
  const dsOf=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const map:Record<string,BarSegment[]>={};
  for(const bar of placed){
    const cur=new Date(bar.visStart+"T00:00:00"),end=new Date(bar.visEnd+"T00:00:00");
    while(cur<=end){const ds=dsOf(cur);if(!map[ds])map[ds]=[];map[ds].push({taskId:bar.taskId,title:bar.title,color:bar.color,slot:bar.slot,isStart:ds===bar.visStart,isEnd:ds===bar.visEnd,showTitle:false,assigneeName:bar.assigneeName,assigneeId:bar.assigneeId,rawStart:bar.rawStart,rawEnd:bar.rawEnd});cur.setDate(cur.getDate()+1);}
  }
  for(const bar of placed){
    const barEnd=new Date(bar.visEnd+"T00:00:00");let rowStart=new Date(bar.visStart+"T00:00:00");
    while(rowStart<=barEnd){const rowEnd=new Date(rowStart);while(rowEnd.getDay()!==6&&rowEnd.getTime()<barEnd.getTime())rowEnd.setDate(rowEnd.getDate()+1);const midDs=dsOf(new Date(Math.round((rowStart.getTime()+rowEnd.getTime())/2)));const seg=map[midDs]?.find(s=>s.taskId===bar.taskId);if(seg)seg.showTitle=true;if(rowEnd.getDay()===6&&rowEnd.getTime()<barEnd.getTime()){rowEnd.setDate(rowEnd.getDate()+1);rowStart=new Date(rowEnd);}else break;}
  }
  return map;
}

// ── 공강 종합 (FREE 교집합) ──────────────────────────────────────────
function computeCommonFree(blockMap:Record<string,ScheduleBlockItem[]>,ids:string[]):ScheduleBlockItem[]{
  if(ids.length===0)return[];
  const result:ScheduleBlockItem[]=[];
  for(const day of DAYS_WEEK){
    let start:number|null=null;
    for(let m=HOUR_START*60;m<HOUR_END*60;m+=15){
      const allFree=ids.every(uid=>(blockMap[uid]??[]).filter(b=>b.category==="FREE").some(b=>b.dayOfWeek===day&&timeToMins(b.startTime)<=m&&m+15<=timeToMins(b.endTime)));
      if(allFree){if(start===null)start=m;}
      else if(start!==null){result.push({blockId:`cmb-${day}-${start}`,category:"FREE",title:`공통 공강 (${ids.length}명)`,dayOfWeek:day,startTime:minsToTime(start),endTime:minsToTime(m)});start=null;}
    }
    if(start!==null)result.push({blockId:`cmb-${day}-${start}`,category:"FREE",title:`공통 공강 (${ids.length}명)`,dayOfWeek:day,startTime:minsToTime(start),endTime:minsToTime(HOUR_END*60)});
  }
  return result;
}

const MAX_SLOTS=3,CARD_H=26,CARD_GAP=4,DAY_NUM_H=26;

// ── 컴포넌트 ──────────────────────────────────────────────────────────
export default function CalendarPage() {
  const {state}=useLocation() as {state:{workspace?:Workspace;workspaces?:Workspace[]}};
  const navigate=useNavigate();
  const savedWs=JSON.parse(localStorage.getItem("clickedWorkspace")??"null");
  const workspace=state?.workspace??state?.workspaces?.[0]??savedWs;
  const workspaces=state?.workspaces??[];
  const gradient=workspace?.gradient??"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)";
  const wsName=workspace?.name??"워크스페이스";

  const today=new Date();
  const myUserId=localStorage.getItem("userId")??"";
  const myName=localStorage.getItem("userName")??"나";

  // 메인 달력
  const [year,setYear]=useState(today.getFullYear());
  const [month,setMonth]=useState(today.getMonth());
  const [plannerYear,setPlannerYear]=useState(today.getFullYear());
  const [plannerMonth,setPlannerMonth]=useState(today.getMonth());
  const [tasks,setTasks]=useState<Task[]>([]);
  const [wsMembers,setWsMembers]=useState<{userId:string;name:string}[]>([]);
  const [showCommunity,setShowCommunity]=useState(false);
  const [showPlanner,setShowPlanner]=useState(false);
  const [messages,setMessages]=useState<{user:string;text:string;time:string}[]>([]);
  const [msgInput,setMsgInput]=useState("");
  const [writingMsg,setWritingMsg]=useState(false);
  const [viewMode,setViewMode]=useState<"month"|"week">("month");

  // 시간표 뷰
  const [viewingUserId,setViewingUserId]=useState(myUserId);
  const [combinedMode,setCombinedMode]=useState(false);
  const [blockMap,setBlockMap]=useState<Record<string,ScheduleBlockItem[]>>({});

  // 팝업 상태
  const [addPopup,setAddPopup]=useState<{day:string;startHour:number;x:number;y:number}|null>(null);
  const [addForm,setAddForm]=useState({title:"",category:"CLASS",endHour:10});
  const [blockPopup,setBlockPopup]=useState<{block:ScheduleBlockItem;x:number;y:number}|null>(null);
  const popupRef=useRef<HTMLDivElement>(null);

  // 드래그 상태
  const dragRef=useRef<{day:string;startHour:number;endHour:number}|null>(null);
  const [dragHighlight,setDragHighlight]=useState<{day:string;startHour:number;endHour:number}|null>(null);

  const isMyView=!combinedMode&&viewingUserId===myUserId;

  // 팝업 외부 클릭 닫기
  useEffect(()=>{
    const handler=(e:MouseEvent)=>{
      if(popupRef.current&&!popupRef.current.contains(e.target as Node)){
        setAddPopup(null);setBlockPopup(null);
      }
    };
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[]);

  // 드래그 전역 mouseup — 어디서 손을 놓아도 팝업 열기
  useEffect(()=>{
    const handler=(e:MouseEvent)=>{
      const drag=dragRef.current;
      if(!drag)return;
      dragRef.current=null;
      setDragHighlight(null);
      document.body.style.cursor="";
      const startH=Math.min(drag.startHour,drag.endHour);
      const endH=Math.max(drag.startHour,drag.endHour)+1;
      setAddPopup({day:drag.day,startHour:startH,x:e.clientX,y:e.clientY});
      setAddForm({title:"",category:"CLASS",endHour:Math.min(endH,HOUR_END)});
    };
    document.addEventListener("mouseup",handler);
    return()=>document.removeEventListener("mouseup",handler);
  },[]);

  // 시간표 블록 fetch (캐시)
  const fetchSchedule=async(userId:string)=>{
    if(blockMap[userId])return;
    try{
      const res=await client.get(`/schedules/${userId}`);
      setBlockMap(prev=>({...prev,[userId]:res.data??[]}));
    }catch(err){console.error("시간표 조회 실패:",err);}
  };

  useEffect(()=>{if(myUserId)fetchSchedule(myUserId);},[myUserId]);
  useEffect(()=>{wsMembers.forEach(m=>fetchSchedule(m.userId));},[wsMembers]);

  // 태스크 & 멤버 로드
  useEffect(()=>{
    if(!workspace?.id)return;
    client.get(`/workspaces/${workspace.id}/tasks`).then(r=>setTasks(r.data.data??[])).catch(e=>console.error(e));
    client.get(`/workspaces/${workspace.id}/members`).then(r=>setWsMembers(r.data.data??[])).catch(e=>console.error(e));
  },[workspace?.id]);

  // 화면에 표시할 시간표 블록
  const displayBlocks=useMemo(()=>{
    if(combinedMode){
      const ids=[myUserId,...wsMembers.map(m=>m.userId)].filter(Boolean);
      return computeCommonFree(blockMap,ids);
    }
    return blockMap[viewingUserId]??[];
  },[combinedMode,viewingUserId,blockMap,myUserId,wsMembers]);

  // 달력 유틸
  const todayStr=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const barMap=useMemo(()=>computeBarMap(tasks.filter(t=>t.dueDate&&t.dueDate.slice(0,10)>=todayStr),year,month),[tasks,year,month]);
  const calDays=getCalendarDays(year,month);
  const plannerDays=getCalendarDays(plannerYear,plannerMonth);
  const plannerDotMap=useMemo(()=>{const map:Record<string,string[]>={};for(const t of tasks){if(!t.dueDate)continue;const ds=t.dueDate.slice(0,10);if(!map[ds])map[ds]=[];if(map[ds].length<3)map[ds].push(STATUS_COLOR[t.status]??"#aaa");}return map;},[tasks]);
  const upcomingTasks=tasks.filter(t=>{if(!t.dueDate||t.status==="DONE")return false;const d=new Date(t.dueDate);d.setHours(0,0,0,0);const now=new Date();now.setHours(0,0,0,0);const diff=Math.ceil((d.getTime()-now.getTime())/86400000);return diff>=0&&diff<=5;}).sort((a,b)=>(a.dueDate??"").localeCompare(b.dueDate??""));

  const prevMain=()=>{if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1);};
  const nextMain=()=>{if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1);};
  const goToday=()=>{setYear(today.getFullYear());setMonth(today.getMonth());};
  const prevPlan=()=>{if(plannerMonth===0){setPlannerYear(y=>y-1);setPlannerMonth(11);}else setPlannerMonth(m=>m-1);};
  const nextPlan=()=>{if(plannerMonth===11){setPlannerYear(y=>y+1);setPlannerMonth(0);}else setPlannerMonth(m=>m+1);};

  const handleSendMsg=()=>{if(!msgInput.trim())return;setMessages(p=>[...p,{user:myName,text:msgInput.trim(),time:"방금"}]);setMsgInput("");setWritingMsg(false);};
  const handleTabChange=(t:"planner"|"community"|"board"|"personal")=>{
    if(t==="community")setShowCommunity(v=>!v);
    if(t==="planner")setShowPlanner(v=>!v);
    if(t==="board")navigate("/workspace-board",{state:{workspace,workspaces}});
  };

  // ── 시간표 인터랙션 (드래그 + 클릭) ─────────────────────────────
  const handleCellMouseDown=(e:React.MouseEvent,day:string,hour:number)=>{
    if(!isMyView)return;
    // 블록 위 클릭이면 드래그 시작하지 않음
    const existing=(blockMap[myUserId]??[]).find(b=>b.dayOfWeek===day&&timeToMins(b.startTime)<=hour*60&&hour*60<timeToMins(b.endTime));
    if(existing){
      setBlockPopup({block:existing,x:e.clientX,y:e.clientY});
      setAddPopup(null);
      return;
    }
    e.preventDefault(); // 텍스트 선택 방지
    dragRef.current={day,startHour:hour,endHour:hour};
    setDragHighlight({day,startHour:hour,endHour:hour});
    setAddPopup(null);
    setBlockPopup(null);
    document.body.style.cursor="ns-resize";
  };

  const handleCellMouseEnter=(day:string,hour:number)=>{
    const drag=dragRef.current;
    if(!drag||drag.day!==day)return;
    drag.endHour=hour;
    setDragHighlight({day,startHour:drag.startHour,endHour:hour});
  };

  const handleBlockMouseDown=(e:React.MouseEvent,block:ScheduleBlockItem)=>{
    if(!isMyView)return;
    e.stopPropagation();
    setBlockPopup({block,x:e.clientX,y:e.clientY});
    setAddPopup(null);
  };

  const handleAddBlock=async()=>{
    if(!addPopup||!addForm.title.trim())return;
    try{
      const res=await client.post("/schedules",{
        userId:myUserId,title:addForm.title.trim(),category:addForm.category,
        dayOfWeek:addPopup.day,
        startTime:`${String(addPopup.startHour).padStart(2,"0")}:00:00`,
        endTime:`${String(addForm.endHour).padStart(2,"0")}:00:00`,
      });
      setBlockMap(prev=>({...prev,[myUserId]:[...(prev[myUserId]??[]),res.data]}));
      setAddPopup(null);
    }catch(err){console.error("시간표 추가 실패:",err);alert("시간표 추가에 실패했습니다.");}
  };

  const handleDeleteBlock=async(blockId:string)=>{
    try{
      await client.delete(`/schedules/blocks/${blockId}`);
      setBlockMap(prev=>({...prev,[myUserId]:(prev[myUserId]??[]).filter(b=>b.blockId!==blockId)}));
      setBlockPopup(null);
    }catch(err){console.error("시간표 삭제 실패:",err);alert("삭제에 실패했습니다.");}
  };

  const viewingName=combinedMode?"공강 종합":viewingUserId===myUserId?"내 시간표":(wsMembers.find(m=>m.userId===viewingUserId)?.name??"팀원")+"의 시간표";

  return (
    <div className="cal-page">
      <Header workspaces={workspaces}/>
      <BoardSubHeader wsName={wsName} members={wsMembers} workspace={workspace} workspaces={workspaces} initialSelected="Calender"/>

      <div className="cal-body" style={{background:gradient}}>

        {/* 커뮤니티 패널 */}
        <aside className={`wsp-community ${showCommunity?"panel-visible":"panel-hidden"}`}>
          <div className="wsp-panel-title"><span className="wsp-panel-icon">💬</span>community</div>
          <input className="wsp-search" placeholder="채널 및 메시지 검색..."/>
          <div className="wsp-channel-label">채널 및 스레드</div>
          <div className="wsp-channel-item"># 일반</div>
          <div className="wsp-msg-list">{messages.length===0?<div className="wsp-msg-empty">메시지가 없습니다.</div>:messages.map((m,i)=><div key={i} className="wsp-msg-item"><div className="wsp-msg-header"><span className="wsp-msg-name">{m.user}</span><span className="wsp-msg-time">{m.time}</span></div><div className="wsp-msg-text">{m.text}</div></div>)}</div>
          {writingMsg?(<div className="wsp-msg-form"><textarea className="wsp-msg-input" placeholder="메시지 입력..." value={msgInput} onChange={e=>setMsgInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSendMsg();}}} autoFocus/><div className="wsp-msg-actions"><button className="wsp-msg-send" onClick={handleSendMsg}>전송</button><button className="wsp-msg-cancel" onClick={()=>{setWritingMsg(false);setMsgInput("");}}>취소</button></div></div>):(<button className="wsp-new-msg-btn" onClick={()=>setWritingMsg(true)}>새 메시지 작성</button>)}
        </aside>

        {/* 플래너 패널 */}
        <aside className={`wsp-planner ${showPlanner?"panel-visible":"panel-hidden"}`}>
          <div className="wsp-panel-title"><span className="wsp-panel-icon">📅</span>Planner</div>
          <div className="wsp-cal-header"><button className="wsp-cal-nav" onClick={prevPlan}>‹</button><span className="wsp-cal-title">{plannerYear}년 {plannerMonth+1}월</span><button className="wsp-cal-nav" onClick={nextPlan}>›</button></div>
          <div className="wsp-cal-grid">{DAYS_KO.map(d=><div key={d} className={`wsp-cal-day-label ${d==="일"?"sun":d==="토"?"sat":""}`}>{d}</div>)}{plannerDays.map((d,i)=>{const isToday=d===today.getDate()&&plannerMonth===today.getMonth()&&plannerYear===today.getFullYear();const ds=d?`${plannerYear}-${String(plannerMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`:"";const dots=ds?(plannerDotMap[ds]??[]):[];return(<div key={i} className={`wsp-cal-day ${!d?"empty":""} ${isToday?"today":""}`}>{d}{dots.length>0&&<div className="planner-dots">{dots.map((c,j)=><span key={j} className="planner-dot" style={{background:c}}/>)}</div>}</div>);})}</div>
          <div className="wsp-upcoming-label">다가오는 마감일{upcomingTasks.length>0&&<span className="wsp-upcoming-count">({upcomingTasks.length})</span>}</div>
          {upcomingTasks.length===0?<div className="wsp-upcoming-empty">마감일이 없습니다.</div>:upcomingTasks.map(t=>{const d=new Date(t.dueDate!);d.setHours(0,0,0,0);const now=new Date();now.setHours(0,0,0,0);const days=Math.ceil((d.getTime()-now.getTime())/86400000);const color=STATUS_COLOR[t.status]??"#aaa";return(<div key={t.taskId} className="wsp-upcoming-item" style={{borderLeftColor:color}}><div className="wsp-upcoming-info"><span className="wsp-upcoming-name">{t.title}</span><span className="wsp-upcoming-date">⊙ {MONTHS_KO[d.getMonth()]} {d.getDate()}일{days===0?" · 오늘":` · ${days}일 남음`}</span></div></div>);})}
        </aside>

        {/* 메인 영역 */}
        <main className="cal-main">

          {/* ── 월간 달력 ── */}
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
                  <button className={`cal-view-btn ${viewMode==="month"?"active":""}`} onClick={()=>setViewMode("month")}>Month</button>
                  <button className={`cal-view-btn ${viewMode==="week"?"active":""}`} onClick={()=>setViewMode("week")}>Week</button>
                </div>
              </div>
            </div>
            <div className="cal-dow-row">{DAYS_KO.map((d,i)=><div key={d} className={`cal-dow-cell ${i===0?"sun":i===6?"sat":""}`}>{d}</div>)}</div>
            <div className="cal-grid">
              {calDays.map((day,i)=>{
                const isToday=day===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
                const dateStr=day?toDateStr(year,month,day):"";
                const segments=dateStr?(barMap[dateStr]??[]):[];
                const colIdx=i%7;
                const slotArr:(BarSegment|null)[]=Array(MAX_SLOTS).fill(null);
                segments.forEach(s=>{if(s.slot<MAX_SLOTS)slotArr[s.slot]=s;});
                const isRowStart=colIdx===0,isRowEnd=colIdx===6;
                return(
                  <div key={i} className={`cal-cell ${!day?"empty":""} ${isToday?"today":""} ${colIdx===0?"sun":colIdx===6?"sat":""}`} style={{minHeight:`${DAY_NUM_H+MAX_SLOTS*(CARD_H+CARD_GAP)+4}px`}}>
                    {day&&(<><span className="cal-day-num">{day}</span><div className="cal-cards-area">{slotArr.map((seg,si)=>{if(!seg)return<div key={si} className="cal-card-placeholder" style={{height:CARD_H+CARD_GAP}}/>;const vs=seg.isStart||isRowStart,ve=seg.isEnd||isRowEnd;return(<div key={seg.taskId} className={`cal-event-card ${vs?"card-start":""} ${ve?"card-end":""}`} style={{top:`${DAY_NUM_H+si*(CARD_H+CARD_GAP)}px`,background:hexToRgba(seg.color,0.18),borderTop:`3px solid ${seg.color}`,boxShadow:vs?`inset 3px 0 0 ${seg.color}`:undefined}} title={seg.title}><div className="cal-event-body">{seg.showTitle&&<span className="cal-event-title" style={{color:seg.color}}>{seg.title}</span>}{seg.isEnd&&<span className="cal-event-avatar" style={{background:avatarColor(seg.assigneeId,wsMembers)}}>{seg.assigneeName?seg.assigneeName[0]:""}</span>}</div></div>);})}</div></>)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 시간표 섹션 ── */}
          <div className="cs-section">

            {/* 팀원 아바타 row */}
            <div className="cs-member-row">
              <span className="cs-member-label">시간표</span>
              <div className="cs-member-avatars">
                <button className={`cs-member-btn ${!combinedMode&&viewingUserId===myUserId?"active":""}`} onClick={()=>{setCombinedMode(false);setViewingUserId(myUserId);}}>
                  <PixelAvatar userId={myUserId} name={myName} size="sm"/>
                  <span className="cs-member-name">나</span>
                </button>
                {wsMembers.filter(m=>m.userId!==myUserId).map(m=>(
                  <button key={m.userId} className={`cs-member-btn ${!combinedMode&&viewingUserId===m.userId?"active":""}`} onClick={()=>{setCombinedMode(false);setViewingUserId(m.userId);}}>
                    <PixelAvatar userId={m.userId} name={m.name} size="sm"/>
                    <span className="cs-member-name">{m.name.slice(0,3)}</span>
                  </button>
                ))}
              </div>
              <button className={`cs-combined-btn ${combinedMode?"active":""}`} onClick={()=>setCombinedMode(v=>!v)}>
                🔗 공강 종합
              </button>
            </div>

            {/* 헤더 */}
            <div className="cs-header">
              <div className="cs-header-left">
                <h3 className="cs-title">📅 {viewingName}</h3>
                {isMyView&&<span className="cs-hint">빈 칸을 클릭하면 수업을 추가할 수 있어요</span>}
              </div>
              <div className="cs-header-right">
                {/* 카테고리 범례 */}
                <div className="cs-legend">
                  {Object.entries(CAT_LABEL).map(([k,v])=>(
                    <span key={k} className="cs-legend-item">
                      <span className="cs-legend-dot" style={{background:CAT_COLOR[k]}}/>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 에브리타임 스타일 시간표 그리드 */}
            <div className="cs-timetable-wrap">
              <div className="cs-timetable">
                {/* 시간 레이블 열 */}
                <div className="cs-time-col">
                  <div className="cs-day-header-empty"/>
                  {TIMETABLE_HOURS.map(h=>(
                    <div key={h} className="cs-hour-label">{String(h).padStart(2,"0")}:00</div>
                  ))}
                </div>

                {/* 요일별 열 */}
                {DAYS_WEEK.map(day=>{
                  const dayBlocks=displayBlocks.filter(b=>b.dayOfWeek===day);
                  return(
                    <div key={day} className="cs-day-col">
                      <div className="cs-day-header">{day}</div>
                      <div className={`cs-day-body ${isMyView?"cs-day-editable":""}`}>
                        {/* 시간 셀 (드래그/클릭 영역) */}
                        {TIMETABLE_HOURS.map(h=>(
                          <div
                            key={h}
                            className="cs-hour-cell"
                            onMouseDown={(e)=>handleCellMouseDown(e,day,h)}
                            onMouseEnter={()=>handleCellMouseEnter(day,h)}
                          />
                        ))}
                        {/* 드래그 프리뷰 */}
                        {dragHighlight&&dragHighlight.day===day&&(()=>{
                          const s=Math.min(dragHighlight.startHour,dragHighlight.endHour);
                          const e2=Math.max(dragHighlight.startHour,dragHighlight.endHour)+1;
                          const top=timeToTop(`${String(s).padStart(2,"0")}:00`);
                          const height=timeToH(`${String(s).padStart(2,"0")}:00`,`${String(Math.min(e2,HOUR_END)).padStart(2,"0")}:00`);
                          return(
                            <div className="cs-drag-preview" style={{top,height}}>
                              {`${String(s).padStart(2,"0")}:00 ~ ${String(Math.min(e2,HOUR_END)).padStart(2,"0")}:00`}
                            </div>
                          );
                        })()}
                        {/* 시간표 블록 */}
                        {dayBlocks.map(block=>{
                          const top=timeToTop(block.startTime);
                          const height=timeToH(block.startTime,block.endTime);
                          const color=CAT_COLOR[block.category]??"#888";
                          const bg=CAT_BG[block.category]??"rgba(136,136,136,0.13)";
                          return(
                            <div
                              key={block.blockId}
                              className="cs-block"
                              style={{top,height,background:bg,borderLeft:`3px solid ${color}`}}
                              onMouseDown={(e)=>handleBlockMouseDown(e,block)}
                            >
                              <span className="cs-block-cat" style={{color}}>{CAT_LABEL[block.category]??block.category}</span>
                              <span className="cs-block-title" style={{color}}>{block.title}</span>
                              {height>=52&&<span className="cs-block-time">{block.startTime.slice(0,5)}~{block.endTime.slice(0,5)}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {displayBlocks.length===0&&(
              <p className="cs-empty">
                {combinedMode?"공통 공강 시간이 없습니다. 팀원들이 공강 블록을 추가하면 자동으로 표시됩니다.":isMyView?"빈 칸을 클릭해서 시간표를 채워보세요.":"이 팀원의 시간표가 없습니다."}
              </p>
            )}
          </div>
        </main>
      </div>

      {/* ── 수업 추가 팝업 ── */}
      {addPopup&&(
        <div ref={popupRef} className="cs-popup" style={{left:Math.min(addPopup.x,window.innerWidth-260),top:Math.min(addPopup.y,window.innerHeight-280)}}>
          <div className="cs-popup-header">
            <span>{addPopup.day}요일 {String(addPopup.startHour).padStart(2,"0")}:00</span>
            <button className="cs-popup-close" onClick={()=>setAddPopup(null)}>✕</button>
          </div>
          <input
            className="cs-popup-input"
            placeholder="수업명 / 일정명"
            value={addForm.title}
            onChange={e=>setAddForm(p=>({...p,title:e.target.value}))}
            onKeyDown={e=>{if(e.key==="Enter")handleAddBlock();if(e.key==="Escape")setAddPopup(null);}}
            autoFocus
          />
          <div className="cs-popup-row">
            <label className="cs-popup-label">종류</label>
            <select className="cs-popup-select" value={addForm.category} onChange={e=>setAddForm(p=>({...p,category:e.target.value}))}>
              <option value="CLASS">🎓 수업</option>
              <option value="PRIVATE">👤 개인</option>
              <option value="FREE">☀️ 공강</option>
              <option value="TASK">📋 태스크</option>
            </select>
          </div>
          <div className="cs-popup-row">
            <label className="cs-popup-label">시간</label>
            <span className="cs-popup-time-label">{String(addPopup.startHour).padStart(2,"0")}:00 →</span>
            <select className="cs-popup-select cs-popup-select-sm" value={addForm.endHour} onChange={e=>setAddForm(p=>({...p,endHour:Number(e.target.value)}))}>
              {TIMETABLE_HOURS.filter(h=>h>addPopup.startHour).map(h=>(
                <option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>
              ))}
            </select>
          </div>
          <button className="cs-popup-btn" style={{background:CAT_COLOR[addForm.category]}} onClick={handleAddBlock}>
            추가
          </button>
        </div>
      )}

      {/* ── 블록 정보 팝업 (클릭 시 삭제) ── */}
      {blockPopup&&(
        <div ref={popupRef} className="cs-popup" style={{left:Math.min(blockPopup.x,window.innerWidth-240),top:Math.min(blockPopup.y,window.innerHeight-180)}}>
          <div className="cs-popup-header" style={{background:CAT_BG[blockPopup.block.category],borderBottom:`2px solid ${CAT_COLOR[blockPopup.block.category]}`}}>
            <div>
              <span className="cs-popup-cat-label" style={{color:CAT_COLOR[blockPopup.block.category]}}>{CAT_LABEL[blockPopup.block.category]??blockPopup.block.category}</span>
              <span className="cs-popup-block-title">{blockPopup.block.title}</span>
            </div>
            <button className="cs-popup-close" onClick={()=>setBlockPopup(null)}>✕</button>
          </div>
          <div className="cs-popup-info">
            <span>📅 {blockPopup.block.dayOfWeek}요일</span>
            <span>🕐 {blockPopup.block.startTime.slice(0,5)} ~ {blockPopup.block.endTime.slice(0,5)}</span>
          </div>
          {isMyView&&(
            <button className="cs-popup-delete-btn" onClick={()=>handleDeleteBlock(blockPopup.block.blockId)}>
              🗑 삭제
            </button>
          )}
        </div>
      )}

      <WorkspaceTabBar active="board" onTabChange={handleTabChange}/>
    </div>
  );
}
