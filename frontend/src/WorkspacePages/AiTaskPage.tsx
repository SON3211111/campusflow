/**
 * AI 태스크 관리 페이지
 * - 큰 작업(프롬프트)별로 트리 섹션이 분리되어 표시
 * - 각 섹션은 접고 펼칠 수 있음
 * - 팀원별 슬롯에 드래그로 Picking
 */
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import PixelAvatar from "../components/PixelAvatar";
import client from "../api/client";
import { getAppendBuffer, clearAppendBuffer, hasAppendBuffer } from "../store/aiTaskBuffer";
import { createWorkspaceThemeStyle, withStoredGradient, withStoredGradients } from "../utils/workspaceTheme";
import "./AiTaskPage.css";

interface Task {
  id: string;
  name: string;
  categoryIdx: number;
  desc?: string;
  priority?: string;
  backendId?: string;
}

interface CategoryTaskItem {
  name: string;
  desc: string;
  priority: string;
}

interface Category {
  name: string;
  color: string;
  taskColor: string;
  sessionId: string;
}

interface Session {
  id: string;
  prompt: string;
  collapsed: boolean;
}

interface Member {
  userId: string;
  name: string;
  role: string;
}

interface WorkspaceItem {
  id: string;
  name: string;
  gradient: string;
  type?: string;
}

interface AiResult {
  title: string;
  categories: { id: string; name: string; tasks: CategoryTaskItem[] }[];
}

interface AiTaskSession {
  title: string;
  categories: Category[];
  tasks: Task[];
  prompt: string;
  result?: AiResult;
  memberBaskets?: Record<string, Task[]>;
  sessions?: Session[];
}

type RawAiTaskSession = Partial<AiTaskSession> & Record<string, unknown>;

interface BackendTask {
  taskId?: string | number;
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  priority?: string;
  assigneeId?: string | number;
  assigneeName?: string;
}

function readStoredWorkspace(): WorkspaceItem | undefined {
  try {
    return JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null") ?? undefined;
  } catch {
    return undefined;
  }
}

function asArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") return Object.values(value as Record<string, T>);
  return [];
}

function normalizeRawTasks(value: unknown): Task[] {
  return asArray<Record<string, unknown>>(value).map((task, index) => ({
    id: String(task.id ?? task.taskId ?? `restored-task-${index}`),
    name: String(task.name ?? task.title ?? task.taskName ?? ""),
    categoryIdx: Number(task.categoryIdx ?? task.categoryIndex ?? task.category ?? 0),
    desc: typeof task.desc === "string" ? task.desc : typeof task.description === "string" ? task.description : "",
    priority: typeof task.priority === "string" ? task.priority : "",
    backendId: task.backendId ? String(task.backendId) : undefined,
  })).filter((task) => task.name.trim());
}

function normalizeSavedBaskets(value: unknown): Record<string, Task[]> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, basket]) => [key, normalizeRawTasks(basket)])
  );
}

function normalizeRawCategories(value: unknown, tasks: Task[]): Category[] {
  const rawCategories = asArray<Record<string, unknown>>(value);
  if (rawCategories.length > 0) {
    return rawCategories.map((category, index) => ({
      name: String(category.name ?? category.title ?? `Category ${index + 1}`),
      color: typeof category.color === "string" ? category.color : CAT_COLORS[index % CAT_COLORS.length].color,
      taskColor: typeof category.taskColor === "string" ? category.taskColor : CAT_COLORS[index % CAT_COLORS.length].taskColor,
      sessionId: typeof category.sessionId === "string" ? category.sessionId : "",
    }));
  }

  const maxCategoryIdx = tasks.reduce((max, task) => Math.max(max, task.categoryIdx), -1);
  return Array.from({ length: maxCategoryIdx + 1 }, (_, index) => ({
    name: `Category ${index + 1}`,
    color: CAT_COLORS[index % CAT_COLORS.length].color,
    taskColor: CAT_COLORS[index % CAT_COLORS.length].taskColor,
    sessionId: "",
  }));
}

