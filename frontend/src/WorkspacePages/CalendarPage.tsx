import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
import PixelAvatar from "../components/PixelAvatar";
import client from "../api/client";
import "./CalendarPage.css";

// ── 타입 ─────────────────────────────────────────────────────────────
interface Workspace { id: string; name: string; gradient: string; }
interface ScheduleBlockItem {
  blockId: string; category: string; title: string;
  dayOfWeek: string; startTime: string; endTime: string;
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
interface CalendarBar {
  taskId: string; title: string; color: string;
  assigneeName?: string; assigneeId?: string;
  rawStart: string; rawEnd: string; visStart: string; visEnd: string;
}

// ── 상수 ─────────────────────────────────────────────────────────────
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
  TASK:"rgba(245,158,11,0.13)",  FREE:"rgba(34,197,94,0.13)",
};
const CAT_LABEL: Record<string,string> = {
  CLASS:"수업", PRIVATE:"개인", TASK:"태스크", FREE:"공강",
};
const HOUR_START = 8, HOUR_END = 22;
const TIMETABLE_HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);
const HOUR_H = 52;
const MAX_SLOTS = 3, CARD_H = 26, CARD_GAP = 4, DAY_NUM_H = 26;

// ── 유틸 ─────────────────────────────────────────────────────────────
const timeToMins = (t: string) => { const [h,m] = t.split(":").map(Number); return h*60+m; };
const minsToTime = (m: number) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
const timeToTop  = (t: string) => (timeToMins(t) - HOUR_START*60) / 60 * HOUR_H;
const timeToH    = (s: string, e: string) => Math.max((timeToMins(e)-timeToMins(s))/60*HOUR_H, 20);
const pad2 = (n: number) => String(n).padStart(2,"0");

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

function computeBarMap(tasks:Task[],year:number,month:number):Record<string,BarSegment[]>{
  const firstDay=toDateStr(year,month,1),lastDay=toDateStr(year,month,new Date(year,month+1,0).getDate());
  const bars: CalendarBar[]=tasks.filter(t=>t.dueDate).map((t): CalendarBar|null=>{
    const rawStart=(t.startDate||t.dueDate!).slice(0,10),rawEnd=t.dueDate!.slice(0,10);
    if(rawEnd<firstDay||rawStart>lastDay)return null;
    return{taskId:t.taskId,title:t.title,color:STATUS_COLOR[t.status]??"#bbb",assigneeName:t.assigneeName,assigneeId:t.assigneeId,rawStart,rawEnd,visStart:rawStart<firstDay?firstDay:rawStart,visEnd:rawEnd>lastDay?lastDay:rawEnd};
  }).filter((bar): bar is CalendarBar => bar !== null);
  bars.sort((a,b)=>a.rawStart.localeCompare(b.rawStart)||a.taskId.localeCompare(b.taskId));
  const slotEnds:string[]=[];
  const placed=bars.map(bar=>{let slot=slotEnds.findIndex(e=>e<bar.visStart);if(slot===-1)slot=slotEnds.length;slotEnds[slot]=bar.visEnd;return{...bar,slot};});
  const dsOf=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const map:Record<string,BarSegment[]>={};
  for(const bar of placed){const cur=new Date(bar.visStart+"T00:00:00"),end=new Date(bar.visEnd+"T00:00:00");while(cur<=end){const ds=dsOf(cur);if(!map[ds])map[ds]=[];map[ds].push({taskId:bar.taskId,title:bar.title,color:bar.color,slot:bar.slot,isStart:ds===bar.visStart,isEnd:ds===bar.visEnd,showTitle:false,assigneeName:bar.assigneeName,assigneeId:bar.assigneeId,rawStart:bar.rawStart,rawEnd:bar.rawEnd});cur.setDate(cur.getDate()+1);}}
  for(const bar of placed){const barEnd=new Date(bar.visEnd+"T00:00:00");let rs=new Date(bar.visStart+"T00:00:00");while(rs<=barEnd){const re=new Date(rs);while(re.getDay()!==6&&re.getTime()<barEnd.getTime())re.setDate(re.getDate()+1);const mid=dsOf(new Date(Math.round((rs.getTime()+re.getTime())/2)));const seg=map[mid]?.find(s=>s.taskId===bar.taskId);if(seg)seg.showTitle=true;if(re.getDay()===6&&re.getTime()<barEnd.getTime()){re.setDate(re.getDate()+1);rs=new Date(re);}else break;}}
  return map;
}

