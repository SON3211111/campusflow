/**
 * 워크스페이스 메인 페이지 (칸반 보드)
 * - 좌측: Community 패널(채널 목록 + 메시지)
 * - 중앙: Planner 패널(캘린더 + 마감일)
 * - 우측: 칸반 보드(드래그앤드롭, 태스크 CRUD, 소프트 삭제/복원)
 * 마우스 클릭+드래그로 보드 좌우 패닝 지원
 */
import { useState, useEffect, useRef, useMemo } from "react";
import type { MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
import CardDetailModal from "../components/CardDetailModal";
import BoardSlideView from "../components/BoardSlideView";
import client from "../api/client";
import AITaskModal from "../components/AITaskModal";
import "./WorkSpacePage.css";

interface Workspace {
  id: string;
  name: string;
  gradient: string;
}

interface CardItem {
  id: string;
  title: string;
  desc: string;
  startDate?: string;
  dueDate?: string;
  comments: { user: string; text: string; time: string }[];
}

function renderMentions(text: string, members: { name: string }[]) {
  return text.split(/(@[\w가-힣]+)/g).map((part, i) => {
    if (part.startsWith("@") && members.some(m => m.name === part.slice(1)))
      return <span key={i} className="cp-mention">{part}</span>;
    return <span key={i}>{part}</span>;
  });
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS_KO = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const TODAY = new Date();

const STATUS_COLOR_MAP: Record<string, string> = {
  "상태 없음": "#aaa", "시작하지 않음": "#888",
  "진행 중": "#4f7cff", "보류 중": "#f59e0b", "완료": "#22c55e",
};

const COL_TO_STATUS: Record<string, string> = {
  "상태 없음": "TODO",
  "시작하지 않음": "REVIEW",
  "진행 중": "DOING",
  "보류 중": "ISSUE",
  "완료": "DONE",
};

const STATUS_TO_COL: Record<string, string> = {
  TODO: "상태 없음",
  REVIEW: "시작하지 않음",
  DOING: "진행 중",
  ISSUE: "보류 중",
  DONE: "완료",
};

const BSV_KEY_TO_STATUS: Record<string, string> = {
  none: "TODO",
  notStarted: "REVIEW",
  inProgress: "DOING",
  hold: "ISSUE",
  done: "DONE",
};

const COL_TO_BSV_KEY: Record<string, string> = {
  "상태 없음": "none",
  "시작하지 않음": "notStarted",
  "진행 중": "inProgress",
  "보류 중": "hold",
  "완료": "done",
};

const INITIAL_COLS = ["상태 없음", "시작하지 않음", "진행 중", "보류 중", "완료"];

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1).getDay();
  const last = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(first).fill(null);
  for (let i = 1; i <= last; i++) days.push(i);
  return days;
}