function coerceAiTaskSession(raw: RawAiTaskSession | null): AiTaskSession | null {
  if (!raw) return null;
  const result = raw.result as AiResult | undefined;
  const resultTasks = result?.categories?.flatMap((category, categoryIdx) =>
    (category.tasks ?? []).map((task, taskIdx) => ({
      id: `result-c${categoryIdx}-t${taskIdx}`,
      name: task.name,
      categoryIdx,
      desc: task.desc,
      priority: task.priority,
    }))
  ) ?? [];

  const tasks = normalizeRawTasks(raw.tasks ?? raw.taskList ?? raw.items ?? resultTasks);
  const categories = normalizeRawCategories(raw.categories ?? result?.categories, tasks);

  return {
    title: String(raw.title ?? result?.title ?? raw.prompt ?? "AI Task"),
    categories,
    tasks,
    prompt: String(raw.prompt ?? raw.title ?? result?.title ?? "AI Task"),
    result,
    memberBaskets: normalizeSavedBaskets(raw.memberBaskets),
    sessions: asArray<Session>(raw.sessions),
  };
}

function countBasketTasks(memberBaskets?: Record<string, Task[]>) {
  return Object.values(memberBaskets ?? {}).reduce((sum, basket) => sum + (Array.isArray(basket) ? basket.length : 0), 0);
}

function getSessionPayloadScore(session: Partial<AiTaskSession> | null) {
  if (!session) return 0;
  const resultTaskCount = session.result?.categories?.reduce((sum, category) => sum + (category.tasks?.length ?? 0), 0) ?? 0;
  return (
    (session.categories?.length ?? 0) +
    (session.tasks?.length ?? 0) +
    resultTaskCount +
    countBasketTasks(session.memberBaskets)
  );
}

function normalizeSessionRefs(session: AiTaskSession): AiTaskSession {
  const categories = Array.isArray(session.categories) ? session.categories : [];
  const existingSessions = Array.isArray(session.sessions) ? session.sessions : [];
  const fallbackId = existingSessions[0]?.id ?? "session-restored";
  const normalizedCategories = categories.map((category) => ({
    ...category,
    sessionId: category.sessionId || fallbackId,
  }));

  const categorySessionIds = [...new Set(normalizedCategories.map((category) => category.sessionId))];
  const existingById = new Map(existingSessions.map((entry) => [entry.id, entry]));
  const sessions = categorySessionIds.length > 0
    ? categorySessionIds.map((id, index) => existingById.get(id) ?? {
        id,
        prompt: index === 0 ? (session.prompt || session.title || "AI Task") : `AI Task ${index + 1}`,
        collapsed: false,
      })
    : existingSessions;

  return {
    ...session,
    categories: normalizedCategories,
    sessions,
  };
}

function normalizeAiTaskSession(rawSession: RawAiTaskSession | null): AiTaskSession | null {
  const session = coerceAiTaskSession(rawSession);
  if (!session) return null;
  if (session.result) {
    const normalized = normalizeSessionRefs(session);
    return getSessionPayloadScore(normalized) > 0 ? normalized : null;
  }
  if (!Array.isArray(session.categories) || !Array.isArray(session.tasks)) return null;

  const result: AiResult = {
    title: session.title || session.prompt || "AI Task",
    categories: session.categories.map((category, index) => ({
      id: `c${index + 1}`,
      name: category.name,
      tasks: session.tasks
        .filter((task) => task.categoryIdx === index)
        .map((task) => ({
          name: task.name,
          desc: task.desc ?? "",
          priority: task.priority ?? "",
        })),
    })),
  };

  const normalized = normalizeSessionRefs({ ...session, result });
  return getSessionPayloadScore(normalized) > 0 ? normalized : null;
}

function readAiTaskSession(preferredKey: string): AiTaskSession | null {
  try {
    const session = JSON.parse(localStorage.getItem(preferredKey) ?? "null") as RawAiTaskSession | null;
    return normalizeAiTaskSession(session);
  } catch {
    return null;
  }
}

const CAT_COLORS = [
  { color: "#1a1a1a", taskColor: "#f8b4b4" },
  { color: "#6ab4f8", taskColor: "#6ab4f8" },
  { color: "#7de89a", taskColor: "#7de89a" },
  { color: "#c4a8f8", taskColor: "#c4a8f8" },
  { color: "#f8d08a", taskColor: "#f8d08a" },
];

function normalizeMember(raw: any): Member {
  const userId = raw?.userId ?? raw?.id ?? raw?.memberId ?? raw?.user?.userId ?? raw?.user?.id ?? "";
  return {
    userId: String(userId),
    name: raw?.name ?? raw?.userName ?? raw?.username ?? raw?.user?.name ?? "팀원",
    role: raw?.role ?? "MEMBER",
  };
}

function getTaskIdentity(task: Task) {
  return task.backendId ? `backend:${task.backendId}` : `name:${task.name.trim().toLowerCase()}`;
}