function computeCommonFree(blockMap:Record<string,ScheduleBlockItem[]>,ids:string[]):ScheduleBlockItem[]{
  const registeredIds=Array.from(new Set(ids));
  if(registeredIds.length===0)return[];
  const result:ScheduleBlockItem[]=[];
  for(const day of DAYS_WEEK){
    let start:number|null=null;
    for(let m=HOUR_START*60;m<HOUR_END*60;m+=15){
      const allFree=registeredIds.every(uid=>
        !(blockMap[uid]??[])
          .filter(b=>b.category!=="FREE")
          .some(b=>b.dayOfWeek===day&&timeToMins(b.startTime)<m+15&&m<timeToMins(b.endTime))
      );
      if(allFree){if(start===null)start=m;}
      else if(start!==null){
        if(m-start>=30){
          result.push({blockId:`cmb-${day}-${start}`,category:"FREE",title:`공통 공강 (${registeredIds.length}명)`,dayOfWeek:day,startTime:minsToTime(start),endTime:minsToTime(m)});
        }
        start=null;
      }
    }
    if(start!==null&&HOUR_END*60-start>=30)result.push({blockId:`cmb-${day}-${start}`,category:"FREE",title:`공통 공강 (${registeredIds.length}명)`,dayOfWeek:day,startTime:minsToTime(start),endTime:minsToTime(HOUR_END*60)});
  }
  return result;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────
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

  // 달력
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

  // 시간표 — 핵심 상태
  const [blockMap,setBlockMap]=useState<Record<string,ScheduleBlockItem[]>>({});
  const [viewingUserId,setViewingUserId]=useState(myUserId); // 현재 보는 사람
  const [showCombined,setShowCombined]=useState(false);      // 공강 종합 모드

  // 팝업
  const [addPopup,setAddPopup]=useState<{day:string;startHour:number;x:number;y:number}|null>(null);
  const [addForm,setAddForm]=useState({title:"",category:"CLASS",endHour:10});
  const [blockPopup,setBlockPopup]=useState<{block:ScheduleBlockItem;x:number;y:number}|null>(null);
  const popupRef=useRef<HTMLDivElement>(null);

  // 드래그
  const dragRef=useRef<{day:string;startHour:number;endHour:number}|null>(null);
  const [dragHighlight,setDragHighlight]=useState<{day:string;startHour:number;endHour:number}|null>(null);

  const isMyView=!showCombined && viewingUserId===myUserId;
  const combinedUserIds=useMemo(
    ()=>Array.from(new Set(
      [myUserId,...wsMembers.map(m=>m.userId)].filter((uid):uid is string=>Boolean(uid))
    )).filter(uid=>blockMap[uid]!==undefined),
    [myUserId,wsMembers,blockMap]
  );

  // 화면에 표시할 블록
  const displayBlocks=useMemo(()=>{
    if(showCombined){
      return computeCommonFree(blockMap,combinedUserIds);
    }
    return blockMap[viewingUserId]??[];
  },[showCombined,viewingUserId,blockMap,combinedUserIds]);

  // 팝업 외부 클릭 닫기
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(popupRef.current&&!popupRef.current.contains(e.target as Node)){setAddPopup(null);setBlockPopup(null);}};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[]);

  // 드래그 전역 mouseup
  useEffect(()=>{
    const h=(e:MouseEvent)=>{
      const drag=dragRef.current;if(!drag)return;
      dragRef.current=null;setDragHighlight(null);document.body.style.cursor="";
      const startH=Math.min(drag.startHour,drag.endHour),endH=Math.min(Math.max(drag.startHour,drag.endHour)+1,HOUR_END);
      setAddPopup({day:drag.day,startHour:startH,x:e.clientX,y:e.clientY});
      setAddForm({title:"",category:"CLASS",endHour:endH});
    };
    document.addEventListener("mouseup",h);return()=>document.removeEventListener("mouseup",h);
  },[]);

  // 시간표 fetch (캐시)
  const fetchSchedule=useCallback(async(userId:string)=>{
    if(blockMap[userId]!==undefined)return;
    try{
      const res=await client.get(`/schedules/${userId}`);
      setBlockMap(p=>({...p,[userId]:res.data??[]}));
    }catch(err){
      console.error("시간표 조회 실패:",err);
    }
  },[blockMap]);

  useEffect(()=>{if(myUserId)fetchSchedule(myUserId);},[myUserId]);
  useEffect(()=>{wsMembers.forEach(m=>fetchSchedule(m.userId));},[wsMembers]);

  useEffect(()=>{
    if(!workspace?.id)return;
    client.get(`/workspaces/${workspace.id}/tasks`).then(r=>setTasks(r.data.data??[])).catch(console.error);
    client.get(`/workspaces/${workspace.id}/members`).then(r=>setWsMembers(r.data.data??[])).catch(console.error);
  },[workspace?.id]);

  // 아바타 클릭 → 해당 시간표로 전환
  const selectMember=(userId:string)=>{
    setShowCombined(false);
    setViewingUserId(userId);
    fetchSchedule(userId);
    setAddPopup(null);setBlockPopup(null);
  };

  // 달력 계산
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

  // ── 드래그 핸들러 ────────────────────────────────────────────────
  const handleCellMouseDown=(e:React.MouseEvent,day:string,hour:number)=>{
    const existing=(blockMap[myUserId]??[]).find(b=>b.dayOfWeek===day&&timeToMins(b.startTime)<=hour*60&&hour*60<timeToMins(b.endTime));
    if(existing){setBlockPopup({block:existing,x:e.clientX,y:e.clientY});setAddPopup(null);return;}
    e.preventDefault();
    dragRef.current={day,startHour:hour,endHour:hour};
    setDragHighlight({day,startHour:hour,endHour:hour});
    setAddPopup(null);setBlockPopup(null);
    document.body.style.cursor="ns-resize";
  };
  const handleCellMouseEnter=(day:string,hour:number)=>{
    const drag=dragRef.current;if(!drag||drag.day!==day)return;
    drag.endHour=hour;setDragHighlight({day,startHour:drag.startHour,endHour:hour});
  };
  const handleBlockMouseDown=(e:React.MouseEvent,block:ScheduleBlockItem)=>{
    e.stopPropagation();setBlockPopup({block,x:e.clientX,y:e.clientY});setAddPopup(null);
  };

  // ── 추가/삭제 ────────────────────────────────────────────────────
  const handleAddBlock=async()=>{
    if(!addPopup||!addForm.title.trim())return;
    try{
      const res=await client.post("/schedules",{userId:myUserId,title:addForm.title.trim(),category:addForm.category,dayOfWeek:addPopup.day,startTime:`${pad2(addPopup.startHour)}:00:00`,endTime:`${pad2(addForm.endHour)}:00:00`});
      setBlockMap(p=>({...p,[myUserId]:[...(p[myUserId]??[]),res.data]}));
      setAddPopup(null);
    }catch(err){console.error("시간표 추가 실패:",err);alert("시간표 추가에 실패했습니다.");}
  };
  const handleDeleteBlock=async(blockId:string)=>{
    try{
      await client.delete(`/schedules/blocks/${blockId}`);
      setBlockMap(p=>({...p,[myUserId]:(p[myUserId]??[]).filter(b=>b.blockId!==blockId)}));
      setBlockPopup(null);
    }catch(err){console.error("삭제 실패:",err);alert("삭제에 실패했습니다.");}
  };

  // ── 시간표 그리드 렌더 ──────────────────────────────────────────
  const renderTimetable=(blocks:ScheduleBlockItem[],editable:boolean)=>(
    <div className="cs-timetable-wrap">
      <div className="cs-timetable">
        <div className="cs-time-col">
          <div className="cs-day-header-empty"/>
          {TIMETABLE_HOURS.map(h=><div key={h} className="cs-hour-label">{pad2(h)}:00</div>)}
        </div>
        {DAYS_WEEK.map(day=>{
          const dayBlocks=blocks.filter(b=>b.dayOfWeek===day);
          return(
            <div key={day} className="cs-day-col">
              <div className="cs-day-header">{day}</div>
              <div className={`cs-day-body ${editable?"cs-day-editable":""}`}>
                {TIMETABLE_HOURS.map(h=>(
                  <div key={h} className="cs-hour-cell"
                    onMouseDown={editable?(e)=>handleCellMouseDown(e,day,h):undefined}
                    onMouseEnter={editable?()=>handleCellMouseEnter(day,h):undefined}
                  />
                ))}
                {editable&&dragHighlight&&dragHighlight.day===day&&(()=>{
                  const s=Math.min(dragHighlight.startHour,dragHighlight.endHour);
                  const e2=Math.min(Math.max(dragHighlight.startHour,dragHighlight.endHour)+1,HOUR_END);
                  return<div className="cs-drag-preview" style={{top:timeToTop(`${pad2(s)}:00`),height:timeToH(`${pad2(s)}:00`,`${pad2(e2)}:00`)}}>{`${pad2(s)}:00 ~ ${pad2(e2)}:00`}</div>;
                })()}
                {dayBlocks.map(block=>{
                  const top=timeToTop(block.startTime),height=timeToH(block.startTime,block.endTime);
                  const color=CAT_COLOR[block.category]??"#888",bg=CAT_BG[block.category]??"rgba(136,136,136,0.13)";
                  return(
                    <div key={block.blockId} className="cs-block" style={{top,height,background:bg,borderLeft:`3px solid ${color}`}}
                      onMouseDown={editable?(e)=>handleBlockMouseDown(e,block):undefined}>
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
  );

  const teamMemberList=wsMembers.filter(m=>m.userId!==myUserId);

  return (
    <div className="cal-page">
      <Header workspaces={workspaces}/>
      <BoardSubHeader wsName={wsName} members={wsMembers} workspace={workspace} workspaces={workspaces} initialSelected="Calender"/>

      <div className="cal-body" style={{background:gradient}}>

        {/* 커뮤니티 패널 */}
        <aside className={`wsp-community ${showCommunity?"panel-visible":"panel-hidden"}`}>
          <div className="wsp-panel-title"><span className="wsp-panel-icon">💬</span>community</div>
          <input className="wsp-search" placeholder="채널 및 메시지 검색..."/>
          <div className="wsp-channel-label">채널</div>
          <div className="wsp-channel-item"># 일반</div>
          <div className="wsp-msg-list">{messages.length===0?<div className="wsp-msg-empty">메시지가 없습니다.</div>:messages.map((m,i)=><div key={i} className="wsp-msg-item"><div className="wsp-msg-header"><span className="wsp-msg-name">{m.user}</span><span className="wsp-msg-time">{m.time}</span></div><div className="wsp-msg-text">{m.text}</div></div>)}</div>
          {writingMsg?(<div className="wsp-msg-form"><textarea className="wsp-msg-input" value={msgInput} onChange={e=>setMsgInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSendMsg();}}} autoFocus/><div className="wsp-msg-actions"><button className="wsp-msg-send" onClick={handleSendMsg}>전송</button><button className="wsp-msg-cancel" onClick={()=>{setWritingMsg(false);setMsgInput("");}}>취소</button></div></div>):(<button className="wsp-new-msg-btn" onClick={()=>setWritingMsg(true)}>새 메시지 작성</button>)}
        </aside>

        {/* 플래너 패널 */}
        <aside className={`wsp-planner ${showPlanner?"panel-visible":"panel-hidden"}`}>
          <div className="wsp-panel-title"><span className="wsp-panel-icon">📅</span>Planner</div>
          <div className="wsp-cal-header"><button className="wsp-cal-nav" onClick={prevPlan}>‹</button><span className="wsp-cal-title">{plannerYear}년 {plannerMonth+1}월</span><button className="wsp-cal-nav" onClick={nextPlan}>›</button></div>
          <div className="wsp-cal-grid">{DAYS_KO.map(d=><div key={d} className={`wsp-cal-day-label ${d==="일"?"sun":d==="토"?"sat":""}`}>{d}</div>)}{plannerDays.map((d,i)=>{const isToday=d===today.getDate()&&plannerMonth===today.getMonth()&&plannerYear===today.getFullYear();const ds=d?`${plannerYear}-${String(plannerMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`:"";const dots=ds?(plannerDotMap[ds]??[]):[];return(<div key={i} className={`wsp-cal-day ${!d?"empty":""} ${isToday?"today":""}`}>{d}{dots.length>0&&<div className="planner-dots">{dots.map((c,j)=><span key={j} className="planner-dot" style={{background:c}}/>)}</div>}</div>);})}</div>
          <div className="wsp-upcoming-label">다가오는 마감일</div>
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
                return(
                  <div key={i} className={`cal-cell ${!day?"empty":""} ${isToday?"today":""} ${colIdx===0?"sun":colIdx===6?"sat":""}`} style={{minHeight:`${DAY_NUM_H+MAX_SLOTS*(CARD_H+CARD_GAP)+4}px`}}>
                    {day&&(<><span className="cal-day-num">{day}</span><div className="cal-cards-area">{slotArr.map((seg,si)=>{if(!seg)return<div key={si} className="cal-card-placeholder" style={{height:CARD_H+CARD_GAP}}/>;const vs=seg.isStart||colIdx===0,ve=seg.isEnd||colIdx===6;return(<div key={seg.taskId} className={`cal-event-card ${vs?"card-start":""} ${ve?"card-end":""}`} style={{top:`${DAY_NUM_H+si*(CARD_H+CARD_GAP)}px`,background:hexToRgba(seg.color,0.18),borderTop:`3px solid ${seg.color}`,boxShadow:vs?`inset 3px 0 0 ${seg.color}`:undefined}} title={seg.title}><div className="cal-event-body">{seg.showTitle&&<span className="cal-event-title" style={{color:seg.color}}>{seg.title}</span>}{seg.isEnd&&<span className="cal-event-avatar" style={{background:avatarColor(seg.assigneeId,wsMembers)}}>{seg.assigneeName?seg.assigneeName[0]:""}</span>}</div></div>);})}</div></>)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 시간표 섹션 ── */}
          <div className="cs-section">

            {/* 헤더 */}
            <div className="cs-header">
              <div className="cs-header-left">
                <h3 className="cs-title">시간표</h3>
              </div>
              <div className="cs-header-right">
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

            {/* ── 가로 아바타 row ── */}
            <div className="cs-avatar-row">
              {/* 내 아바타 */}
              <button
                className={`cs-avatar-tab ${!showCombined&&viewingUserId===myUserId?"cs-avatar-tab--active":""}`}
                onClick={()=>selectMember(myUserId)}
              >
                <PixelAvatar userId={myUserId} name={myName} size="sm"/>
                <span className="cs-avatar-tab-name">나</span>
              </button>

              {/* 팀원 아바타들 */}
              {teamMemberList.map(m=>(
                <button
                  key={m.userId}
                  className={`cs-avatar-tab ${!showCombined&&viewingUserId===m.userId?"cs-avatar-tab--active":""}`}
                  onClick={()=>selectMember(m.userId)}
                  title={`${m.name}의 시간표`}
                >
                  <PixelAvatar userId={m.userId} name={m.name} size="sm"/>
                  <span className="cs-avatar-tab-name">{m.name.slice(0,4)}</span>
                </button>
              ))}

              {/* 공강 종합 버튼 — 오른쪽 끝 */}
              {teamMemberList.length>0&&(
                <button
                  className={`cs-combined-tab ${showCombined?"cs-combined-tab--active":""}`}
                  onClick={()=>{setShowCombined(v=>!v);setAddPopup(null);setBlockPopup(null);}}
                >
                  공강 종합
                </button>
              )}
            </div>

            {/* 현재 보는 시간표 타이틀 */}
            <div className="cs-viewing-bar">
              {showCombined
                ? `팀 전체 공강 종합 (${combinedUserIds.length}명 시간표 기준)`
                : viewingUserId===myUserId
                  ? `내 시간표 — 클릭 또는 드래그로 수업 추가`
                  : `${wsMembers.find(m=>m.userId===viewingUserId)?.name??"팀원"}의 시간표 (읽기 전용)`
              }
            </div>

            {/* 시간표 그리드 — 선택된 사람 것만 표시 */}
            {renderTimetable(displayBlocks, isMyView)}

            {displayBlocks.length===0&&(
              <p className="cs-empty">
                {showCombined
                  ? "공통 공강 시간이 없습니다. 팀원들이 시간표를 등록하면 수업/개인/태스크 시간을 제외하고 자동으로 계산됩니다."
                  : isMyView
                    ? "클릭 또는 드래그해서 시간표를 채워보세요."
                    : "이 팀원이 아직 시간표를 등록하지 않았습니다."}
              </p>
            )}
          </div>
        </main>
      </div>

      {/* 수업 추가 팝업 */}
      {addPopup&&(
        <div ref={popupRef} className="cs-popup" style={{left:Math.min(addPopup.x,window.innerWidth-260),top:Math.min(addPopup.y,window.innerHeight-280)}}>
          <div className="cs-popup-header">
            <span>{addPopup.day}요일 {pad2(addPopup.startHour)}:00 ~ {pad2(addForm.endHour)}:00</span>
            <button className="cs-popup-close" onClick={()=>setAddPopup(null)}>✕</button>
          </div>
          <input className="cs-popup-input" placeholder="수업명 / 일정명" value={addForm.title}
            onChange={e=>setAddForm(p=>({...p,title:e.target.value}))}
            onKeyDown={e=>{if(e.key==="Enter")handleAddBlock();if(e.key==="Escape")setAddPopup(null);}}
            autoFocus/>
          <div className="cs-popup-row">
            <label className="cs-popup-label">종류</label>
            <select className="cs-popup-select" value={addForm.category} onChange={e=>setAddForm(p=>({...p,category:e.target.value}))}>
              <option value="CLASS">수업</option>
              <option value="PRIVATE">개인</option>
              <option value="FREE">공강</option>
              <option value="TASK">태스크</option>
            </select>
          </div>
          <div className="cs-popup-row">
            <label className="cs-popup-label">끝</label>
            <select className="cs-popup-select" value={addForm.endHour} onChange={e=>setAddForm(p=>({...p,endHour:Number(e.target.value)}))}>
              {TIMETABLE_HOURS.filter(h=>h>addPopup.startHour).map(h=>(
                <option key={h} value={h}>{pad2(h)}:00</option>
              ))}
            </select>
          </div>
          <button className="cs-popup-btn" style={{background:CAT_COLOR[addForm.category]}} onClick={handleAddBlock}>추가</button>
        </div>
      )}

      {/* 블록 정보 팝업 */}
      {blockPopup&&(
        <div ref={popupRef} className="cs-popup" style={{left:Math.min(blockPopup.x,window.innerWidth-240),top:Math.min(blockPopup.y,window.innerHeight-180)}}>
          <div className="cs-popup-header" style={{background:CAT_BG[blockPopup.block.category],borderBottom:`2px solid ${CAT_COLOR[blockPopup.block.category]}`}}>
            <div>
              <span className="cs-popup-cat-label" style={{color:CAT_COLOR[blockPopup.block.category]}}>{CAT_LABEL[blockPopup.block.category]}</span>
              <span className="cs-popup-block-title">{blockPopup.block.title}</span>
            </div>
            <button className="cs-popup-close" onClick={()=>setBlockPopup(null)}>✕</button>
          </div>
          <div className="cs-popup-info">
            <span>{blockPopup.block.dayOfWeek}요일</span>
            <span>{blockPopup.block.startTime.slice(0,5)} ~ {blockPopup.block.endTime.slice(0,5)}</span>
          </div>
          <button className="cs-popup-delete-btn" onClick={()=>handleDeleteBlock(blockPopup.block.blockId)}>삭제</button>
        </div>
      )}

      <WorkspaceTabBar active="board" onTabChange={handleTabChange}/>
    </div>
  );
}
