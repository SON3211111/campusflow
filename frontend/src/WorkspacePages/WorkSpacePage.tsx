/**
 * 워크스페이스 메인 페이지 (칸반 보드)
 * - 좌측: Community 패널(채널 목록 + 메시지)
 * - 중앙: Planner 패널(캘린더 + 마감일)
 * - 우측: 칸반 보드(드래그앤드롭, 태스크 CRUD, 소프트 삭제/복원)
 * 마우스 클릭+드래그로 보드 좌우 패닝 지원
 */
import { useState, useEffect, useRef } from "react";
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
  dueDate?: string;
  comments: { user: string; text: string; time: string }[];
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const TODAY = new Date();

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

  const [messages, setMessages] = useState<{ user: string; text: string; time: string }[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [writingMsg, setWritingMsg] = useState(false);

  const handleSendMsg = () => {
    if (!msgInput.trim()) return;
    const userName = localStorage.getItem("userName") ?? "나";
    setMessages((prev) => [...prev, { user: userName, text: msgInput.trim(), time: "방금" }]);
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
        for (const bt of basketTasks) {
          try {
            await client.post(`/workspaces/${workspace.id}/tasks`, {
              title: bt.title,
              description: bt.desc || "",
              status: "TODO",
            });
          } catch {}
        }
      }

      try {
        const res = await client.get(`/workspaces/${workspace.id}/tasks`);
        const newCards = emptyCards();
        for (const t of res.data) {
          const col = STATUS_TO_COL[t.status] ?? "상태 없음";
          if (newCards[col]) {
            newCards[col].push({ id: t.taskId, title: t.title, desc: t.description ?? "", dueDate: t.dueDate ?? "", comments: [] });
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
        res.data.map((t: any) => ({
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
        const res = await client.post(`/workspaces/${workspace.id}/tasks`, {
          title,
          description: "",
          status,
        });
        const newCard: CardItem = {
          id: res.data.taskId,
          title: res.data.title,
          desc: res.data.description ?? "",
          dueDate: res.data.dueDate ?? "",
          comments: [],
        };
        setCards((prev) => ({ ...prev, [col]: [...(prev[col] ?? []), newCard] }));
      } catch {
        const newCard: CardItem = { id: Date.now().toString(), title, desc: "", dueDate: "", comments: [] };
        setCards((prev) => ({ ...prev, [col]: [...(prev[col] ?? []), newCard] }));
      }
    } else {
      const newCard: CardItem = { id: Date.now().toString(), title, desc: "", dueDate: "", comments: [] };
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
        id: res.data.taskId,
        title: res.data.title,
        desc: res.data.description ?? "",
        dueDate: res.data.dueDate ?? "",
        comments: [],
      };
      const col = STATUS_TO_COL[res.data.status] ?? "상태 없음";
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

  const handleSaveDesc = (col: string, id: string, desc: string) => {
    setCards((prev) => ({ ...prev, [col]: prev[col].map((c) => c.id === id ? { ...c, desc } : c) }));
  };

  const handleSaveDueDate = async (col: string, id: string, dueDate: string) => {
    setCards((prev) => ({ ...prev, [col]: prev[col].map((c) => c.id === id ? { ...c, dueDate } : c) }));
    if (workspace?.id) {
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

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  const allBoardCards = Object.values(cards).flat();
  const slideInitialCards = [...basketTasks, ...allBoardCards];

  return (
    <div className="wsp-page">
      <Header workspaces={workspaces} />

      <div className="wsp-body" style={{ background: gradient }}>
        {/* 왼쪽: Community */}
        <aside className={`wsp-community ${showCommunity ? "panel-visible" : "panel-hidden"}`}>
          <div className="wsp-panel-title">
            <span className="wsp-panel-icon"></span> community
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

        {/* 가운데: Planner */}
        <aside className={`wsp-planner ${showPlanner ? "panel-visible" : "panel-hidden"}`}>
          <div className="wsp-panel-title">
            <span className="wsp-panel-icon"></span> Planner
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
              return (
                <div key={i} className={`wsp-cal-day ${!d ? "empty" : ""} ${isToday ? "today" : ""}`}>
                  {d}
                </div>
              );
            })}
          </div>
          <div className="wsp-upcoming-label">다가오는 마감일</div>
          <div className="wsp-upcoming-empty">마감일이 없습니다.</div>
        </aside>

        {/* 오른쪽: Board */}
        <main className="wsp-board">
          <BoardSubHeader wsName={wsName} members={wsMembers} workspace={workspace} workspaces={workspaces} />

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
          initialDueDate={slideCard.dueDate}
          initialComments={slideCard.comments}
          onClose={() => setSlideCard(null)}
        />
      )}
      {selectedCard && (
        <CardDetailModal
          title={selectedCard.card.title}
          colName={selectedCard.col}
          initialDesc={selectedCard.card.desc}
          initialDueDate={selectedCard.card.dueDate}
          initialComments={selectedCard.card.comments}
          onSaveDesc={(desc) => handleSaveDesc(selectedCard.col, selectedCard.card.id, desc)}
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
