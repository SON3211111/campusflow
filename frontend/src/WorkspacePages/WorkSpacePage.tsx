/**
 * 워크스페이스 메인 페이지 (칸반 보드)
 * - 좌측: Community 패널(채널 목록 + 메시지)
 * - 중앙: Planner 패널(캘린더 + 마감일)
 * - 우측: 칸반 보드(드래그앤드롭, 태스크 CRUD, 소프트 삭제/복원)
 * 마우스 클릭+드래그로 보드 좌우 패닝 지원
 */
import { useState, useEffect, useRef } from "react";
import type { MouseEvent } from "react";
import { Sparkles, Plus, CalendarDays, AlertCircle, MessageCircle, Calendar } from "lucide-react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
import CardDetailModal from "../components/CardDetailModal";
import BoardSlideView from "../components/BoardSlideView";
import PixelAvatar from "../components/PixelAvatar";
import client from "../api/client";
import { useWorkspaceSocket } from "../hooks/useWorkspaceSocket";
import AITaskModal from "../components/AITaskModal";
import WorkspaceCommunityPanel from "../components/WorkspaceCommunityPanel";
import WorkspaceSwitcherPopover from "../components/WorkspaceSwitcherPopover";
import { createWorkspaceThemeStyle, withStoredGradient, withStoredGradients } from "../utils/workspaceTheme";
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
  assigneeId?: string;
  assigneeName?: string;
  priority?: string;
  quickSignal?: string;
  boardColumn?: string;
  comments: { user: string; text: string; time: string }[];
}

