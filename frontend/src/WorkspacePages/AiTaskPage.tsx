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
  desc?: string;
  priority?: string;
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

interface AiResult {
  title: string;
  categories: { id: string; name: string; tasks: CategoryTaskItem[] }[];
}

interface AiTaskSession {
  title: string;
  categories: Category[];
  tasks: Task[];
  prompt: string;
  result: AiResult;
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
      cat.tasks.map((t, ti) => ({ id: `c${ci}-t${ti}`, name: t.name, categoryIdx: ci, desc: t.desc, priority: t.priority }))
    );

  const [title, setTitle]           = useState(shouldRestoreSession ? storedSession?.title ?? "" : aiResult.title ?? "");
  const [categories, setCategories] = useState<Category[]>(shouldRestoreSession ? storedSession?.categories ?? [] : buildCategories(aiResult));
  const [tasks, setTasks]           = useState<Task[]>(shouldRestoreSession ? storedSession?.tasks ?? [] : buildTasks(aiResult));

  // 멤버별 장바구니: { [userId]: Task[] }
  const [members, setMembers]             = useState<Member[]>([]);
  const [memberBaskets, setMemberBaskets] = useState<Record<string, Task[]>>({});

  const [draggingId, setDraggingId]               = useState<string | null>(null);
  const [draggingFromUserId, setDraggingFromUserId] = useState<string | null>(null);
  const [dragOverUserId, setDragOverUserId]         = useState<string | null>(null);
  const [loadingId, setLoadingId]                   = useState<string | null>(null);
  const [resetLoading, setResetLoading]             = useState(false);
  const [saved, setSaved]                           = useState(false);
  const [saveMsg, setSaveMsg]                       = useState("");
  const [cooldown, setCooldown]                     = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [newPromptOpen, setNewPromptOpen]           = useState(false);
  const [newPrompt, setNewPrompt]                   = useState("");

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
        // 각 멤버의 장바구니 슬롯 초기화
        setMemberBaskets(Object.fromEntries(list.map((m) => [m.userId, []])));
      })
      .catch(() => {
        // 멤버 조회 실패 시 현재 로그인 유저로 폴백
        const userId = localStorage.getItem("userId") ?? "me";
        const userName = localStorage.getItem("userName") ?? "나";
        setMembers([{ userId, name: userName, role: "MEMBER" }]);
        setMemberBaskets({ [userId]: [] });
      });
  }, [workspace?.id]);

  // 세션 자동 저장 (basket 제외 - 멤버 슬롯은 서버 기준이므로)
  useEffect(() => {
    localStorage.setItem(sessionKey, JSON.stringify({ title, categories, tasks, prompt: origPrompt, result: aiResult }));
  }, [title, categories, tasks, origPrompt, sessionKey]);

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

  const buildCurrentResult = (): AiResult => {
    const allBasketTasks = Object.values(memberBaskets).flat();
    return {
      title,
      categories: categories.map((cat, ci) => ({
        id: `c${ci + 1}`,
        name: cat.name,
        tasks: [...tasks, ...allBasketTasks]
          .filter((t) => t.categoryIdx === ci)
          .map((t) => ({ name: t.name, desc: t.desc ?? "", priority: t.priority ?? "MEDIUM" })),
      })),
    };
  };

  const handleSaveTask = () => {
    if (saved) { showMsg("이미 저장되었습니다"); return; }
    const list = JSON.parse(localStorage.getItem("saved_ai_tasks") ?? "[]");
    const newEntry = { id: Date.now().toString(), title, prompt: origPrompt, result: buildCurrentResult() };
    localStorage.setItem("saved_ai_tasks", JSON.stringify([...list, newEntry]));
    setSaved(true);
    showMsg("저장되었습니다");
  };

  const handleReset = async () => {
    if (!origPrompt) { alert("프롬프트 정보가 없습니다. 워크스페이스에서 다시 시작해주세요."); return; }
    setResetLoading(true);
    try {
      const params = new URLSearchParams({ description: origPrompt });
      const res = await client.post(`/ai/generate-tasks?${params}`, {}, { timeout: 120000 });
      const data = res.data.data;
      const categoryMap = new Map<string, CategoryTaskItem[]>();
      (data.tasks ?? []).forEach((task: any) => {
        if (!categoryMap.has(task.category)) categoryMap.set(task.category, []);
        categoryMap.get(task.category)!.push({ name: task.title ?? "", desc: task.description ?? "", priority: task.priority ?? "MEDIUM" });
      });
      const json: AiResult = {
        title: origPrompt.slice(0, 30),
        categories: Array.from(categoryMap.entries()).map(([name, tasks], i) => ({ id: `c${i + 1}`, name, tasks })),
      };
      setTitle(json.title);
      setCategories(buildCategories(json));
      setTasks(buildTasks(json));
      // 장바구니 초기화
      setMemberBaskets(Object.fromEntries(members.map((m) => [m.userId, []])));
      setSaved(false);
    } catch (err: any) {
      alert(`다시 설정에 실패했습니다: ${err?.response?.data?.detail ?? err?.message ?? err}`);
    } finally {
      setResetLoading(false);
    }
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
            description: task.desc || categories[task.categoryIdx]?.name || "",
            status: "TODO",
            assigneeId: userId,
          });
        }
      }
      setMemberBaskets(Object.fromEntries(members.map((m) => [m.userId, []])));
      showMsg("보드에 업무를 저장했습니다");
      navigate("/workspace-board", { state: { workspaces, workspace } });
    } catch (err: any) {
      alert(`업무 저장에 실패했습니다: ${err?.response?.data?.message ?? err?.message ?? err}`);
    }
  };

  const handleStartNewBreakdown = () => {
    if (!newPrompt.trim()) return;
    localStorage.removeItem(sessionKey);
    navigate("/task-breakdown", { state: { prompt: newPrompt.trim(), workspaces, workspace } });
  };

  const tasksByCategory = categories.map((_, ci) => tasks.filter((t) => t.categoryIdx === ci));

  return (
    <div className="atp-page">
      <Header workspaces={workspaces} />

      <div className="atp-topbar">
        <button className="atp-back-btn" onClick={() => navigate("/workspace")}>뒤로가기</button>
        {title && <span className="atp-project-title">{title}</span>}
        <button className="atp-reset-btn" onClick={handleReset} disabled={resetLoading}>
          {resetLoading ? "분석 중..." : "다시 설정"}
        </button>
        <div className="atp-save-wrap">
          <button className="atp-save-btn" onClick={handleSaveTask}>task 저장</button>
          {saveMsg && <span className="atp-save-msg">{saveMsg}</span>}
        </div>
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
                  {tasksByCategory[ci].map((task) => {
                    const priorityColor = task.priority === "HIGH" ? "#e53935" : task.priority === "LOW" ? "#43a047" : "#fb8c00";
                    return (
                      <div
                        key={task.id}
                        className={`atp-task-card ${draggingId === task.id ? "dragging" : ""}`}
                        style={{ background: cat.taskColor }}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        onDragEnd={() => setDraggingId(null)}
                      >
                        <span className="atp-task-name">{task.name}</span>
                        {task.desc && <p className="atp-task-detail-desc">{task.desc}</p>}
                        <div className="atp-task-footer">
                          {task.priority && (
                            <span className="atp-task-priority" style={{ color: priorityColor }}>● {task.priority}</span>
                          )}
                          <button
                            className="atp-subdivide-btn"
                            onClick={(e) => { (e as any).stopPropagation(); handleSubDivide(task); }}
                            disabled={loadingId === task.id}
                          >
                            {loadingId === task.id ? "..." : "세부 분할"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {tasksByCategory[ci].length === 0 && (
                    <div className="atp-empty-col">모두 배정됨</div>
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
