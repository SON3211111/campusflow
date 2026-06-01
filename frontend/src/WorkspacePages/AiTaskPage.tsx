/**
 * AI 태스크 관리 페이지 (팀 다중 슬롯 장바구니)
 * - 워크스페이스 멤버를 서버에서 조회하여 멤버별 장바구니 슬롯 렌더링
 * - 드래그앤드롭으로 원하는 팀원 슬롯에 업무 배정
 * - 보드로 보내기 시 각 업무에 assigneeId 포함하여 저장
 */
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import client from "../api/client";
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
  const isAppend = !!(state?.append && state?.result && storedSession);
  const aiResult   = state?.result ?? storedSession?.result ?? null;
  const origPrompt = state?.prompt ?? storedSession?.prompt ?? "";

  useEffect(() => {
    if (!aiResult) navigate("/workspace-board", { replace: true, state: { workspace, workspaces } });
  }, []);

  if (!aiResult) return null;

  const buildCategories = (res: typeof aiResult) =>
    (res?.categories ?? []).map((cat, ci) => ({
      name: cat.name,
      color: CAT_COLORS[ci % CAT_COLORS.length].color,
      taskColor: CAT_COLORS[ci % CAT_COLORS.length].taskColor,
    }));

  const buildTasks = (res: typeof aiResult): Task[] =>
    (res?.categories ?? []).flatMap((cat, ci) =>
      cat.tasks.map((t, ti) => ({ id: `c${ci}-t${ti}`, name: t.name, categoryIdx: ci, priority: t.priority }))
    );

  const initCategories = (): Category[] => {
    if (isAppend) {
      const existingCats = storedSession?.categories ?? [];
      const newCats = buildCategories(state.result!);
      return [...existingCats, ...newCats];
    }
    if (shouldRestoreSession) return storedSession?.categories ?? [];
    return buildCategories(aiResult);
  };

  const initTasks = (): Task[] => {
    if (isAppend) {
      const existingCats = storedSession?.categories ?? [];
      const offset = existingCats.length;
      const existingTasks = storedSession?.tasks ?? [];
      const newTasks = buildTasks(state.result!).map((t) => ({
        ...t,
        id: `append-${Date.now()}-${t.id}`,
        categoryIdx: t.categoryIdx + offset,
      }));
      return [...existingTasks, ...newTasks];
    }
    if (shouldRestoreSession) return storedSession?.tasks ?? [];
    return buildTasks(aiResult);
  };

  const [title, setTitle]           = useState(isAppend || shouldRestoreSession ? storedSession?.title ?? "" : aiResult.title ?? "");
  const [categories, setCategories] = useState<Category[]>(initCategories);
  const [tasks, setTasks]           = useState<Task[]>(initTasks);

  // 멤버별 장바구니: { [userId]: Task[] }
  const [members, setMembers]             = useState<Member[]>([]);
  const [memberBaskets, setMemberBaskets] = useState<Record<string, Task[]>>({});

  const [draggingId, setDraggingId]               = useState<string | null>(null);
  const [draggingFromUserId, setDraggingFromUserId] = useState<string | null>(null);
  const [dragOverUserId, setDragOverUserId]         = useState<string | null>(null);
  const [loadingId, setLoadingId]                   = useState<string | null>(null);
  const [saveMsg, setSaveMsg]                       = useState("");
  const [cooldown, setCooldown]                     = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [newPromptOpen, setNewPromptOpen]           = useState(false);
  const [newPrompt, setNewPrompt]                   = useState("");
  const [editingTaskId, setEditingTaskId]           = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName]       = useState("");
  const [addingToCat, setAddingToCat]               = useState<number | null>(null);
  const [newTaskName, setNewTaskName]               = useState("");

  // 워크스페이스 멤버 목록 조회
  useEffect(() => {
    if (!workspace?.id) return;
    client.get(`/workspaces/${workspace.id}/members`)
      .then((res) => {
        const list: Member[] = (res.data.data ?? []).map((m: any) => ({
          userId: m.userId,
          name: m.name,
          role: m.role,
        }));
        setMembers(list);
        // 세션에 저장된 basket 복원, 없으면 빈 슬롯 초기화
        const savedBaskets = storedSession?.memberBaskets;
        if (savedBaskets) {
          const restored: Record<string, Task[]> = Object.fromEntries(list.map((m) => [m.userId, savedBaskets[m.userId] ?? []]));
          setMemberBaskets(restored);
        } else {
          setMemberBaskets(Object.fromEntries(list.map((m) => [m.userId, []])));
        }
      })
      .catch(() => {
        // 멤버 조회 실패 시 현재 로그인 유저로 폴백
        const userId = localStorage.getItem("userId") ?? "me";
        const userName = localStorage.getItem("userName") ?? "나";
        setMembers([{ userId, name: userName, role: "MEMBER" }]);
        setMemberBaskets({ [userId]: [] });
      });
  }, [workspace?.id]);

  // 세션 자동 저장 (basket 포함 — 돌아왔을 때 picks 복원)
  useEffect(() => {
    localStorage.setItem(sessionKey, JSON.stringify({ title, categories, tasks, prompt: origPrompt, result: aiResult, memberBaskets }));
  }, [title, categories, tasks, origPrompt, sessionKey, memberBaskets]);

  const showMsg = (msg: string) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(""), 5000);
  };

  const startCooldown = () => {
    setCooldown(3);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };



  const handleSubDivide = async (task: Task) => {
    setLoadingId(task.id);
    try {
      const category = categories[task.categoryIdx]?.name ?? "";
      const res = await client.post("/ai/subdivide-task", { task: task.name, category }, { timeout: 60000 });
      const subtasks: string[] = res.data.data?.tasks ?? [];
      if (subtasks.length === 0) { alert("더 이상 분할 할 수 없습니다."); return; }
      const newTasks: Task[] = subtasks.map((t, i) => ({
        id: `${task.id}-sub${i}`,
        name: t,
        categoryIdx: task.categoryIdx,
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

  // 태스크 삭제
  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // 태스크 이름 수정 저장
  const handleSaveEditTask = (taskId: string) => {
    if (!editingTaskName.trim()) { setEditingTaskId(null); return; }
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, name: editingTaskName.trim() } : t));
    setEditingTaskId(null);
  };

  // 카테고리에 직접 태스크 추가
  const handleAddTaskToCategory = (categoryIdx: number) => {
    if (!newTaskName.trim()) return;
    const newTask: Task = { id: `manual-${Date.now()}`, name: newTaskName.trim(), categoryIdx };
    setTasks((prev) => [...prev, newTask]);
    setNewTaskName("");
    setAddingToCat(null);
  };

  // 트리에서 드래그 시작
  const handleDragStart = (id: string) => {
    setDraggingId(id);
    setDraggingFromUserId(null);
  };

  // 특정 멤버 슬롯에 드롭
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

  // 장바구니에서 트리로 반환 드래그 시작
  const handleReturnDragStart = (id: string, userId: string) => {
    setDraggingId(id);
    setDraggingFromUserId(userId);
  };

  // 트리 영역에 드롭 → 장바구니에서 트리로 복귀
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

  // 모든 멤버 슬롯의 업무를 assigneeId와 함께 보드에 저장
  const sendBasketToWorkspace = async () => {
    if (!workspace?.id) { alert("워크스페이스 정보가 없습니다."); return; }
    const allEmpty = Object.values(memberBaskets).every((b) => b.length === 0);
    if (allEmpty) {
      navigate("/workspace-board", { state: { workspaces, workspace } });
      return;
    }
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

  const handleStartNewBreakdown = () => {
    if (!newPrompt.trim()) return;
    // navigate 전에 현재 상태를 세션에 강제 저장
    localStorage.setItem(sessionKey, JSON.stringify({ title, categories, tasks, prompt: origPrompt, result: aiResult, memberBaskets }));
    navigate("/task-breakdown", { state: { prompt: newPrompt.trim(), workspaces, workspace, append: true } });
  };

  const tasksByCategory = categories.map((_, ci) => tasks.filter((t) => t.categoryIdx === ci));

  return (
    <div className="atp-page">
      <Header workspaces={workspaces} />

      <div className="atp-topbar">
        <button className="atp-back-btn" onClick={() => navigate("/workspace")}>뒤로가기</button>
        {title && <span className="atp-project-title">{title}</span>}
        {saveMsg && <span className="atp-save-msg">{saveMsg}</span>}
        <button className="atp-new-btn" onClick={() => setNewPromptOpen((v) => !v)}>+ 새 업무 분해</button>
        <button className="atp-workspace-btn" onClick={sendBasketToWorkspace}>보드로 보내기</button>
      </div>

      {newPromptOpen && (
        <div className="atp-new-prompt-bar">
          <textarea
            className="atp-new-prompt-input"
            placeholder="새로운 업무 내용을 입력하세요..."
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleStartNewBreakdown(); } }}
            autoFocus
          />
          <div className="atp-new-prompt-actions">
            <button className="atp-new-prompt-submit" onClick={handleStartNewBreakdown} disabled={!newPrompt.trim()}>
              🤖 AI 분해 시작
            </button>
            <button className="atp-new-prompt-cancel" onClick={() => { setNewPromptOpen(false); setNewPrompt(""); }}>취소</button>
          </div>
        </div>
      )}

      <div className="atp-body">
        {/* 트리 영역 */}
        <div
          className="atp-tree"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleReturnDrop}
        >
          <div className="atp-root-wrap">
            <div className="atp-root-node">
              <span className="atp-root-icon">⊛</span>
              <span>{title || "프로젝트"}</span>
            </div>
            <div className="atp-root-line" />
          </div>

          <div className="atp-categories">
            {categories.map((cat, ci) => (
              <div key={ci} className="atp-category-col">
                <div className="atp-cat-node" style={{ borderColor: cat.taskColor }}>
                  {cat.name}
                </div>
                <div className="atp-tasks">
                  {tasksByCategory[ci].map((task) => (
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
                        <button
                          className="atp-subdivide-btn"
                          onClick={(e) => { e.stopPropagation(); handleSubDivide(task); }}
                          disabled={loadingId === task.id}
                        >
                          {loadingId === task.id ? "..." : "세부 분할"}
                        </button>
                        <button
                          className="atp-task-delete-btn"
                          onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                          title="삭제"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                  {tasksByCategory[ci].length === 0 && (
                    <div className="atp-empty-col">모두 배정됨</div>
                  )}
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
                    {basket.length === 0 && (
                      <span className="atp-drop-hint">여기에 놓기</span>
                    )}
                    {basket.map((task) => (
                      <div
                        key={task.id}
                        className="atp-basket-card"
                        style={{ background: CAT_COLORS[task.categoryIdx % CAT_COLORS.length].taskColor }}
                        draggable
                        onDragStart={() => handleReturnDragStart(task.id, member.userId)}
                      >
                        <span className="atp-basket-card-name">{task.name}</span>
                        <span className="atp-basket-card-tag">{categories[task.categoryIdx]?.name}</span>
                      </div>
                    ))}
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