function getDaysLeft(dueDate?: string): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
  const { state } = useLocation() as {
    state: {
      workspace?: Workspace;
      workspaces?: Workspace[];
      basketTasks?: CardItem[];
      highlightTaskId?: string;
      openPanel?: "planner" | "community" | "board";
    };
  };

  const savedWs    = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
  const rawWorkspace = state?.workspace ?? state?.workspaces?.[0] ?? savedWs;
  const workspace  = rawWorkspace ? withStoredGradient(rawWorkspace) : undefined;
  const workspaces = withStoredGradients(state?.workspaces ?? []);
  const gradient   = workspace?.gradient ?? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)";
  const themeStyle = createWorkspaceThemeStyle(gradient);
  const wsName     = workspace?.name ?? "워크스페이스";

  const basketTasks = (state?.basketTasks ?? []) as CardItem[];

  const [tab, setTab]                     = useState<"board" | "planner" | "community" | "personal">("board");
  const [wsMembers, setWsMembers]         = useState<{ userId: string; name: string }[]>([]);
  const [showPlanner, setShowPlanner]     = useState(true);
  const [showCommunity, setShowCommunity] = useState(true);
  const [showBoardView, setShowBoardView] = useState(basketTasks.length > 0);
  const [showWorkspacePanel, setShowWorkspacePanel] = useState(false);
  const [loading, setLoading]             = useState(true);
  const [showLanding, setShowLanding]     = useState(false);
  const [aiTaskOpen, setAiTaskOpen]       = useState(false);
  const [trashOpen, setTrashOpen]         = useState(false);
  const [deletedCards, setDeletedCards]   = useState<CardItem[]>([]);

  const closeWorkspacePanel = () => {
    setShowWorkspacePanel(false);
    setTab("board");
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
        const tasksRes = await client.get(`/workspaces/${workspace.id}/tasks`);

        let savedCustomCols: string[] = [];
        try {
          const wsRes = await client.get(`/workspaces/${workspace.id}`);
          savedCustomCols = wsRes.data.data?.customColumns ?? [];
        } catch (err) {
          console.warn("워크스페이스 컬럼 조회 실패, 기본 컬럼으로 계속 진행합니다.", err);
        }

        // 커스텀 컬럼 복원
        const mergedCols = [...INITIAL_COLS];
        for (const c of savedCustomCols) {
          if (!mergedCols.includes(c)) mergedCols.push(c);
        }
        setCols(mergedCols);

        const newCards: { [col: string]: CardItem[] } = Object.fromEntries(
          mergedCols.map((c) => [c, [] as CardItem[]])
        );
        for (const t of (tasksRes.data.data ?? [])) {
          const savedCol = typeof t.boardColumn === "string" ? t.boardColumn : "";
          const col = savedCol && mergedCols.includes(savedCol)
            ? savedCol
            : STATUS_TO_COL[t.status] ?? "상태 없음";
          if (!newCards[col]) {
            newCards[col] = [];
          }
          newCards[col].push({ id: t.taskId, title: t.title, desc: t.description ?? "", startDate: t.startDate ?? "", dueDate: t.dueDate ?? "", assigneeId: t.assigneeId ?? "", assigneeName: t.assigneeName ?? "", priority: t.priority ?? "", quickSignal: t.quickSignal ?? "", boardColumn: savedCol || col, comments: [] });
        }
        setCards(newCards);
        const hasTasks = Object.values(newCards).flat().length > 0 || basketTasks.length > 0;
        setShowLanding(!hasTasks);
      } catch (err) {
        console.error("태스크 로드 실패:", err);
        setShowLanding(basketTasks.length === 0);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [workspace?.id]);

  // WebSocket — 다른 팀원의 변경사항 실시간 반영
  useWorkspaceSocket(workspace?.id, {
    onStatusChange: ({ taskId, newStatus }) => {
      const targetCol = STATUS_TO_COL[newStatus] ?? "상태 없음";
      setCards((prev) => {
        const next = { ...prev };
        let movedCard: CardItem | undefined;
        for (const col of Object.keys(next)) {
          const idx = next[col].findIndex((c) => c.id === taskId);
          if (idx !== -1) {
            movedCard = next[col][idx];
            next[col] = next[col].filter((c) => c.id !== taskId);
            break;
          }
        }
        if (movedCard) {
          next[targetCol] = [...(next[targetCol] ?? []), movedCard];
        }
        return next;
      });
    },
    onTaskCreated: ({ taskId, title, status, assigneeId, assigneeName, priority, boardColumn }) => {
      const col = boardColumn && cols.includes(boardColumn) ? boardColumn : STATUS_TO_COL[status] ?? "상태 없음";
      const newCard: CardItem = {
        id: taskId,
        title,
        desc: "",
        assigneeId: assigneeId || undefined,
        assigneeName: assigneeName || undefined,
        priority: priority || undefined,
        boardColumn: boardColumn || col,
        comments: [],
      };
      setCards((prev) => ({
        ...prev,
        [col]: (prev[col] ?? []).some((card) => card.id === taskId)
          ? (prev[col] ?? [])
          : [...(prev[col] ?? []), newCard],
      }));
    },
    onTaskDeleted: ({ taskId }) => {
      setCards((prev) => {
        const next = { ...prev };
        for (const col of Object.keys(next)) {
          next[col] = next[col].filter((c) => c.id !== taskId);
        }
        return next;
      });
    },
    onTaskRestored: ({ taskId, title, status, assigneeId, assigneeName, priority, boardColumn }) => {
      const col = boardColumn && cols.includes(boardColumn) ? boardColumn : STATUS_TO_COL[status] ?? "상태 없음";
      const restoredCard: CardItem = {
        id: taskId,
        title,
        desc: "",
        assigneeId: assigneeId || undefined,
        assigneeName: assigneeName || undefined,
        priority: priority || undefined,
        boardColumn: boardColumn || col,
        comments: [],
      };
      setCards((prev) => ({
        ...prev,
        [col]: (prev[col] ?? []).some((card) => card.id === taskId)
          ? (prev[col] ?? [])
          : [...(prev[col] ?? []), restoredCard],
      }));
    },
    onTaskUpdated: ({ taskId, field, value }) => {
      setCards((prev) => {
        const next = { ...prev };
        if (field === "boardColumn") {
          let movedCard: CardItem | undefined;
          for (const col of Object.keys(next)) {
            const found = next[col].find((c) => c.id === taskId);
            if (found) {
              movedCard = { ...found, boardColumn: value };
              next[col] = next[col].filter((c) => c.id !== taskId);
              break;
            }
          }
          if (movedCard && value) {
            next[value] = [...(next[value] ?? []), movedCard];
          }
          return next;
        }
        for (const col of Object.keys(next)) {
          next[col] = next[col].map((c) => {
            if (c.id !== taskId) return c;
            if (field === "title")        return { ...c, title: value };
            if (field === "description")  return { ...c, desc: value };
            if (field === "startDate")    return { ...c, startDate: value };
            if (field === "dueDate")      return { ...c, dueDate: value };
            if (field === "assigneeName") return { ...c, assigneeName: value || undefined };
            if (field === "assigneeId")   return { ...c, assigneeId: value || undefined };
            return c;
          });
        }
        return next;
      });
    },
  });

  // 알림에서 넘어온 경우 해당 태스크 모달 자동 오픈
  useEffect(() => {
    if (!state?.highlightTaskId || loading) return;
    for (const [col, cardList] of Object.entries(cards)) {
      const found = cardList.find((c) => c.id === state.highlightTaskId);
      if (found) { setSelectedCard({ card: found, col }); break; }
    }
  }, [loading, state?.highlightTaskId]);

  // 다른 페이지 탭 클릭으로 넘어온 경우 패널 자동 오픈
  useEffect(() => {
    if (!state?.openPanel) return;
    if (state.openPanel === "planner") setShowPlanner(true);
    if (state.openPanel === "community") setShowCommunity(true);
    if (state.openPanel === "board") setShowBoardView(true);
  }, [state?.openPanel]);

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

  const handleAddList = async () => {
    if (!listName.trim()) return;
    const name = listName.trim();
    const newCols = [...cols, name];
    setCols(newCols);
    setCards((prev) => ({ ...prev, [name]: [] }));
    setListName("");
    setAddingList(false);

    if (workspace?.id) {
      const customCols = newCols.filter((c) => !INITIAL_COLS.includes(c));
      try {
        await client.patch(`/workspaces/${workspace.id}/columns`, { columns: customCols });
      } catch (err) {
        console.error("컬럼 저장 실패:", err);
      }
    }
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
      [targetCol]: [...(prev[targetCol] ?? []), { ...card, boardColumn: targetCol }],
    }));
    setDraggingCard(null);
    setDragOverCol(null);

    const newStatus = COL_TO_STATUS[targetCol];
    if (workspace?.id) {
      const userId = localStorage.getItem("userId") ?? "";
      try {
        if (newStatus) {
          await client.patch(`/workspaces/${workspace.id}/tasks/${card.id}/status?status=${newStatus}&userId=${userId}`);
        }
        await client.patch(`/workspaces/${workspace.id}/tasks/${card.id}/board-column`, { boardColumn: targetCol });
      } catch (err) {
        console.error("상태 변경 실패:", err);
      }
    }
  };

  const handleAddCard = async (col: string) => {
    if (!inputVal.trim()) return;
    const title = inputVal.trim();
    const status = COL_TO_STATUS[col] ?? "TODO";

    if (workspace?.id) {
      try {
        const currentUserId = localStorage.getItem("userId") ?? "";
        const currentUserName = wsMembers.find((m) => m.userId === currentUserId)?.name
          ?? localStorage.getItem("userName")
          ?? "";
        const res = await client.post(`/workspaces/${workspace.id}/tasks`, {
          title,
          description: "",
          status,
          assigneeId: currentUserId,
          boardColumn: col,
        });
        const d = res.data.data;
        const newCard: CardItem = {
          id: d.taskId,
          title: d.title,
          desc: d.description ?? "",
          dueDate: d.dueDate ?? "",
          assigneeId: d.assigneeId ?? currentUserId,
          assigneeName: d.assigneeName ?? currentUserName,
          priority: d.priority ?? "",
          quickSignal: d.quickSignal ?? "",
          boardColumn: d.boardColumn ?? col,
          comments: [],
        };
        setCards((prev) => ({
          ...prev,
          [col]: (prev[col] ?? []).some((card) => card.id === newCard.id)
            ? (prev[col] ?? [])
            : [...(prev[col] ?? []), newCard],
        }));
      } catch (err: any) {
        alert(`태스크 저장에 실패했습니다: ${err?.response?.data?.message ?? err?.message ?? "알 수 없는 오류"}`);
      }
    } else {
      const newCard: CardItem = { id: Date.now().toString(), title, desc: "", dueDate: "", boardColumn: col, comments: [] };
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
        dueDate: res.data.data.dueDate ?? "",
        boardColumn: res.data.data.boardColumn ?? "",
        comments: [],
      };
      const savedCol = res.data.data.boardColumn ?? "";
      const col = savedCol && cols.includes(savedCol) ? savedCol : STATUS_TO_COL[res.data.data.status] ?? "상태 없음";
      setCards((prev) => ({
        ...prev,
        [col]: (prev[col] ?? []).some((item) => item.id === restored.id)
          ? (prev[col] ?? [])
          : [...(prev[col] ?? []), restored],
      }));
      setDeletedCards((prev) => prev.filter((c) => c.id !== card.id));
      setShowLanding(false);
    } catch {}
  };

  const handleHardDeleteCard = async (card: CardItem) => {
    if (!workspace?.id) return;
    try {
      await client.delete(`/workspaces/${workspace.id}/tasks/${card.id}/hard`);
      setDeletedCards((prev) => prev.filter((c) => c.id !== card.id));
    } catch (err: any) {
      alert(`영구 삭제에 실패했습니다: ${err?.response?.data?.message ?? err?.message ?? "알 수 없는 오류"}`);
    }
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

  const handleSendSignal = async (col: string, id: string, signal: string | null) => {
    setCards((prev) => ({ ...prev, [col]: prev[col].map((c) => c.id === id ? { ...c, quickSignal: signal ?? "" } : c) }));
    if (!workspace?.id) return;
    const userId = localStorage.getItem("userId") ?? "";
    try {
      if (signal) {
        await client.patch(`/workspaces/${workspace.id}/tasks/${id}/quick-signal?signal=${signal}&userId=${userId}`);
      } else {
        await client.delete(`/workspaces/${workspace.id}/tasks/${id}/quick-signal`);
      }
    } catch (err) {
      console.error("시그널 전송 실패:", err);
    }
  };

  const handleSaveTitle = async (col: string, id: string, title: string) => {
    setCards((prev) => ({ ...prev, [col]: prev[col].map((c) => c.id === id ? { ...c, title } : c) }));
    if (workspace?.id) {
      try {
        await client.patch(`/workspaces/${workspace.id}/tasks/${id}/title`, { title });
      } catch (err) {
        console.error("제목 수정 실패:", err);
      }
    }
  };

  const handleSaveStartDate = async (col: string, id: string, startDate: string) => {
    setCards((prev) => ({ ...prev, [col]: prev[col].map((c) => c.id === id ? { ...c, startDate } : c) }));
    if (workspace?.id) {
      try {
        await client.patch(`/workspaces/${workspace.id}/tasks/${id}/start-date?startDate=${startDate}`);
      } catch (err) {
        console.error("시작일 수정 실패:", err);
      }
    }
  };

  const handleSaveDueDate = async (col: string, id: string, dueDate: string) => {
    setCards((prev) => ({ ...prev, [col]: prev[col].map((c) => c.id === id ? { ...c, dueDate } : c) }));
    if (workspace?.id) {
      try {
        await client.patch(`/workspaces/${workspace.id}/tasks/${id}/due-date?dueDate=${dueDate}`);
      } catch (err) {
        console.error("마감일 수정 실패:", err);
      }
    }
  };

  const handleSaveComments = (col: string, id: string, comments: CardItem["comments"]) => {
    setCards((prev) => ({ ...prev, [col]: prev[col].map((c) => c.id === id ? { ...c, comments } : c) }));
  };

  const handleChangeAssignee = async (col: string, id: string, userId: string, name: string) => {
    if (!workspace?.id) return;
    try {
      await client.patch(`/workspaces/${workspace.id}/tasks/${id}/assignee?assigneeId=${userId}`);
      setCards((prev) => ({
        ...prev,
        [col]: prev[col].map((c) => c.id === id ? { ...c, assigneeId: userId, assigneeName: name } : c),
      }));
    } catch (err) {
      console.error("담당자 변경 실패:", err);
      alert("담당자 변경에 실패했습니다.");
    }
  };

  const handleStatusChangeFromModal = async (col: string, id: string, newColName: string) => {
    const newStatus = COL_TO_STATUS[newColName];
    if (!workspace?.id) return;
    const userId = localStorage.getItem("userId") ?? "";
    try {
      if (newStatus) {
        await client.patch(`/workspaces/${workspace.id}/tasks/${id}/status?status=${newStatus}&userId=${userId}`);
      }
      await client.patch(`/workspaces/${workspace.id}/tasks/${id}/board-column`, { boardColumn: newColName });
      setCards((prev) => {
        const next = { ...prev };
        const card = next[col]?.find((c) => c.id === id);
        if (!card) return next;
        next[col] = next[col].filter((c) => c.id !== id);
        next[newColName] = [...(next[newColName] ?? []), { ...card, boardColumn: newColName }];
        return next;
      });
      setSelectedCard((prev) => prev ? { ...prev, col: newColName } : null);
    } catch (err) {
      console.error("상태 변경 실패:", err);
      alert("상태 변경에 실패했습니다.");
    }
  };

  const handleBoardStatusChange = async (taskId: string, newColKey: string) => {
    const newStatus = BSV_KEY_TO_STATUS[newColKey];
    if (newStatus && workspace?.id) {
      const userId = localStorage.getItem("userId") ?? "";
      try {
        await client.patch(`/workspaces/${workspace.id}/tasks/${taskId}/status?status=${newStatus}&userId=${userId}`);
      } catch (err) {
        console.error("상태 변경 실패:", err);
      }
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

  const bsvColMap = Object.fromEntries(
    INITIAL_COLS.map((col) => [
      COL_TO_BSV_KEY[col] ?? "none",
      (cards[col] ?? []).map(({ id, title, desc, comments }) => ({ id, title, desc, comments })),
    ])
  );

  const allBoardCards = Object.values(cards).flat();
  const slideInitialCards = [...basketTasks, ...allBoardCards];

  return (
    <div className="wsp-page" style={themeStyle}>
      <Header workspaces={workspaces} />

      <div className="wsp-body" style={{ background: gradient }}>
        {/* 왼쪽: Community */}
        <WorkspaceCommunityPanel visible={showCommunity} workspaceId={workspace?.id} />

        {/* 가운데: Planner */}
        <aside className={`wsp-planner ${showPlanner ? "panel-visible" : "panel-hidden"}`}>
          <div className="wsp-panel-title">
            <CalendarDays size={15} /> Planner
          </div>
          <div className="wsp-cal-header">
            <button className="wsp-cal-nav" onClick={prevMonth}>‹</button>
            <span className="wsp-cal-title">{calYear}년 {calMonth + 1}월</span>
            <button className="wsp-cal-nav" onClick={nextMonth}>›</button>
          </div>
          {(() => {
            const allCards = Object.entries(cards).flatMap(([col, cs]) => cs.map(c => ({ ...c, col })));
            const STATUS_COLOR: Record<string, string> = {
              "상태 없음": "#aaa", "시작하지 않음": "#888",
              "진행 중": "#4f7cff", "보류 중": "#f59e0b", "완료": "#22c55e",
            };
            // 날짜별 점 맵 — startDate~dueDate 전체 구간에 표시
            const dotMap: Record<string, string[]> = {};
            for (const c of allCards) {
              if (!c.dueDate) continue;
              const color = STATUS_COLOR[c.col] ?? "#aaa";
              const start = new Date((c.startDate || c.dueDate).slice(0, 10) + "T00:00:00");
              const end   = new Date(c.dueDate.slice(0, 10) + "T00:00:00");
              const cur   = new Date(start);
              while (cur <= end) {
                const ds = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}-${String(cur.getDate()).padStart(2,"0")}`;
                if (!dotMap[ds]) dotMap[ds] = [];
                if (dotMap[ds].length < 3) dotMap[ds].push(color);
                cur.setDate(cur.getDate() + 1);
              }
            }
            return (
              <>
                <div className="wsp-cal-grid">
                  {DAYS.map((d) => (
                    <div key={d} className={`wsp-cal-day-label ${d === "일" ? "sun" : d === "토" ? "sat" : ""}`}>{d}</div>
                  ))}
                  {calDays.map((d, i) => {
                    const isToday = d === TODAY.getDate() && calMonth === TODAY.getMonth() && calYear === TODAY.getFullYear();
                    const ds = d ? `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
                    const dots = ds ? (dotMap[ds] ?? []) : [];
                    return (
                      <div key={i} className={`wsp-cal-day ${!d ? "empty" : ""} ${isToday ? "today" : ""}`}>
                        {d}
                        {dots.length > 0 && (
                          <div className="planner-dots">
                            {dots.map((color, j) => (
                              <span key={j} className="planner-dot" style={{ background: color }} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="wsp-upcoming-label">다가오는 마감일</div>
                {(() => {
                  const now = new Date(); now.setHours(0, 0, 0, 0);
                  const upcoming = allCards
                    .filter((c) => c.dueDate && c.col !== "완료")
                    .map((c) => {
                      const due = new Date(c.dueDate!); due.setHours(0, 0, 0, 0);
                      return { ...c, daysLeft: Math.ceil((due.getTime() - now.getTime()) / 86400000) };
                    })
                    .filter((c) => c.daysLeft >= 0)
                    .sort((a, b) => a.daysLeft - b.daysLeft)
                    .slice(0, 5);
                  if (upcoming.length === 0)
                    return <div className="wsp-upcoming-empty">마감일이 없습니다.</div>;
                  return (
                    <div className="wsp-upcoming-list">
                      {upcoming.map((c) => (
                        <div key={c.id} className="wsp-upcoming-item" style={{ borderLeftColor: STATUS_COLOR[c.col] ?? "#aaa" }}>
                          <div className="wsp-upcoming-info">
                            <span className="wsp-upcoming-title">{c.title}</span>
                            <span className="wsp-upcoming-days">
                              {c.daysLeft === 0 ? "오늘" : `D-${c.daysLeft}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
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
                  <Sparkles size={26} />
                  <span className="wsp-lbtn-title">AI 업무 생성</span>
                  <span className="wsp-lbtn-desc">AI가 업무를 자동으로 분해합니다</span>
                </button>
                <button className="wsp-landing-btn start"
                  onClick={() => setShowLanding(false)}>
                  <Plus size={26} />
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
                onDrop={() => { handleCardDrop(col); panState.current.active = false; }}
              >
                <div className="wsp-col-header">
                  <span className="wsp-col-dot" data-col={col} />
                  <span className="wsp-col-title">{col}</span>
                  <span className="wsp-col-count">{(cards[col] ?? []).length}</span>
                  <button className="wsp-col-menu">···</button>
                </div>
                <div className="wsp-col-body">
                  {(cards[col] ?? []).map((card) => {
                    const daysLeft = getDaysLeft(card.dueDate);
                    const isNear = col !== "완료" && daysLeft !== null && daysLeft <= 3;
                    return (
                    <div
                      key={card.id}
                      className={`wsp-card-item ${draggingCard?.card.id === card.id ? "dragging" : ""} ${isNear ? "deadline-near" : ""}`}
                      draggable
                      onDragStart={() => setDraggingCard({ card, col })}
                      onDragEnd={() => { setDraggingCard(null); setDragOverCol(null); panState.current.active = false; }}
                      onClick={() => {
                        if (panState.current.moved) {
                          panState.current.moved = false;
                          return;
                        }
                        setSelectedCard({ card, col });
                      }}
                    >
                      <button
                        className="wsp-card-delete"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCard(col, card.id); }}
                      >✕</button>
                      {card.quickSignal ? (
                        <div className={`wsp-card-signal ${card.quickSignal === "HELP_NEEDED" ? "signal-help" : "signal-feedback"}`}>
                          {card.quickSignal === "HELP_NEEDED"
                            ? <><AlertCircle size={11} /> 도움 요청</>
                            : <><MessageCircle size={11} /> 피드백 요청</>}
                        </div>
                      ) : (
                        <div className="wsp-card-signal-spacer" aria-hidden="true" />
                      )}
                      <span className="wsp-card-text">{card.title}</span>
                      {(card.dueDate || card.assigneeName) && (
                        <div className="wsp-card-footer">
                          {card.dueDate && (
                            <span className={`wsp-card-due ${isNear ? "due-near" : ""}`}>
                              <Calendar size={11} /> {card.dueDate}
                            </span>
                          )}
                          {card.assigneeName && (
                            <PixelAvatar userId={card.assigneeId} name={card.assigneeName} size="sm" className="wsp-card-pixel-avatar" />
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
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
          if (t === "personal") setShowWorkspacePanel((v) => !v);
        }}
        onTrashClick={openTrash}
        trashCount={deletedCards.length}
      />

      <WorkspaceSwitcherPopover
        visible={showWorkspacePanel}
        workspace={workspace}
        workspaces={workspaces}
        onClose={closeWorkspacePanel}
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
          initialStartDate={selectedCard.card.startDate}
          initialDueDate={selectedCard.card.dueDate}
          initialComments={selectedCard.card.comments}
          taskId={selectedCard.card.id}
          workspaceId={workspace?.id}
          initialQuickSignal={selectedCard.card.quickSignal}
          assigneeId={selectedCard.card.assigneeId}
          assigneeName={selectedCard.card.assigneeName}
          onSaveTitle={(t) => handleSaveTitle(selectedCard.col, selectedCard.card.id, t)}
          onSaveDesc={(desc) => handleSaveDesc(selectedCard.col, selectedCard.card.id, desc)}
          onSaveStartDate={(startDate) => handleSaveStartDate(selectedCard.col, selectedCard.card.id, startDate)}
          onSaveDueDate={(dueDate) => handleSaveDueDate(selectedCard.col, selectedCard.card.id, dueDate)}
          onSaveComments={(comments) => handleSaveComments(selectedCard.col, selectedCard.card.id, comments)}
          onSendSignal={(signal) => handleSendSignal(selectedCard.col, selectedCard.card.id, signal)}
          onStatusChange={(newColName) => handleStatusChangeFromModal(selectedCard.col, selectedCard.card.id, newColName)}
          members={wsMembers}
          onChangeAssignee={(userId, name) => handleChangeAssignee(selectedCard.col, selectedCard.card.id, userId, name)}
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
                    <div className="wsp-trash-actions">
                      <button className="wsp-restore-btn" onClick={() => handleRestoreCard(card)}>
                        복구
                      </button>
                      <button className="wsp-hard-delete-btn" onClick={() => handleHardDeleteCard(card)}>
                        영구 삭제
                      </button>
                    </div>
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
