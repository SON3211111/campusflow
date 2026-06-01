/**
 * AI 태스크 관리 페이지
 * - 큰 작업(프롬프트)별로 트리 섹션이 분리되어 표시
 * - 각 섹션은 접고 펼칠 수 있음
 * - 팀원별 슬롯에 드래그로 Picking
 */
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import client from "../api/client";
import { getAppendBuffer, clearAppendBuffer, hasAppendBuffer } from "../store/aiTaskBuffer";
import "./AiTaskPage.css";

interface Task {
  id: string;
  name: string;
  categoryIdx: number;
  priority?: string;
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
}

interface AiTask {
  name: string;
  priority?: string;
}

interface AiResult {
  title: string;
  categories: { id: string; name: string; tasks: AiTask[] }[];
}

interface AiTaskSession {
  title: string;
  categories: Category[];
  tasks: Task[];
  prompt: string;
  result: AiResult;
  memberBaskets?: Record<string, Task[]>;
  sessions?: Session[];
}

const CAT_COLORS = [
  { color: "#1a1a1a", taskColor: "#f8b4b4" },
  { color: "#6ab4f8", taskColor: "#6ab4f8" },
  { color: "#7de89a", taskColor: "#7de89a" },
  { color: "#c4a8f8", taskColor: "#c4a8f8" },
  { color: "#f8d08a", taskColor: "#f8d08a" },
];

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
  const workspaces = state?.workspaces ?? [];
  const workspace  = state?.workspace ?? workspaces[0];
  const sessionKey = `ai_task_session_${workspace?.id ?? "default"}`;

  const storedSession: AiTaskSession | null = (() => {
    try { return JSON.parse(localStorage.getItem(sessionKey) ?? "null"); }
    catch { return null; }
  })();

  const shouldRestoreSession = !state?.result && !!storedSession;
  const isAppend = !!(state?.append && state?.result && hasAppendBuffer());
  const aiResult   = state?.result ?? storedSession?.result ?? null;
  const origPrompt = state?.prompt ?? storedSession?.prompt ?? "";

  useEffect(() => {
    if (!aiResult) navigate("/workspace-board", { replace: true, state: { workspace, workspaces } });
  }, []);

  if (!aiResult) return null;

  // append 모드용 버퍼 (소비 전 캡처)
  const buffer = isAppend ? getAppendBuffer() : null;
  if (isAppend) clearAppendBuffer();

  // 새 세션 ID (마운트 시 한 번만 생성)
  const newSessionId = `session-${Date.now()}`;
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
    if (shouldRestoreSession) return storedSession?.tasks ?? [];
    return buildTasks(aiResult);
  };

  const [sessions, setSessions]     = useState<Session[]>(initSessions);
  const [categories, setCategories] = useState<Category[]>(initCategories);
  const [tasks, setTasks]           = useState<Task[]>(initTasks);
  const [title]                     = useState(shouldRestoreSession ? storedSession?.title ?? "" : aiResult.title ?? "");

  const [members, setMembers]                       = useState<Member[]>([]);
  const [memberBaskets, setMemberBaskets]           = useState<Record<string, Task[]>>({});
  const [draggingId, setDraggingId]                 = useState<string | null>(null);
  const [draggingFromUserId, setDraggingFromUserId] = useState<string | null>(null);
  const [dragOverUserId, setDragOverUserId]         = useState<string | null>(null);
  const [loadingId, setLoadingId]                   = useState<string | null>(null);
  const [saveMsg, setSaveMsg]                       = useState("");
  const [cooldown, setCooldown]                     = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [editingTaskId, setEditingTaskId]           = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName]       = useState("");
  const [addingToCat, setAddingToCat]               = useState<number | null>(null);
  const [newTaskName, setNewTaskName]               = useState("");

  useEffect(() => {
    if (!workspace?.id) return;
    client.get(`/workspaces/${workspace.id}/members`)
      .then((res) => {
        const list: Member[] = (res.data.data ?? []).map((m: any) => ({
          userId: m.userId, name: m.name, role: m.role,
        }));
        setMembers(list);
        const savedBaskets = storedSession?.memberBaskets;
        if (savedBaskets) {
          setMemberBaskets(Object.fromEntries(list.map((m) => [m.userId, savedBaskets[m.userId] ?? []])));
        } else {
          setMemberBaskets(Object.fromEntries(list.map((m) => [m.userId, []])));
        }
      })
      .catch(() => {
        const userId = localStorage.getItem("userId") ?? "me";
        const userName = localStorage.getItem("userName") ?? "나";
        setMembers([{ userId, name: userName, role: "MEMBER" }]);
        setMemberBaskets({ [userId]: [] });
      });
  }, [workspace?.id]);

  useEffect(() => {
    localStorage.setItem(sessionKey, JSON.stringify({
      title, categories, tasks, prompt: origPrompt, result: aiResult, memberBaskets, sessions,
    }));
  }, [categories, tasks, origPrompt, sessionKey, memberBaskets, sessions]);

  const showMsg = (msg: string) => { setSaveMsg(msg); setTimeout(() => setSaveMsg(""), 5000); };

  const startCooldown = () => {
    setCooldown(3);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => { if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; } return prev - 1; });
    }, 1000);
  };

  const toggleSession = (id: string) =>
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, collapsed: !s.collapsed } : s));

  const handleDeleteSession = (sessionId: string) => {
    if (!window.confirm("이 작업과 모든 태스크를 삭제할까요?")) return;
    // 삭제할 카테고리 인덱스 집합
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
  };

  const handleDeleteTask = (taskId: string) => setTasks((prev) => prev.filter((t) => t.id !== taskId));

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
      const subtasks: string[] = res.data.data?.tasks ?? [];
      if (subtasks.length === 0) { alert("더 이상 분할 할 수 없습니다."); return; }
      const newTasks: Task[] = subtasks.map((t, i) => ({ id: `${task.id}-sub${i}`, name: t, categoryIdx: task.categoryIdx }));
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

  const handleDragStart = (id: string) => { setDraggingId(id); setDraggingFromUserId(null); };

  const handleDrop = (userId: string) => {
    if (!draggingId || cooldown > 0) return;
    const task = tasks.find((t) => t.id === draggingId);
    if (!task) return;
    setMemberBaskets((prev) => {
      const basket = prev[userId] ?? [];
      if (basket.some((item) => item.id === task.id)) return prev;
      return { ...prev, [userId]: [...basket, task] };
    });
    setTasks((prev) => prev.filter((t) => t.id !== draggingId));
    setDraggingId(null);
    setDragOverUserId(null);
    startCooldown();
  };

  const handleReturnDragStart = (id: string, userId: string) => { setDraggingId(id); setDraggingFromUserId(userId); };

  const handleReturnDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingId || !draggingFromUserId) return;
    const task = memberBaskets[draggingFromUserId]?.find((t) => t.id === draggingId);
    if (!task) return;
    setTasks((prev) => [...prev, task]);
    setMemberBaskets((prev) => ({
      ...prev,
      [draggingFromUserId]: (prev[draggingFromUserId] ?? []).filter((t) => t.id !== draggingId),
    }));
    setDraggingId(null);
    setDraggingFromUserId(null);
  };

  const sendBasketToWorkspace = async () => {
    if (!workspace?.id) { alert("워크스페이스 정보가 없습니다."); return; }
    const allEmpty = Object.values(memberBaskets).every((b) => b.length === 0);
    if (allEmpty) { navigate("/workspace-board", { state: { workspaces, workspace } }); return; }
    try {
      for (const [userId, basket] of Object.entries(memberBaskets)) {
        for (const task of basket) {
          await client.post(`/workspaces/${workspace.id}/tasks`, {
            title: task.name,
            description: categories[task.categoryIdx]?.name ?? "",
            status: "TODO",
            assigneeId: userId,
            priority: task.priority ?? null,
          });
        }
      }
      showMsg("보드에 업무를 저장했습니다");
      navigate("/workspace-board", { state: { workspaces, workspace } });
    } catch (err: any) {
      alert(`업무 저장에 실패했습니다: ${err?.response?.data?.message ?? err?.message ?? err}`);
    }
  };

  const tasksByCategory = categories.map((_, ci) => tasks.filter((t) => t.categoryIdx === ci));

  const renderTaskCard = (task: Task, cat: Category) => (
    <div
      key={task.id}
      className={`atp-task-card ${draggingId === task.id ? "dragging" : ""}`}
      style={{ background: cat.taskColor }}
      draggable={editingTaskId !== task.id}
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
      <div className="atp-task-actions">
        <button className="atp-subdivide-btn" onClick={(e) => { e.stopPropagation(); handleSubDivide(task); }} disabled={loadingId === task.id}>
          {loadingId === task.id ? "..." : "세부 분할"}
        </button>
        <button className="atp-task-delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} title="삭제">✕</button>
      </div>
    </div>
  );

  return (
    <div className="atp-page">
      <Header workspaces={workspaces} />

      <div className="atp-topbar">
        <button className="atp-back-btn" onClick={() => navigate("/workspace")}>뒤로가기</button>
        {title && <span className="atp-project-title">{title}</span>}
        {saveMsg && <span className="atp-save-msg">{saveMsg}</span>}
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
        <div className="atp-basket-bar">
          <div className="atp-basket-outer">
            {cooldown > 0 && <span className="atp-cooldown-msg">{cooldown}초 대기</span>}
            {members.map((member) => {
              const basket = memberBaskets[member.userId] ?? [];
              const isOver = dragOverUserId === member.userId;
              return (
                <div key={member.userId} className="atp-user-slot">
                  <div
                    className={`atp-basket-box ${isOver && cooldown === 0 ? "drag-over" : ""} ${cooldown > 0 ? "basket-locked" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); if (cooldown === 0) setDragOverUserId(member.userId); }}
                    onDragLeave={() => setDragOverUserId(null)}
                    onDrop={() => handleDrop(member.userId)}
                  >
                    {basket.length === 0 && <span className="atp-drop-hint">여기에 놓기</span>}
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
                  <div className="atp-avatar">{member.name[0]}</div>
                  <span className="atp-user-name">{member.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