function mergeBasketTasks(existing: Task[], incoming: Task[]) {
  const seenById  = new Set(existing.filter((t) => t.backendId).map((t) => `backend:${t.backendId}`));
  const seenByName = new Set(existing.map((t) => t.name.trim().toLowerCase()));
  const merged = [...existing];
  incoming.forEach((task) => {
    const idKey   = task.backendId ? `backend:${task.backendId}` : null;
    const nameKey = task.name.trim().toLowerCase();
    if ((idKey && seenById.has(idKey)) || seenByName.has(nameKey)) return;
    if (idKey) seenById.add(idKey);
    seenByName.add(nameKey);
    merged.push(task);
  });
  return merged;
}

function mapBackendTaskToAiTask(task: BackendTask, categories: Category[]): Task {
  const description = task.description ?? "";
  const categoryIdx = Math.max(0, categories.findIndex((category) => category.name === description));
  return {
    id: `backend-${task.taskId ?? task.id ?? task.title ?? Date.now()}`,
    backendId: task.taskId || task.id ? String(task.taskId ?? task.id) : undefined,
    name: String(task.title ?? task.name ?? "업무"),
    categoryIdx: categoryIdx >= 0 ? categoryIdx : 0,
    desc: description,
    priority: task.priority ?? "",
  };
}