export default function WorkSpacePage() {
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state: {
      workspace?: Workspace;
      workspaces?: Workspace[];
      basketTasks?: CardItem[];
    };
  };

  const savedWs    = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
  const workspace  = state?.workspace ?? state?.workspaces?.[0] ?? savedWs;
  const workspaces = state?.workspaces ?? [];
  const gradient   = workspace?.gradient ?? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)";
  const wsName     = workspace?.name ?? "워크스페이스";

  const basketTasks = (state?.basketTasks ?? []) as CardItem[];

  const [tab, setTab]                     = useState<"board" | "planner" | "community" | "personal">("board");
  const [wsMembers, setWsMembers]         = useState<{ userId: string; name: string }[]>([]);
  const [showPlanner, setShowPlanner]     = useState(true);
  const [showCommunity, setShowCommunity] = useState(true);
  const [showBoardView, setShowBoardView] = useState(basketTasks.length > 0);
  const [loading, setLoading]             = useState(true);
  const [showLanding, setShowLanding]     = useState(false);
  const [aiTaskOpen, setAiTaskOpen]       = useState(false);
  const [trashOpen, setTrashOpen]         = useState(false);
  const [deletedCards, setDeletedCards]   = useState<CardItem[]>([]);

  const [messages, setMessages] = useState<{ user: string; userId: string; text: string; time: string }[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [writingMsg, setWritingMsg] = useState(false);

  const [cpPosts,      setCpPosts]      = useState<{postId:string;title:string;content:string;authorId:string;authorName:string;solved:boolean;createdAt:string}[]>([]);
  const [cpTab,        setCpTab]        = useState<"unsolved"|"solved">("unsolved");
  const [cpSearch,     setCpSearch]     = useState("");
  const [cpDetail,     setCpDetail]     = useState<{postId:string;title:string;content:string;authorId:string;authorName:string;solved:boolean;createdAt:string;comments:{commentId:string;content:string;helperName:string;isAdopted:boolean;replies:{commentId:string;content:string;helperName:string}[]}[]}|null>(null);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm,     setPostForm]     = useState({title:"",content:""});
  const [cpComment,    setCpComment]    = useState("");

  useEffect(() => { if (showCommunity) client.get("/community").then(r=>setCpPosts(r.data??[])).catch(()=>{}); }, [showCommunity]);
  const fetchCpPosts = () => client.get("/community").then(r=>setCpPosts(r.data??[])).catch(()=>{});
  const openCpDetail = async(id:string)=>{ try{const r=await client.get(`/community/${id}`);setCpDetail(r.data);setCpComment("");}catch{} };
  const handleCpSubmit = async()=>{ if(!postForm.title.trim()||!postForm.content.trim()||!workspace?.id)return; await client.post("/community",{title:postForm.title,content:postForm.content,userId:localStorage.getItem("userId"),workspaceId:workspace.id}).catch(()=>{}); fetchCpPosts();setPostForm({title:"",content:""});setShowPostForm(false); };
  const handleCpComment = async()=>{ if(!cpComment.trim()||!cpDetail)return; await client.post(`/community/${cpDetail.postId}/comments`,{content:cpComment,userId:localStorage.getItem("userId")}).catch(()=>{}); const r=await client.get(`/community/${cpDetail.postId}`).catch(()=>null); if(r){setCpDetail(r.data);setCpComment("");} };
  const cpTimeAgo=(d:string)=>{const m=Math.floor((Date.now()-new Date(d).getTime())/60000);return m<1?"방금":m<60?`${m}분 전`:m<1440?`${Math.floor(m/60)}시간 전`:`${Math.floor(m/1440)}일 전`;};
  const cpFiltered=cpPosts.filter(p=>cpTab==="unsolved"?!p.solved:p.solved).filter(p=>p.title.includes(cpSearch)||p.content.includes(cpSearch));
  const cpUnsolved=cpPosts.filter(p=>!p.solved).length;
  const handleCpDeletePost=async(id:string)=>{await client.delete(`/community/${id}`).catch(()=>{});fetchCpPosts();setCpDetail(null);};
  const handleCpUpdate=async(id:string)=>{await client.patch(`/community/${id}`,{title:cpEditForm.title,content:cpEditForm.content}).catch(()=>{});fetchCpPosts();setCpEditingId(null);};
  const handleCpSolve=async(id:string)=>{await client.patch(`/community/${id}/solve`).catch(()=>{});fetchCpPosts();};
  const [cpEditingId,setCpEditingId]=useState<string|null>(null);
  const [cpEditForm,setCpEditForm]=useState({title:"",content:""});
  const cpMyId=localStorage.getItem("userId");

  const handleSendMsg = () => {
    if (!msgInput.trim()) return;
    const userName = localStorage.getItem("userName") ?? "나";
    setMessages((prev) => [...prev, { user: userName, userId: localStorage.getItem("userId") ?? "", text: msgInput.trim(), time: "방금" }]);
    setMsgInput("");
    setWritingMsg(false);
  };

  const [calYear, setCalYear]   = useState(TODAY.getFullYear());
  const [calMonth, setCalMonth] = useState(TODAY.getMonth());

  const emptyCards = () => Object.fromEntries(INITIAL_COLS.map((c) => [c, [] as CardItem[]]));

  const [cols, setCols]             = useState(INITIAL_COLS);
  const [addingList, setAddingList] = useState(false);
  const [listName, setListName]     = useState("");

  const [cards, setCards] = useState<{ [col: string]: CardItem[] }>(emptyCards());

  const hasPostedBasket = useRef(false);
  const columnsRef = useRef<HTMLDivElement>(null);
  const panState = useRef({ active: false, x: 0, scrollLeft: 0, moved: false });

  useEffect(() => {
    if (workspace?.id) {
      client.get(`/workspaces/${workspace.id}/members`)
        .then((res) => setWsMembers(res.data.data ?? []))
        .catch(() => {});
    }
  }, [workspace?.id]);

  useEffect(() => {
    if (!workspace?.id) {
      setShowLanding(true);
      setLoading(false);
      return;
    }

    const init = async () => {
      if (!hasPostedBasket.current && basketTasks.length > 0) {
        hasPostedBasket.current = true;
        const currentUserId = localStorage.getItem("userId");
        for (const bt of basketTasks) {
          try {
            await client.post(`/workspaces/${workspace.id}/tasks`, {
              title: bt.title,
              description: bt.desc || "",
              status: "TODO",
              assigneeId: currentUserId,
            });
          } catch {}
        }
      }

      try {
        const res = await client.get(`/workspaces/${workspace.id}/tasks`);
        const newCards = emptyCards();
        for (const t of (res.data.data ?? [])) {
          const col = STATUS_TO_COL[t.status] ?? "상태 없음";
          if (newCards[col]) {
            newCards[col].push({ id: t.taskId, title: t.title, desc: t.description ?? "", startDate: t.startDate ?? "", dueDate: t.dueDate ?? "", comments: [] });
          }
        }
        setCards(newCards);
        const hasTasks = Object.values(newCards).flat().length > 0 || basketTasks.length > 0;
        setShowLanding(!hasTasks);
      } catch {
        setShowLanding(basketTasks.length === 0);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [workspace?.id]);

  const loadTrash = async () => {
    if (!workspace?.id) return;
    try {
      const res = await client.get(`/workspaces/${workspace.id}/tasks/trash`);
      setDeletedCards(
        (res.data.data ?? []).map((t: any) => ({
          id: t.taskId,
          title: t.title,
          desc: t.description ?? "",
          dueDate: t.dueDate ?? "",
          comments: [],
        }))
      );
    } catch {
      setDeletedCards([]);
    }
  };

  const handleAddList = () => {
    if (!listName.trim()) return;
    const name = listName.trim();
    setCols((prev) => [...prev, name]);
    setCards((prev) => ({ ...prev, [name]: [] }));
    setListName("");
    setAddingList(false);
  };

  const [addingCol, setAddingCol]         = useState<string | null>(null);
  const [inputVal, setInputVal]           = useState("");
  const [selectedCard, setSelectedCard]   = useState<{ card: CardItem; col: string } | null>(null);
  const [slideCard, setSlideCard]         = useState<{ title: string; desc: string; dueDate?: string; comments: any[] } | null>(null);
  const [draggingCard, setDraggingCard]   = useState<{ card: CardItem; col: string } | null>(null);
  const [dragOverCol, setDragOverCol]     = useState<string | null>(null);

  const handleCardDrop = async (targetCol: string) => {
    if (!draggingCard || draggingCard.col === targetCol) return;
    const { card, col: sourceCol } = draggingCard;
    setCards((prev) => ({
      ...prev,
      [sourceCol]: prev[sourceCol].filter((c) => c.id !== card.id),
      [targetCol]: [...(prev[targetCol] ?? []), card],
    }));
    setDraggingCard(null);
    setDragOverCol(null);

    const newStatus = COL_TO_STATUS[targetCol];
    if (newStatus && workspace?.id) {
      try {
        await client.patch(`/workspaces/${workspace.id}/tasks/${card.id}/status?status=${newStatus}`);
      } catch {}
    }
  };

  const handleAddCard = async (col: string) => {
    if (!inputVal.trim()) return;
    const title = inputVal.trim();
    const status = COL_TO_STATUS[col] ?? "TODO";

    if (workspace?.id) {
      try {
        const currentUserId = localStorage.getItem("userId");
        const res = await client.post(`/workspaces/${workspace.id}/tasks`, {
          title,
          description: "",
          status,
          assigneeId: currentUserId,
        });
        const newCard: CardItem = {
          id: res.data.data.taskId,
          title: res.data.data.title,
          desc: res.data.data.description ?? "",
          startDate: res.data.data.startDate ?? "",
          dueDate: res.data.data.dueDate ?? "",
          comments: [],
        };
        setCards((prev) => ({ ...prev, [col]: [...(prev[col] ?? []), newCard] }));
      } catch (err: any) {
        alert(`태스크 저장에 실패했습니다: ${err?.response?.data?.message ?? err?.message ?? "알 수 없는 오류"}`);
      }
    } else {
      const newCard: CardItem = { id: Date.now().toString(), title, desc: "", startDate: "", dueDate: "", comments: [] };
      setCards((prev) => ({ ...prev, [col]: [...(prev[col] ?? []), newCard] }));
    }
    setInputVal("");
    setAddingCol(null);
  };

  const handleDeleteCard = async (col: string, cardId: string) => {
    const card = cards[col]?.find((c) => c.id === cardId);
    setCards((prev) => ({ ...prev, [col]: prev[col].filter((c) => c.id !== cardId) }));
    if (card) setDeletedCards((prev) => [card, ...prev.filter((c) => c.id !== cardId)]);
    if (workspace?.id) {
      try {
        await client.delete(`/workspaces/${workspace.id}/tasks/${cardId}`);
      } catch {}
    }
  };

  const handleRestoreCard = async (card: CardItem) => {
    if (!workspace?.id) return;
    try {
      const res = await client.patch(`/workspaces/${workspace.id}/tasks/${card.id}/restore`);
      const restored: CardItem = {
        id: res.data.data.taskId,
        title: res.data.data.title,
        desc: res.data.data.description ?? "",
        startDate: res.data.data.startDate ?? "",
        dueDate: res.data.data.dueDate ?? "",
        comments: [],
      };
      const col = STATUS_TO_COL[res.data.data.status] ?? "상태 없음";
      setCards((prev) => ({ ...prev, [col]: [...(prev[col] ?? []), restored] }));
      setDeletedCards((prev) => prev.filter((c) => c.id !== card.id));
      setShowLanding(false);
    } catch {}
  };

  const openTrash = async () => {
    await loadTrash();
    setTrashOpen(true);
  };

  // 보드 마우스 패닝: 버튼/입력 요소 위에서는 패닝 비활성화
  const handleBoardMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!columnsRef.current || (e.target as HTMLElement).closest("button, input, textarea")) return;
    panState.current = {
      active: true,
      x: e.pageX,
      scrollLeft: columnsRef.current.scrollLeft,
      moved: false,
    };
  };

  const handleBoardMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const state = panState.current;
    if (!state.active || !columnsRef.current) return;
    const delta = e.pageX - state.x;
    if (Math.abs(delta) > 4) state.moved = true;
    columnsRef.current.scrollLeft = state.scrollLeft - delta;
  };

  const stopBoardPan = () => {
    panState.current.active = false;
  };

  const handleSaveDesc = async (col: string, id: string, desc: string) => {
    setCards((prev) => ({ ...prev, [col]: prev[col].map((c) => c.id === id ? { ...c, desc } : c) }));
    if (workspace?.id) {
      try {
        await client.patch(`/workspaces/${workspace.id}/tasks/${id}/description`, { description: desc });
      } catch {}
    }
  };

  const handleSaveStartDate = async (col: string, id: string, startDate: string) => {
    setCards((prev) => ({ ...prev, [col]: prev[col].map((c) => c.id === id ? { ...c, startDate } : c) }));
    setSelectedCard((prev) => prev && prev.card.id === id ? { ...prev, card: { ...prev.card, startDate } } : prev);
    if (workspace?.id && startDate) {
      try {
        await client.patch(`/workspaces/${workspace.id}/tasks/${id}/start-date?startDate=${startDate}`);
      } catch {}
    }
  };

  const handleSaveDueDate = async (col: string, id: string, dueDate: string) => {
    setCards((prev) => ({ ...prev, [col]: prev[col].map((c) => c.id === id ? { ...c, dueDate } : c) }));
    setSelectedCard((prev) => prev && prev.card.id === id ? { ...prev, card: { ...prev.card, dueDate } } : prev);
    if (workspace?.id && dueDate) {
      try {
        await client.patch(`/workspaces/${workspace.id}/tasks/${id}/due-date?dueDate=${dueDate}`);
      } catch {}
    }
  };

  const handleSaveComments = (col: string, id: string, comments: CardItem["comments"]) => {
    setCards((prev) => ({ ...prev, [col]: prev[col].map((c) => c.id === id ? { ...c, comments } : c) }));
  };

  const handleBoardStatusChange = async (taskId: string, newColKey: string) => {
    const newStatus = BSV_KEY_TO_STATUS[newColKey];
    if (newStatus && workspace?.id) {
      try {
        await client.patch(`/workspaces/${workspace.id}/tasks/${taskId}/status?status=${newStatus}`);
      } catch {}
    }
  };

  const calDays = getCalendarDays(calYear, calMonth);

  const plannerDotMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [col, items] of Object.entries(cards)) {
      const color = STATUS_COLOR_MAP[col] ?? "#aaa";
      for (const c of items) {
        if (!c.dueDate) continue;
        const ds = c.dueDate.slice(0, 10);
        if (!map[ds]) map[ds] = [];
        if (map[ds].length < 3) map[ds].push(color);
      }
    }
    return map;
  }, [cards]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const bsvColMap = Object.fromEntries(
    INITIAL_COLS.map((col) => [
      COL_TO_BSV_KEY[col] ?? "none",
      (cards[col] ?? []).map(({ id, title, desc, comments }) => ({ id, title, desc, comments })),
    ])
  );

  const allBoardCards = Object.values(cards).flat();
  const slideInitialCards = [...basketTasks, ...allBoardCards];

  return (
    <div className="wsp-page">
      <Header workspaces={workspaces} />

      <div className="wsp-body" style={{ background: gradient }}>
        {/* 왼쪽: Community */}
        <aside className={`wsp-community ${showCommunity ? "panel-visible" : "panel-hidden"}`}>
          <div className="wsp-panel-title">
            <span className="wsp-panel-icon">💬</span> community
          </div>
          <input className="wsp-search" placeholder="도움 요청 검색..." value={cpSearch} onChange={e=>setCpSearch(e.target.value)} />
          {cpDetail ? (
            <div className="cp-detail">
              <button className="cp-back-btn" onClick={()=>setCpDetail(null)}>← 목록</button>
              <div className="cp-detail-header-row"><div className="cp-detail-title">{cpDetail.title}</div>{cpDetail.authorId===cpMyId&&<button className="cp-del-post-btn" onClick={()=>handleCpDeletePost(cpDetail.postId)}>삭제</button>}</div>
              <div className="cp-detail-meta"><span>{cpDetail.authorName}</span><span className={`cp-badge ${cpDetail.solved?"solved":"unsolved"}`}>{cpDetail.solved?"✅ 해결됨":"🔴 미해결"}</span></div>
              <p className="cp-detail-content">{renderMentions(cpDetail.content, wsMembers)}</p>
              <div className="cp-comments-title">댓글 {cpDetail.comments?.length??0}개</div>
              <div className="cp-comments-list">
                {(cpDetail.comments??[]).length===0?<div className="cp-comments-empty">첫 댓글을 달아보세요!</div>:(cpDetail.comments??[]).map(c=>(
                  <div key={c.commentId} className="cp-comment">
                    <div className="cp-comment-header"><span className="cp-comment-name">{c.helperName}</span>{c.isAdopted&&<span className="cp-adopted">채택</span>}</div>
                    <div className="cp-comment-text">{renderMentions(c.content, wsMembers)}</div>
                    {(c.replies??[]).map(r=>(<div key={r.commentId} className="cp-reply"><span className="cp-reply-name">└ {r.helperName}</span><div className="cp-comment-text">{r.content}</div></div>))}
                  </div>
                ))}
              </div>
              <div className="cp-comment-form"><input className="cp-comment-input" placeholder="댓글 작성..." value={cpComment} onChange={e=>setCpComment(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleCpComment();}}/><button className="cp-comment-send" onClick={handleCpComment}>전송</button></div>
            </div>
          ):(
            <>
              <div className="cp-tabs-row">
                <div className="cp-tabs"><button className={`cp-tab ${cpTab==="unsolved"?"active":""}`} onClick={()=>setCpTab("unsolved")}>미해결{cpUnsolved>0&&<span className="cp-tab-count">{cpUnsolved}</span>}</button><button className={`cp-tab ${cpTab==="solved"?"active":""}`} onClick={()=>setCpTab("solved")}>해결됨</button></div>
                <button className="cp-new-btn" onClick={()=>setShowPostForm(v=>!v)}>{showPostForm?"✕":"+"}</button>
              </div>
              {showPostForm&&(<div className="cp-form"><input className="cp-input" placeholder="제목" value={postForm.title} onChange={e=>setPostForm(p=>({...p,title:e.target.value}))}/><textarea className="cp-textarea" placeholder="어떤 도움이 필요하신가요?" value={postForm.content} onChange={e=>setPostForm(p=>({...p,content:e.target.value}))}/><div className="cp-form-actions"><button className="cp-submit-btn" onClick={handleCpSubmit}>요청 등록</button><button className="cp-cancel-btn" onClick={()=>setShowPostForm(false)}>취소</button></div></div>)}
              <div className="cp-list">{cpFiltered.length===0?<div className="cp-empty">{cpTab==="unsolved"?"미해결 요청이 없습니다.":"해결된 요청이 없습니다."}</div>:cpFiltered.map(p=>(<div key={p.postId} className="cp-post-item">{cpEditingId===p.postId?(<div className="cp-form" onClick={e=>e.stopPropagation()}><input className="cp-input" value={cpEditForm.title} onChange={e=>setCpEditForm(f=>({...f,title:e.target.value}))}/><textarea className="cp-textarea" value={cpEditForm.content} onChange={e=>setCpEditForm(f=>({...f,content:e.target.value}))}/><div className="cp-form-actions"><button className="cp-submit-btn" onClick={()=>handleCpUpdate(p.postId)}>저장</button><button className="cp-cancel-btn" onClick={()=>setCpEditingId(null)}>취소</button></div></div>):(<div onClick={()=>openCpDetail(p.postId)}><div className="cp-post-header"><span className={`cp-status-dot ${p.solved?"solved":"unsolved"}`}/><span className="cp-post-title">{p.title}</span>{p.authorId===cpMyId&&<>{!p.solved&&<button className="cp-solve-btn" onClick={e=>{e.stopPropagation();handleCpSolve(p.postId);}}>✓</button>}<button className="cp-edit-btn" onClick={e=>{e.stopPropagation();setCpEditingId(p.postId);setCpEditForm({title:p.title,content:p.content});}}>✏</button><button className="cp-del-btn" onClick={e=>{e.stopPropagation();handleCpDeletePost(p.postId);}}>✕</button></>}</div><div className="cp-post-preview">{p.content.slice(0,45)}{p.content.length>45?"...":""}</div><div className="cp-post-meta">{p.authorName} · {cpTimeAgo(p.createdAt)}</div></div>)}</div>))}</div>
            </>
          )}
          <div className="wsp-channel-label" style={{ marginTop: 8 }}>최근 메시지</div>
          <div className="wsp-msg-list">
            {messages.length === 0 ? (
              <div className="wsp-msg-empty">메시지가 없습니다.</div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className="wsp-msg-item">
                  <div className="wsp-msg-header">
                    <span className="wsp-msg-name">{m.user}</span>
                    <span className="wsp-msg-time">{m.time}</span>
                    {m.userId === localStorage.getItem("userId") && <button className="cp-del-btn" onClick={() => setMessages(p => p.filter((_, j) => j !== i))}>✕</button>}
                  </div>
                  <div className="wsp-msg-text">{renderMentions(m.text, wsMembers)}</div>
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

        {/* 가운데: Planner */}
        <aside className={`wsp-planner ${showPlanner ? "panel-visible" : "panel-hidden"}`}>
          <div className="wsp-panel-title">
            <span className="wsp-panel-icon">📅</span> Planner
          </div>
          <div className="wsp-cal-header">
            <button className="wsp-cal-nav" onClick={prevMonth}>‹</button>
            <span className="wsp-cal-title">{calYear}년 {calMonth + 1}월</span>
            <button className="wsp-cal-nav" onClick={nextMonth}>›</button>
          </div>
          <div className="wsp-cal-grid">
            {DAYS.map((d) => (
              <div key={d} className={`wsp-cal-day-label ${d === "일" ? "sun" : d === "토" ? "sat" : ""}`}>{d}</div>
            ))}
            {calDays.map((d, i) => {
              const isToday = d === TODAY.getDate() && calMonth === TODAY.getMonth() && calYear === TODAY.getFullYear();
              const ds = d ? `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}` : "";
              const dots = ds ? (plannerDotMap[ds] ?? []) : [];
              return (
                <div key={i} className={`wsp-cal-day ${!d ? "empty" : ""} ${isToday ? "today" : ""}`}>
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
          {(() => {
            const now = new Date(); now.setHours(0,0,0,0);
            const upcoming = Object.entries(cards).flatMap(([col, items]) =>
              items.filter(c => {
                if (!c.dueDate) return false;
                const d = new Date(c.dueDate); d.setHours(0,0,0,0);
                const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
                return diff >= 0 && diff <= 5;
              }).map(c => ({ ...c, col, daysLeft: Math.ceil((new Date(c.dueDate!).setHours(0,0,0,0) - now.getTime()) / 86400000) }))
            ).sort((a,b) => a.daysLeft - b.daysLeft);
            return (
              <>
                <div className="wsp-upcoming-label">
                  다가오는 마감일
                  {upcoming.length > 0 && <span className="wsp-upcoming-count">({upcoming.length})</span>}
                </div>
                {upcoming.length === 0
                  ? <div className="wsp-upcoming-empty">마감일이 없습니다.</div>
                  : upcoming.map(t => (
                    <div key={t.id} className="wsp-upcoming-item" style={{ borderLeftColor: STATUS_COLOR_MAP[t.col] ?? "#aaa" }}>
                      <div className="wsp-upcoming-info">
                        <span className="wsp-upcoming-name">{t.title}</span>
                        <span className="wsp-upcoming-date">⊙ {MONTHS_KO[new Date(t.dueDate!).getMonth()]} {new Date(t.dueDate!).getDate()}일 · {t.daysLeft === 0 ? "오늘" : `${t.daysLeft}일 남음`}</span>
                      </div>
                    </div>
                  ))
                }
              </>
            );
          })()}
        </aside>

        {/* 오른쪽: Board */}
        <main className="wsp-board">
          <BoardSubHeader wsName={wsName} members={wsMembers} workspace={workspace} workspaces={workspaces} onAiTaskClick={() => setAiTaskOpen(true)} />

          {loading && (
            <div className="wsp-loading">
              <span className="wsp-loading-text">불러오는 중...</span>
            </div>
          )}

          {!loading && showLanding && (
            <div className="wsp-landing">
              <div className="wsp-landing-ws-icon" style={{ background: gradient }} />
              <h2 className="wsp-landing-title">{wsName}</h2>
              <p className="wsp-landing-sub">시작할 방법을 선택하세요</p>
              <div className="wsp-landing-actions">
                <button className="wsp-landing-btn ai"
                  onClick={() => setAiTaskOpen(true)}>
                  <span className="wsp-lbtn-icon"></span>
                  <span className="wsp-lbtn-title">AI 업무 생성</span>
                  <span className="wsp-lbtn-desc">AI가 업무를 자동으로 분해합니다</span>
                </button>
                <button className="wsp-landing-btn start"
                  onClick={() => setShowLanding(false)}>
                  <span className="wsp-lbtn-icon"></span>
                  <span className="wsp-lbtn-title">바로 시작하기</span>
                  <span className="wsp-lbtn-desc">빈 보드에서 직접 업무를 추가합니다</span>
                </button>
              </div>
            </div>
          )}

          <div
            ref={columnsRef}
            className={`wsp-columns ${panState.current.active ? "panning" : ""}`}
            style={{ display: loading || showLanding ? 'none' : undefined }}
            onMouseDown={handleBoardMouseDown}
            onMouseMove={handleBoardMouseMove}
            onMouseUp={stopBoardPan}
            onMouseLeave={stopBoardPan}
          >
            {cols.map((col) => (
              <div
                key={col}
                className={`wsp-column ${dragOverCol === col ? "drag-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => handleCardDrop(col)}
              >
                <div className="wsp-col-header">
                  <span className="wsp-col-dot" data-col={col} />
                  <span className="wsp-col-title">{col}</span>
                  <span className="wsp-col-count">{(cards[col] ?? []).length}</span>
                  <button className="wsp-col-menu">···</button>
                </div>
                <div className="wsp-col-body">
                  {(cards[col] ?? []).map((card) => (
                    <div
                      key={card.id}
                      className={`wsp-card-item ${draggingCard?.card.id === card.id ? "dragging" : ""}`}
                      draggable
                      onDragStart={() => setDraggingCard({ card, col })}
                      onDragEnd={() => { setDraggingCard(null); setDragOverCol(null); }}
                      onClick={() => {
                        if (panState.current.moved) {
                          panState.current.moved = false;
                          return;
                        }
                        setSelectedCard({ card, col });
                      }}
                    >
                      <span className="wsp-card-text">{card.title}</span>
                      <button
                        className="wsp-card-delete"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCard(col, card.id); }}
                      >✕</button>
                    </div>
                  ))}
                  {addingCol === col ? (
                    <div className="wsp-add-form">
                      <input
                        className="wsp-add-input"
                        placeholder="업무 제목 입력..."
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddCard(col); if (e.key === "Escape") { setAddingCol(null); setInputVal(""); } }}
                        autoFocus
                      />
                      <div className="wsp-add-actions">
                        <button className="wsp-add-submit" onClick={() => handleAddCard(col)}>Add card</button>
                        <button className="wsp-add-cancel" onClick={() => { setAddingCol(null); setInputVal(""); }}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <button className="wsp-add-card" onClick={() => setAddingCol(col)}>+ Add a card</button>
                  )}
                </div>
              </div>
            ))}
            <div className="wsp-add-list">
              {addingList ? (
                <div className="wsp-add-list-form">
                  <input
                    className="wsp-add-list-input"
                    placeholder="목록 이름 입력..."
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddList(); }}
                    autoFocus
                  />
                  <div className="wsp-add-list-actions">
                    <button className="wsp-add-submit" onClick={handleAddList}>목록 추가</button>
                    <button className="wsp-add-cancel" onClick={() => { setAddingList(false); setListName(""); }}>✕</button>
                  </div>
                </div>
              ) : (
                <button className="wsp-add-list-btn" onClick={() => setAddingList(true)}>+ 목록 추가</button>
              )}
            </div>
          </div>
        </main>
      </div>

      <WorkspaceTabBar
        active={tab}
        onTabChange={(t) => {
          setTab(t);
          if (t === "planner") setShowPlanner((v) => !v);
          if (t === "community") setShowCommunity((v) => !v);
          if (t === "board") setShowBoardView((v) => !v);
        }}
        onTrashClick={openTrash}
        trashCount={deletedCards.length}
      />

      <BoardSlideView
        visible={showBoardView}
        initialCards={slideInitialCards}
        syncedColMap={bsvColMap}
        gradient={gradient}
        workspaceId={workspace?.id}
        onCardClick={(card) => setSlideCard(card)}
        onStatusChange={handleBoardStatusChange}
      />

      {slideCard && (
        <CardDetailModal
          title={slideCard.title}
          colName="상태 없음"
          initialDesc={slideCard.desc}
          initialStartDate={slideCard.startDate}
          initialDueDate={slideCard.dueDate}
          initialComments={slideCard.comments}
          onClose={() => setSlideCard(null)}
        />
      )}
      {selectedCard && (
        <CardDetailModal
          key={selectedCard.card.id}
          title={selectedCard.card.title}
          colName={selectedCard.col}
          initialDesc={selectedCard.card.desc}
          initialStartDate={selectedCard.card.startDate}
          initialDueDate={selectedCard.card.dueDate}
          initialComments={selectedCard.card.comments}
          onSaveDesc={(desc) => handleSaveDesc(selectedCard.col, selectedCard.card.id, desc)}
          onSaveStartDate={(startDate) => handleSaveStartDate(selectedCard.col, selectedCard.card.id, startDate)}
          onSaveDueDate={(dueDate) => handleSaveDueDate(selectedCard.col, selectedCard.card.id, dueDate)}
          onSaveComments={(comments) => handleSaveComments(selectedCard.col, selectedCard.card.id, comments)}
          onClose={() => setSelectedCard(null)}
        />
      )}
      {aiTaskOpen && (
        <AITaskModal
          onClose={() => setAiTaskOpen(false)}
          workspaces={workspaces}
          workspace={workspace}
        />
      )}
      {trashOpen && (
        <div className="wsp-trash-overlay" onClick={() => setTrashOpen(false)}>
          <div className="wsp-trash-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wsp-trash-header">
              <h3>휴지통</h3>
              <button className="wsp-trash-close" onClick={() => setTrashOpen(false)}>x</button>
            </div>
            {deletedCards.length === 0 ? (
              <div className="wsp-trash-empty">삭제된 태스크가 여기에 표시됩니다.</div>
            ) : (
              <div className="wsp-trash-list">
                {deletedCards.map((card) => (
                  <div key={card.id} className="wsp-trash-item">
                    <div>
                      <strong>{card.title}</strong>
                      {card.desc && <p>{card.desc}</p>}
                    </div>
                    <button className="wsp-restore-btn" onClick={() => handleRestoreCard(card)}>
                      복구
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
