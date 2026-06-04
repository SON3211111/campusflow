/**
 * AI 업무 분해 로딩 페이지
 * 프롬프트를 AI 서버(/api/ai/generate-tasks)에 전달하고 결과가 오면 AiTaskPage로 자동 이동
 * 분석 중 스피너를 보여주고, 에러 시 재시도 버튼 제공
 */
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import client from "../api/client";
import Header from "../components/Header";
import "./TaskBreakdownPage.css";

const THEMES = [
  {
    id: "space",
    icon: "🚀",
    trail: true,
    bg: "tbp-bg-space",
    messages: ["🚀 프롬프트를 분석하는 중...", "🌌 업무를 분류하는 중...", "⭐ 우선순위를 계산하는 중...", "🛸 태스크를 조립하는 중...", "✨ 거의 다 왔어요!"],
    sub: "보통 30~90초 정도 소요됩니다",
    particles: Array.from({ length: 30 }, (_, i) => ({
      key: i, className: "tbp-star",
      style: { left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*3}s`, width: `${Math.random()*2+1}px`, height: `${Math.random()*2+1}px` }
    })),
  },
  {
    id: "cat",
    icon: "🐱",
    trail: false,
    bg: "tbp-bg-cat",
    messages: ["🐱 냥냥... 분석 중이에요", "📝 꼬리로 태스크 정리 중...", "😺 우선순위 고르는 중...", "🐾 거의 다 됐어요!", "😸 완성 직전!"],
    sub: "고양이가 열심히 일하고 있어요 🐾",
    particles: Array.from({ length: 8 }, (_, i) => ({
      key: i, className: "tbp-paw",
      style: { left: `${10 + i * 12}%`, top: `${30 + (i % 3) * 20}%`, animationDelay: `${i * 0.4}s` }
    })),
  },
  {
    id: "ramen",
    icon: "🍜",
    trail: false,
    bg: "tbp-bg-ramen",
    messages: ["🍜 라면 물 끓이는 중...", "🥚 재료 분류하는 중...", "🌶️ 우선순위 양념 중...", "♨️ 거의 다 익었어요!", "🍽️ 완성 직전!"],
    sub: "배고프죠? 조금만 기다려요 😋",
    particles: Array.from({ length: 8 }, (_, i) => ({
      key: i, className: "tbp-steam",
      style: { left: `${40 + (i % 3) * 8}%`, animationDelay: `${i * 0.3}s` }
    })),
  },
  {
    id: "game",
    icon: "🎮",
    trail: false,
    bg: "tbp-bg-game",
    messages: ["🎮 게임 로딩 중...", "⚔️ 태스크 던전 탐험 중...", "🏆 보상 계산 중...", "🌟 레벨업 준비 중...", "🎯 미션 거의 완료!"],
    sub: "Loading... Please wait",
    particles: Array.from({ length: 6 }, (_, i) => ({
      key: i, className: "tbp-pixel",
      style: { left: `${5 + i * 16}%`, top: `${Math.random()*60+20}%`, animationDelay: `${i * 0.5}s` }
    })),
  },
];

function useProgress() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => Math.min(i + 1, 4)), 18000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setProgress((p) => p >= 92 ? p : p + (92 - p) * 0.03), 500);
    return () => clearInterval(t);
  }, []);
  return { msgIdx, progress };
}

function SpaceLoading() {
  const theme = useState(() => THEMES[Math.floor(Math.random() * THEMES.length)])[0];
  const { msgIdx, progress } = useProgress();

  return (
    <div className={`tbp-space-loading ${theme.bg}`}>
      <div className="tbp-particles">
        {theme.particles.map((p) => <div key={p.key} className={p.className} style={p.style} />)}
      </div>
      <div className="tbp-rocket-wrap">
        <div className="tbp-rocket">{theme.icon}</div>
        {theme.trail && <div className="tbp-rocket-trail" />}
      </div>
      <p className="tbp-space-msg">{theme.messages[Math.min(msgIdx, theme.messages.length - 1)]}</p>
      <div className="tbp-progress-wrap">
        <div className="tbp-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <p className="tbp-progress-pct">{Math.round(progress)}%</p>
      <p className="tbp-space-sub">{theme.sub}</p>
    </div>
  );
}

interface CategoryTaskItem {
  name: string;
  desc: string;
  priority: string;
}

interface Category {
  id: string;
  name: string;
  tasks: CategoryTaskItem[];
}

interface BreakdownResult {
  title: string;
  categories: Category[];
}

interface DraggedTask {
  categoryIdx: number;
  taskIdx: number;
  taskName: string;
}

interface AssignedTask {
  taskName: string;
  categoryName: string;
}

const CATEGORY_COLORS = [
  "#3a3a3a",
  "#a8c8f8",
  "#b8f0a0",
  "#e8b8f8",
  "#f8d8a0",
];

const TASK_COLORS = [
  "#5a2a2a",
  "#f8c8c8",
  "#6ab8f8",
  "#a8e8a0",
  "#d8a8f8",
];

function convertToBreakdownResult(data: any, prompt: string): BreakdownResult {
  const categoryMap = new Map<string, CategoryTaskItem[]>();
  (data.tasks ?? []).forEach((task: any) => {
    if (!categoryMap.has(task.category)) categoryMap.set(task.category, []);
    categoryMap.get(task.category)!.push({
      name: task.title ?? "",
      desc: task.description ?? "",
      priority: task.priority ?? "MEDIUM",
    });
  });
  return {
    title: prompt.slice(0, 30),
    categories: Array.from(categoryMap.entries()).map(([name, tasks], i) => ({
      id: `c${i + 1}`,
      name,
      tasks,
    })),
  };
}

export default function TaskBreakdownPage() {
  const { state } = useLocation() as {
    state: {
      prompt: string;
      workspaces: { id: string; name: string; gradient: string }[];
      workspace?: { id: string; name: string; gradient: string };
      append?: boolean;
    };
  };
  const navigate = useNavigate();

  const prompt     = state?.prompt     ?? "";
  const workspaces = state?.workspaces ?? [];
  const workspace  = state?.workspace;
  const append     = state?.append ?? false;

  const userName = localStorage.getItem("userName") ?? "나";

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [result, setResult]     = useState<BreakdownResult | null>(null);
  const [dragging, setDragging] = useState<DraggedTask | null>(null);
  const [assigned, setAssigned] = useState<AssignedTask[]>([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!prompt) { setLoading(false); return; }
    callAI();
  }, []);

  useEffect(() => {
    if (result) {
      navigate("/ai-task", { state: { workspaces, workspace, result, prompt, append } });
    }
  }, [result]);

  const callAI = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ description: prompt });
      const res = await client.post(`/ai/generate-tasks?${params}`, {}, { timeout: 120000 });
      setResult(convertToBreakdownResult(res.data.data, prompt));
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? err?.message ?? String(err);
      setError(`AI 오류: ${detail}`);
      console.error("[AI] error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (categoryIdx: number, taskIdx: number, taskName: string) => {
    setDragging({ categoryIdx, taskIdx, taskName });
  };

  const handleDrop = () => {
    if (!dragging || !result) return;
    const categoryName = result.categories[dragging.categoryIdx].name;
    setAssigned((prev) => [...prev, { taskName: dragging.taskName, categoryName }]);
    setDragging(null);
    setDragOver(false);
  };

  return (
    <div className="tbp-page">
      <Header workspaces={workspaces} />

      <div className="tbp-topbar">
        <button className="tbp-back-btn" onClick={() => navigate(-1)}>← 뒤로가기</button>
        {!loading && !error && result && (
          <button className="tbp-retry-btn" onClick={callAI}>다시 생성</button>
        )}
      </div>

      <div className="tbp-body">
        {loading && <SpaceLoading />}

        {error && (
          <div className="tbp-center">
            <p className="tbp-error">{error}</p>
            <button className="tbp-retry-btn" onClick={callAI}>다시 시도</button>
          </div>
        )}

        {!loading && !error && result && (
          <>
            <div className="tbp-tree">
              <div className="tbp-root-wrap">
                <div className="tbp-root-node">
                  <span className="tbp-root-icon">⊛</span>
                  <span className="tbp-root-title">{result.title}</span>
                </div>
                <div className="tbp-root-line" />
              </div>

              <div className="tbp-categories">
                {result.categories.map((cat, ci) => (
                  <div key={cat.id ?? ci} className="tbp-category-col">
                    <div
                      className="tbp-category-node"
                      style={{ background: CATEGORY_COLORS[ci % CATEGORY_COLORS.length] }}
                    >
                      {cat.name}
                    </div>
                    <div className="tbp-tasks">
                      {cat.tasks.map((task, ti) => (
                        <div
                          key={ti}
                          className="tbp-task-card"
                          style={{ background: TASK_COLORS[ci % TASK_COLORS.length] }}
                          draggable
                          onDragStart={() => handleDragStart(ci, ti, task.name)}
                        >
                          <span className="tbp-task-name">{task.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="tbp-users-bar">
              <div
                className={`tbp-user-slot ${dragOver ? "drag-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="tbp-user-avatar">{userName[0]}</div>
                <span className="tbp-user-name">{userName}</span>
                <div className="tbp-assigned-tasks">
                  {assigned.map((t, i) => (
                    <div key={i} className="tbp-assigned-card">{t.taskName}</div>
                  ))}
                  {assigned.length === 0 && (
                    <div className="tbp-drop-hint">여기에 드래그</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