export default function AiTaskPage() {
  const { state } = useLocation() as {
    state: {
      workspaces?: WorkspaceItem[];
      workspace?: WorkspaceItem;
      result?: AiResult;
      prompt?: string;
      append?: boolean;
    };
  };
  const navigate = useNavigate();
  const savedWorkspace = readStoredWorkspace();
  const workspaces = withStoredGradients(state?.workspaces ?? (savedWorkspace ? [savedWorkspace] : []));
  const rawWorkspace = state?.workspace ?? workspaces[0] ?? savedWorkspace;
  const workspace = rawWorkspace ? withStoredGradient(rawWorkspace) : undefined;
  const themeStyle = createWorkspaceThemeStyle(workspace?.gradient);
  const sessionKey = `ai_task_session_${workspace?.id ?? "default"}`;
  const currentUserId = localStorage.getItem("userId") ?? "me";
  const isPersonal = workspace?.type === "PERSONAL";

  const storedSession = readAiTaskSession(sessionKey);

  const shouldRestoreSession = !state?.result && !!storedSession;
  const isAppend = !!(state?.append && state?.result && hasAppendBuffer());
  const aiResult   = state?.result ?? storedSession?.result ?? null;
  const origPrompt = state?.prompt ?? storedSession?.prompt ?? "";

  useEffect(() => {
    if (!aiResult) navigate("/workspace-board", { replace: true, state: { workspace, workspaces } });
  }, []);

  // append 모드용 버퍼 (소비 전 캡처)
  const [buffer] = useState(() => {
    const appendBuffer = isAppend ? getAppendBuffer() : null;
    if (isAppend) clearAppendBuffer();
    return appendBuffer;
  });

  // 새 세션 ID (마운트 시 한 번만 생성)
  const [newSessionId] = useState(() => `session-${Date.now()}`);
  const newSessionPrompt = buffer?.newSessionPrompt ?? origPrompt;

  const buildCategories = (res: typeof aiResult, sid: string): Category[] =>
    (res?.categories ?? []).map((cat, ci) => ({
      name: cat.name,
      color: CAT_COLORS[ci % CAT_COLORS.length].color,
      taskColor: CAT_COLORS[ci % CAT_COLORS.length].taskColor,
      sessionId: sid,
    }));

  const buildTasks = (res: typeof aiResult, offset = 0): Task[] =>
    (res?.categories ?? []).flatMap((cat, ci) =>
      cat.tasks.map((t, ti) => ({
        id: `${offset > 0 ? `append-${Date.now()}-` : ""}c${ci}-t${ti}`,
        name: t.name,
        categoryIdx: ci + offset,
        desc: t.desc,
        priority: t.priority,
      }))
    );

  const initSessions = (): Session[] => {
    if (buffer) {
      const existing = (buffer.sessions as Session[] | undefined) ?? [];
      return [...existing, { id: newSessionId, prompt: newSessionPrompt, collapsed: false }];
    }
    if (shouldRestoreSession && storedSession?.sessions?.length) {
      return storedSession.sessions;
    }
    return [{ id: newSessionId, prompt: origPrompt, collapsed: false }];
  };

  const initCategories = (): Category[] => {
    if (buffer) {
      const existingCats = (buffer.categories as Category[]).map((c) => ({
        ...c,
        sessionId: c.sessionId ?? `session-legacy`,
      }));
      return [...existingCats, ...buildCategories(state.result!, newSessionId)];
    }
    if (shouldRestoreSession) {
      return (storedSession?.categories ?? []).map((c) => ({
        ...c,
        sessionId: c.sessionId ?? newSessionId,
      }));
    }
    return buildCategories(aiResult, newSessionId);
  };

  const initTasks = (): Task[] => {
    if (buffer) {
      const offset = (buffer.categories as Category[]).length;
      return [...(buffer.tasks as Task[]), ...buildTasks(state.result!, offset)];
    }
    if (shouldRestoreSession) {
      const poolTasks = storedSession?.tasks ?? [];
      // 장바구니에 이미 있는 태스크를 풀에서 제거 (새로고침 시 중복 방지)
      const basketNames = new Set(
        Object.values(storedSession?.memberBaskets ?? {})
          .flat()
          .map((t: Task) => t.name.trim().toLowerCase())
      );
      return poolTasks.filter((t) => !basketNames.has(t.name.trim().toLowerCase()));
    }
    return buildTasks(aiResult);
  };

  const [sessions, setSessions]     = useState<Session[]>(initSessions);
  const [categories, setCategories] = useState<Category[]>(initCategories);
  const [tasks, setTasks]           = useState<Task[]>(initTasks);
  const [title]                     = useState(shouldRestoreSession ? storedSession?.title ?? "" : aiResult?.title ?? "");
  const [confirmSessionId, setConfirmSessionId] = useState<string | null>(null);

  const [members, setMembers]                       = useState<Member[]>([]);
  const [memberBaskets, setMemberBaskets]           = useState<Record<string, Task[]>>({});
  const [draggingId, setDraggingId]                 = useState<string | null>(null);
  const [draggingFromUserId, setDraggingFromUserId] = useState<string | null>(null);
  const [dragOverUserId, setDragOverUserId]         = useState<string | null>(null);
  const [loadingId, setLoadingId]                   = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId]           = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName]       = useState("");
  const [addingToCat, setAddingToCat]               = useState<number | null>(null);
  const [newTaskName, setNewTaskName]               = useState("");
  const [basketCooldownUntil, setBasketCooldownUntil] = useState(0);
  const [basketCooldownLeft, setBasketCooldownLeft] = useState(0);
  // 삭제 undo — 최근 삭제된 태스크와 원래 위치(categoryIdx) 보관
  const [undoStack, setUndoStack]   = useState<Task[]>([]);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!workspace?.id) return;
    client.get(`/workspaces/${workspace.id}/members`)
      .then(async (res) => {
        const list: Member[] = (res.data.data ?? []).map(normalizeMember);
        setMembers(list);
        const savedBaskets = storedSession?.memberBaskets;

        const nextBaskets: Record<string, Task[]> = Object.fromEntries(
          list.map((member) => [member.userId, savedBaskets?.[member.userId] ?? savedBaskets?.[member.name] ?? []])
        );

        // 장바구니는 localStorage 기준으로만 복원 (POST는 보드 전송 시에만)
        setMemberBaskets(nextBaskets);
        // 장바구니에 있는 태스크는 풀에서 제거
        const basketNames = new Set(
          Object.values(nextBaskets).flat().map((t) => t.name.trim().toLowerCase())
        );
        setTasks((prev) => prev.filter((t) => !basketNames.has(t.name.trim().toLowerCase())));
      })
      .catch(() => {
        const userId = localStorage.getItem("userId") ?? "me";
        const userName = localStorage.getItem("userName") ?? "나";
        setMembers([{ userId, name: userName, role: "MEMBER" }]);
        setMemberBaskets({ [userId]: storedSession?.memberBaskets?.[userId] ?? [] });
      });
  }, [workspace?.id, categories]);

  useEffect(() => {
    if (!aiResult || getSessionPayloadScore({ categories, tasks, result: aiResult, memberBaskets }) === 0) return;
    localStorage.setItem(sessionKey, JSON.stringify({
      title, categories, tasks, prompt: origPrompt, result: aiResult, memberBaskets, sessions,
    }));
  }, [categories, tasks, origPrompt, sessionKey, memberBaskets, sessions]);

  useEffect(() => {
    if (basketCooldownUntil <= Date.now()) {
      setBasketCooldownLeft(0);
      return;
    }

    const tick = () => {
      setBasketCooldownLeft(Math.max(0, Math.ceil((basketCooldownUntil - Date.now()) / 1000)));
    };

    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [basketCooldownUntil]);

  const toggleSession = (id: string) =>
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, collapsed: !s.collapsed } : s));

  const doDeleteSession = (sessionId: string) => {
    const deletedIndices = new Set(
      categories.map((cat, idx) => ({ cat, idx }))
        .filter(({ cat }) => cat.sessionId === sessionId)
        .map(({ idx }) => idx)
    );
    const newCategories = categories.filter((cat) => cat.sessionId !== sessionId);
    // 남은 카테고리의 새 인덱스 매핑
    const indexMap = new Map<number, number>();
    let newIdx = 0;
    categories.forEach((_, oldIdx) => {
      if (!deletedIndices.has(oldIdx)) { indexMap.set(oldIdx, newIdx++); }
    });
    const newTasks = tasks
      .filter((t) => !deletedIndices.has(t.categoryIdx))
      .map((t) => ({ ...t, categoryIdx: indexMap.get(t.categoryIdx) ?? t.categoryIdx }));
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setCategories(newCategories);
    setTasks(newTasks);
    setConfirmSessionId(null);
  };

  const handleDeleteSession = (sessionId: string) => {
    setConfirmSessionId(sessionId);
  };

  const handleDeleteTask = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    // undo 스택에 추가 (최대 5개 유지)
    setUndoStack((prev) => [target, ...prev].slice(0, 5));
    // 기존 타이머 리셋 후 5초 뒤 스택 비움
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoStack([]), 5000);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const [latest, ...rest] = undoStack;
    setTasks((prev) => [...prev, latest]);
    setUndoStack(rest);
    if (rest.length === 0) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    }
  };

  const handleSaveEditTask = (taskId: string) => {
    if (!editingTaskName.trim()) { setEditingTaskId(null); return; }
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, name: editingTaskName.trim() } : t));
    setEditingTaskId(null);
  };

  const handleAddTaskToCategory = (categoryIdx: number) => {
    if (!newTaskName.trim()) return;
    setTasks((prev) => [...prev, { id: `manual-${Date.now()}`, name: newTaskName.trim(), categoryIdx }]);
    setNewTaskName("");
    setAddingToCat(null);
  };

  const handleSubDivide = async (task: Task) => {
    setLoadingId(task.id);
    try {
      const category = categories[task.categoryIdx]?.name ?? "";
      const res = await client.post("/ai/subdivide-task", { task: task.name, category }, { timeout: 60000 });
      const subtasks: { title: string; description: string }[] = res.data.data?.tasks ?? [];
      if (subtasks.length === 0) { alert("더 이상 분할 할 수 없습니다."); return; }
      const newTasks: Task[] = subtasks.map((t, i) => ({
        id: `${task.id}-sub${i}`,
        name: t.title,
        categoryIdx: task.categoryIdx,
        priority: task.priority,
        desc: t.description,
      }));
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === task.id);
        const next = [...prev];
        next.splice(idx, 1, ...newTasks);
        return next;
      });
    } catch (err: any) {
      alert(`세부 분할에 실패했습니다: ${err?.response?.data?.detail ?? err?.message ?? err}`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDragStart = (id: string) => {
    if (basketCooldownLeft > 0) return;
    setDraggingId(id);
    setDraggingFromUserId(null);
  };

  const canDropToBasket = (userId: string) => userId === currentUserId;

  const handleDrop = (userId: string) => {
    if (!draggingId) return;
    if (basketCooldownLeft > 0 || !canDropToBasket(userId)) {
      setDraggingId(null);
      setDragOverUserId(null);
      return;
    }
    const task = tasks.find((t) => t.id === draggingId);
    if (!task) return;

    // 낙관적 UI 업데이트
    setMemberBaskets((prev) => {
      const basket = prev[userId] ?? [];
      if (basket.some((item) => item.id === task.id)) return prev;
      return { ...prev, [userId]: [...basket, task] };
    });
    setTasks((prev) => prev.filter((t) => t.id !== draggingId));
    setDraggingId(null);
    setDragOverUserId(null);
    if (!isPersonal) setBasketCooldownUntil(Date.now() + 3000);

    // 즉시 보드에 생성
    if (workspace?.id) {
      client.post(`/workspaces/${workspace.id}/tasks`, {
        title: task.name,
        description: categories[task.categoryIdx]?.name ?? "",
        status: "TODO",
        assigneeId: userId,
        priority: task.priority ?? null,
      }).then((res) => {
        const backendId = String(res.data.data?.taskId ?? "");
        if (backendId) {
          setMemberBaskets((prev) => ({
            ...prev,
            [userId]: (prev[userId] ?? []).map((t) =>
              t.id === task.id ? { ...t, backendId } : t
            ),
          }));
        }
      }).catch((err) => {
        console.error("태스크 생성 실패:", err);
        // 롤백
        setTasks((prev) => [...prev, task]);
        setMemberBaskets((prev) => ({
          ...prev,
          [userId]: (prev[userId] ?? []).filter((t) => t.id !== task.id),
        }));
        alert("보드 저장에 실패했습니다.");
      });
    }
  };

  const handleReturnDragStart = (id: string, userId: string) => { setDraggingId(id); setDraggingFromUserId(userId); };

  const handleReturnDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingId || !draggingFromUserId) return;
    const task = memberBaskets[draggingFromUserId]?.find((t) => t.id === draggingId);
    if (!task) return;

    // 즉시 보드에서 삭제
    if (task.backendId && workspace?.id) {
      client.delete(`/workspaces/${workspace.id}/tasks/${task.backendId}`)
        .catch((err) => console.error("태스크 삭제 실패:", err));
    }

    setTasks((prev) => [...prev, { ...task, backendId: undefined }]);
    setMemberBaskets((prev) => ({
      ...prev,
      [draggingFromUserId]: (prev[draggingFromUserId] ?? []).filter((t) => t.id !== draggingId),
    }));
    setDraggingId(null);
    setDraggingFromUserId(null);
  };

  const handleReturnAll = async () => {
    const basket = memberBaskets[currentUserId] ?? [];
    if (basket.length === 0) return;

    // 낙관적 UI — 장바구니 비우고 풀로 복원
    setTasks((prev) => [...prev, ...basket.map((t) => ({ ...t, backendId: undefined }))]);
    setMemberBaskets((prev) => ({ ...prev, [currentUserId]: [] }));

    // 백엔드에서 삭제
    if (workspace?.id) {
      for (const task of basket) {
        if (task.backendId) {
          client.delete(`/workspaces/${workspace.id}/tasks/${task.backendId}`)
            .catch((err) => console.error("태스크 삭제 실패:", err));
        }
      }
    }
  };

  const handleTakeAll = async () => {
    if (!workspace?.id || tasks.length === 0) return;
    const userId = currentUserId;

    // 낙관적 UI — 전부 장바구니로 이동
    setMemberBaskets((prev) => ({
      ...prev,
      [userId]: [...(prev[userId] ?? []), ...tasks],
    }));
    setTasks([]);

    // 백엔드에 순차 생성
    const created: Array<{ taskId: string; localId: string }> = [];
    for (const task of tasks) {
      try {
        const res = await client.post(`/workspaces/${workspace.id}/tasks`, {
          title: task.name,
          description: categories[task.categoryIdx]?.name ?? "",
          status: "TODO",
          assigneeId: userId,
          priority: task.priority ?? null,
        });
        const backendId = String(res.data.data?.taskId ?? "");
        if (backendId) created.push({ taskId: backendId, localId: task.id });
      } catch (err) {
        console.error("태스크 생성 실패:", err);
      }
    }

    // backendId 업데이트
    if (created.length > 0) {
      setMemberBaskets((prev) => ({
        ...prev,
        [userId]: (prev[userId] ?? []).map((t) => {
          const found = created.find((c) => c.localId === t.id);
          return found ? { ...t, backendId: found.taskId } : t;
        }),
      }));
    }
  };

  const sendBasketToWorkspace = async () => {
    if (!workspace?.id) { alert("워크스페이스 정보가 없습니다."); return; }

    // backendId 없는 태스크(드래그 중 API 실패 등) 혹시 있으면 저장
    const unsaved: Array<[string, Task]> = [];
    for (const [userId, basket] of Object.entries(memberBaskets)) {
      for (const task of basket) {
        if (!task.backendId) unsaved.push([userId, task]);
      }
    }
    if (unsaved.length > 0) {
      try {
        for (const [userId, task] of unsaved) {
          await client.post(`/workspaces/${workspace.id}/tasks`, {
            title: task.name,
            description: task.desc || categories[task.categoryIdx]?.name || "",
            status: "TODO",
            assigneeId: userId,
            priority: task.priority ?? null,
          });
        }
      } catch (err: any) {
        alert(`업무 저장에 실패했습니다: ${err?.response?.data?.message ?? err?.message ?? err}`);
        return;
      }
    }

    navigate("/workspace-board", { state: { workspaces, workspace } });
  };

  const tasksByCategory = categories.map((_, ci) => tasks.filter((t) => t.categoryIdx === ci));

  const renderTaskCard = (task: Task, cat: Category) => (
    <div
      key={task.id}
      className={`atp-task-card ${draggingId === task.id ? "dragging" : ""} ${basketCooldownLeft > 0 ? "cooldown-locked" : ""}`}
      style={{ background: cat.taskColor }}
      draggable={editingTaskId !== task.id && basketCooldownLeft === 0}
      onDragStart={() => editingTaskId !== task.id && handleDragStart(task.id)}
      onDragEnd={() => setDraggingId(null)}
    >
      {editingTaskId === task.id ? (
        <input
          className="atp-task-edit-input"
          value={editingTaskName}
          onChange={(e) => setEditingTaskName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveEditTask(task.id);
            if (e.key === "Escape") setEditingTaskId(null);
          }}
          onBlur={() => handleSaveEditTask(task.id)}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="atp-task-name"
          onDoubleClick={(e) => { e.stopPropagation(); setEditingTaskId(task.id); setEditingTaskName(task.name); }}
          title="더블클릭하여 수정"
        >{task.name}</span>
      )}
      {task.desc && <p className="atp-task-detail-desc">{task.desc}</p>}
      <div className="atp-task-actions">
        {task.priority && (
          <span className="atp-task-priority" style={{ color: task.priority === "HIGH" ? "#e53935" : task.priority === "LOW" ? "#43a047" : "#fb8c00" }}>
            ● {task.priority}
          </span>
        )}
        <button className="atp-subdivide-btn" onClick={(e) => { e.stopPropagation(); handleSubDivide(task); }} disabled={loadingId === task.id}>
          {loadingId === task.id ? "..." : "세부 분할"}
        </button>
        <button className="atp-task-delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} title="삭제">✕</button>
      </div>
    </div>
  );

  if (!aiResult) return null;

  return (
    <>
    {/* 삭제 undo 토스트 */}
    {undoStack.length > 0 && (
      <div className="atp-undo-toast">
        <span>"{undoStack[0].name}" 삭제됨</span>
        <button className="atp-undo-btn" onClick={handleUndo}>되돌리기</button>
      </div>
    )}
    <div className="atp-page" style={{ ...themeStyle, background: workspace?.gradient ?? "#fff" }}>
      <Header workspaces={workspaces} />

      <div className="atp-topbar">
        <button className="atp-back-btn" onClick={() => navigate("/workspace")}>뒤로가기</button>
        {title && <span className="atp-project-title">{title}</span>}
        <button className="atp-workspace-btn" onClick={sendBasketToWorkspace}>시작하기</button>
      </div>

      <div className="atp-body">
        <div className="atp-tree" onDragOver={(e) => e.preventDefault()} onDrop={handleReturnDrop}>

          {sessions.map((session) => {
            const sessionCats = categories
              .map((cat, globalIdx) => ({ cat, globalIdx }))
              .filter(({ cat }) => cat.sessionId === session.id);
            const totalTasks = sessionCats.reduce((sum, { globalIdx }) => sum + tasksByCategory[globalIdx].length, 0);

            return (
              <div key={session.id} className="atp-session">
                <div className="atp-session-header" onClick={() => toggleSession(session.id)}>
                  <span className="atp-session-toggle">{session.collapsed ? "▶" : "▼"}</span>
                  <span className="atp-session-prompt">{session.prompt}</span>
                  <span className="atp-session-count">{totalTasks}개</span>
                  <button
                    className="atp-session-delete"
                    onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                    title="이 작업 삭제"
                  >✕</button>
                </div>

                {!session.collapsed && (
                  <div className="atp-categories">
                    {sessionCats.map(({ cat, globalIdx: ci }) => (
                      <div key={ci} className="atp-category-col">
                        <div className="atp-cat-node" style={{ borderColor: cat.taskColor }}>{cat.name}</div>
                        <div className="atp-tasks">
                          {tasksByCategory[ci].map((task) => renderTaskCard(task, cat))}
                          {tasksByCategory[ci].length === 0 && <div className="atp-empty-col">모두 배정됨</div>}
                          {addingToCat === ci ? (
                            <div className="atp-add-task-form">
                              <input
                                className="atp-add-task-input"
                                placeholder="업무 이름 입력..."
                                value={newTaskName}
                                onChange={(e) => setNewTaskName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleAddTaskToCategory(ci);
                                  if (e.key === "Escape") { setAddingToCat(null); setNewTaskName(""); }
                                }}
                                autoFocus
                              />
                              <div className="atp-add-task-actions">
                                <button className="atp-add-task-confirm" onClick={() => handleAddTaskToCategory(ci)}>추가</button>
                                <button className="atp-add-task-cancel" onClick={() => { setAddingToCat(null); setNewTaskName(""); }}>취소</button>
                              </div>
                            </div>
                          ) : (
                            <button className="atp-add-task-btn" onClick={() => setAddingToCat(ci)}>+ 직접 추가</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 팀원별 장바구니 슬롯 */}
        <div className={`atp-basket-bar ${isPersonal ? "atp-basket-bar--personal" : ""}`}>
          {basketCooldownLeft > 0 && (
            <div className="atp-basket-toolbar">
              <span className="atp-basket-cooldown">{basketCooldownLeft}초 후 추가 가능</span>
            </div>
          )}
          <div className="atp-basket-outer">
            {members.map((member) => {
              const basket = memberBaskets[member.userId] ?? [];
              const isOver = dragOverUserId === member.userId;
              const isLocked = !canDropToBasket(member.userId);
              return (
                <div key={member.userId} className="atp-user-slot">
                  <div
                    className={`atp-basket-box ${isOver ? "drag-over" : ""} ${isLocked ? "basket-locked" : ""}`}
                    onDragOver={(e) => {
                      if (basketCooldownLeft > 0 || isLocked) return;
                      e.preventDefault();
                      setDragOverUserId(member.userId);
                    }}
                    onDragLeave={() => setDragOverUserId(null)}
                    onDrop={() => handleDrop(member.userId)}
                  >
                    {basket.length === 0 && (
                      <span className="atp-drop-hint">
                        {isLocked ? "내 장바구니만 사용" : basketCooldownLeft > 0 ? "잠시 후 가능" : "여기에 놓기"}
                      </span>
                    )}
                    {basket.map((task) => {
                      const cat = categories[task.categoryIdx];
                      const sessionPrompt = sessions.find((s) => s.id === cat?.sessionId)?.prompt ?? "";
                      return (
                        <div
                          key={task.id}
                          className="atp-basket-card"
                          style={{ background: CAT_COLORS[task.categoryIdx % CAT_COLORS.length].taskColor }}
                          draggable
                          onDragStart={() => handleReturnDragStart(task.id, member.userId)}
                        >
                          {sessionPrompt && (
                            <span className="atp-basket-card-session">{sessionPrompt}</span>
                          )}
                          <div className="atp-basket-card-bottom">
                            <span className="atp-basket-card-name">{task.name}</span>
                            <span className="atp-basket-card-tag">{cat?.name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const isMe = member.userId === currentUserId;
                    const myBasket = memberBaskets[member.userId] ?? [];
                    const canTake = isMe && tasks.length > 0;
                    const canReturn = isMe && tasks.length === 0 && myBasket.length > 0;
                    const interactive = canTake || canReturn;
                    return (
                      <div
                        className={`atp-avatar-wrap ${interactive ? (canTake ? "atp-avatar-takeable" : "atp-avatar-returnable") : ""}`}
                        onClick={() => { if (canTake) handleTakeAll(); else if (canReturn) handleReturnAll(); }}
                        title={canTake ? `모두 가져오기 (${tasks.length}개)` : canReturn ? `모두 내보내기 (${myBasket.length}개)` : undefined}
                      >
                        <PixelAvatar userId={member.userId} name={member.name} size="sm" className="atp-pixel-avatar" />
                        {canTake && <span className="atp-avatar-take-hint">{tasks.length}</span>}
                        {canReturn && <span className="atp-avatar-take-hint atp-avatar-return-hint">{myBasket.length}</span>}
                      </div>
                    );
                  })()}
                  <span className="atp-user-name">{member.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>

    {/* 섹션 삭제 확인 모달 */}
    {confirmSessionId && (
      <div className="atp-confirm-overlay" onClick={() => setConfirmSessionId(null)}>
        <div className="atp-confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="atp-confirm-icon">🗑️</div>
          <h3 className="atp-confirm-title">작업 섹션 삭제</h3>
          <p className="atp-confirm-msg">
            이 작업과 연결된 모든 태스크가 삭제됩니다.<br />정말 삭제할까요?
          </p>
          <div className="atp-confirm-btns">
            <button className="atp-confirm-cancel" onClick={() => setConfirmSessionId(null)}>취소</button>
            <button className="atp-confirm-delete" onClick={() => doDeleteSession(confirmSessionId)}>삭제</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
