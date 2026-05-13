import { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import "./AiTaskPage.css";

interface Task {
  id: string;
  name: string;
  categoryIdx: number;
}

interface Category {
  name: string;
  color: string;
  taskColor: string;
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
      workspaces?: { id: number; name: string; gradient: string }[];
      result?: { title: string; categories: { id: string; name: string; tasks: string[] }[] };
      prompt?: string;
    };
  };
  const navigate = useNavigate();
  const workspaces   = state?.workspaces ?? [];
  const aiResult     = state?.result;
  const origPrompt   = state?.prompt ?? "";

  const userName = localStorage.getItem("userName") ?? "나";

  if (!aiResult) {
    navigate("/workspace", { replace: true });
    return null;
  }

  const buildCategories = (res: typeof aiResult) =>
    (res?.categories ?? []).map((cat, ci) => ({
      name: cat.name,
      color: CAT_COLORS[ci % CAT_COLORS.length].color,
      taskColor: CAT_COLORS[ci % CAT_COLORS.length].taskColor,
    }));

  const buildTasks = (res: typeof aiResult): Task[] =>
    (res?.categories ?? []).flatMap((cat, ci) =>
      cat.tasks.map((t, ti) => ({ id: `c${ci}-t${ti}`, name: t, categoryIdx: ci }))
    );

  const [title, setTitle]               = useState<string>(aiResult.title ?? "");
  const [categories, setCategories]     = useState<Category[]>(buildCategories(aiResult));
  const [tasks, setTasks]               = useState<Task[]>(buildTasks(aiResult));
  const [basket, setBasket]             = useState<Task[]>([]);
  const [draggingId, setDraggingId]     = useState<string | null>(null);
  const [dragOver, setDragOver]         = useState(false);
  const [loadingId, setLoadingId]       = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [saved, setSaved]               = useState(false);
  const [saveMsg, setSaveMsg]           = useState("");
  const [cooldown, setCooldown]         = useState(0);
  const cooldownRef                     = useRef<ReturnType<typeof setInterval> | null>(null);

  const showMsg = (msg: string) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(""), 5000);
  };

  const handleSaveTask = () => {
    if (saved) {
      showMsg("이미 저장되었습니다");
      return;
    }
    const list = JSON.parse(localStorage.getItem("saved_ai_tasks") ?? "[]");
    const newEntry = { id: Date.now().toString(), title, prompt: origPrompt, result: aiResult };
    localStorage.setItem("saved_ai_tasks", JSON.stringify([...list, newEntry]));
    setSaved(true);
    showMsg("저장되었습니다");
  };

  const handleReset = async () => {
    if (!origPrompt) {
      alert("프롬프트 정보가 없습니다. 워크스페이스에서 다시 시작해주세요.");
      return;
    }
    setResetLoading(true);
    try {
      const systemPrompt = `반드시 한국어로만 답하세요. 단, UI/UX, API 등 영어 전문용어는 그대로 써도 됩니다.
다음 프로젝트 업무를 JSON으로 분해해주세요. 반드시 아래 형식의 JSON만 반환하세요. 다른 설명은 절대 쓰지 마세요:
{"title":"프로젝트명","categories":[{"id":"c1","name":"카테고리명","tasks":["업무1","업무2","업무3"]}]}
title은 프로젝트 내용을 잘 나타내는 15자 이내 한국어로 작성하세요.
프로젝트: ${origPrompt}`;
      const res = await axios.post("/ai/generate", { prompt: systemPrompt }, { timeout: 60000 });
      const text: string = res.data.result ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return;
      const json = JSON.parse(match[0]);
      setTitle(json.title ?? "");
      setCategories(buildCategories(json));
      setTasks(buildTasks(json));
      setBasket([]);
      setSaved(false);
    } catch {
      alert("다시 설정에 실패했습니다.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubDivide = async (task: Task) => {
    setLoadingId(task.id);
    try {
      const prompt = `반드시 한국어로만 답하세요. 단, UI/UX, API 등 영어 전문용어는 그대로 써도 됩니다.
다음 업무를 성격이 다른 2개의 세부 업무로 분해해주세요. 단순히 숫자만 붙이거나 같은 내용을 반복하면 안 됩니다. 각 세부 업무는 서로 다른 작업이어야 합니다. 더 이상 의미 있게 나눌 수 없다면 tasks를 빈 배열로 반환하세요. 반드시 아래 JSON 형식만 반환하세요:
{"tasks":["세부업무1","세부업무2"]}
업무: ${task.name}`;
      const res = await axios.post("/ai/generate", { prompt }, { timeout: 60000 });
      const text: string = res.data.result ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return;
      const json: { tasks: string[] } = JSON.parse(match[0]);
      if (!json.tasks || json.tasks.length === 0) {
        alert("더 이상 분할 할 수 없습니다.");
        return;
      }
      const newTasks: Task[] = json.tasks.map((t, i) => ({
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
    } catch {
      alert("세부 분할에 실패했습니다.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDragStart = (id: string) => setDraggingId(id);

  const handleDrop = () => {
    if (!draggingId) return;
    if (cooldown > 0) return;
    const task = tasks.find((t) => t.id === draggingId);
    if (!task) return;
    setBasket((prev) => [...prev, task]);
    setTasks((prev) => prev.filter((t) => t.id !== draggingId));
    setDraggingId(null);
    setDragOver(false);
    setCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleReturnDragStart = (id: string) => setDraggingId(id);

  const handleReturnDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingId) return;
    const task = basket.find((t) => t.id === draggingId);
    if (!task) return;
    setTasks((prev) => [...prev, task]);
    setBasket((prev) => prev.filter((t) => t.id !== draggingId));
    setDraggingId(null);
  };

  const tasksByCategory = categories.map((_, ci) =>
    tasks.filter((t) => t.categoryIdx === ci)
  );

  return (
    <div className="atp-page">
      <Header workspaces={workspaces} />

      <div className="atp-topbar">
        <button className="atp-back-btn" onClick={() => navigate("/workspace")}>← 뒤로가기</button>
        {title && <span className="atp-project-title">{title}</span>}
        <button className="atp-reset-btn" onClick={handleReset} disabled={resetLoading}>
          {resetLoading ? "분석 중..." : "🔄 다시 설정"}
        </button>
        <div className="atp-save-wrap">
          <button className="atp-save-btn" onClick={handleSaveTask}>💾 task 저장</button>
          {saveMsg && <span className="atp-save-msg">{saveMsg}</span>}
        </div>
        <button className="atp-workspace-btn">워크스페이스로 이동 →</button>
      </div>

      <div className="atp-body">
        {/* 트리 영역 */}
        <div
          className="atp-tree"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleReturnDrop}
        >
          {/* 루트 */}
          <div className="atp-root-wrap">
            <div className="atp-root-node">
              <span className="atp-root-icon">⊛</span>
              <span>{title || "프로젝트"}</span>
            </div>
            <div className="atp-root-line" />
          </div>

          {/* 카테고리 */}
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
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onDragEnd={() => setDraggingId(null)}
                    >
                      <span className="atp-task-name">{task.name}</span>
                      <button
                        className="atp-subdivide-btn"
                        onClick={(e) => { e.stopPropagation(); handleSubDivide(task); }}
                        disabled={loadingId === task.id}
                      >
                        {loadingId === task.id ? "..." : "세부 분할"}
                      </button>
                    </div>
                  ))}
                  {tasksByCategory[ci].length === 0 && (
                    <div className="atp-empty-col">모두 배정됨</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 장바구니 */}
        <div className="atp-basket-bar">
          <div className="atp-basket-outer">
          <div className="atp-user-slot">
            {cooldown > 0 && <span className="atp-cooldown-msg">{cooldown}초 대기</span>}
            <div
              className={`atp-basket-box ${dragOver && cooldown === 0 ? "drag-over" : ""} ${cooldown > 0 ? "basket-locked" : ""}`}
              onDragOver={(e) => { e.preventDefault(); if (cooldown === 0) setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
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
                  onDragStart={() => handleReturnDragStart(task.id)}
                >
                  <span className="atp-basket-card-name">{task.name}</span>
                  <span className="atp-basket-card-tag">{categories[task.categoryIdx]?.name}</span>
                </div>
              ))}
            </div>
            <div className="atp-avatar">{userName[0]}</div>
            <span className="atp-user-name">{userName}</span>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
