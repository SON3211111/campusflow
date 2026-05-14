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

interface Category {
  id: string;
  name: string;
  tasks: string[];
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
  const categoryMap = new Map<string, string[]>();
  (data.tasks ?? []).forEach((task: any) => {
    if (!categoryMap.has(task.category)) categoryMap.set(task.category, []);
    categoryMap.get(task.category)!.push(task.title);
  });
  return {
    title: prompt.slice(0, 15),
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
    };
  };
  const navigate = useNavigate();

  const prompt     = state?.prompt     ?? "";
  const workspaces = state?.workspaces ?? [];
  const workspace  = state?.workspace;

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
      navigate("/ai-task", { state: { workspaces, workspace, result, prompt } });
    }
  }, [result]);

  const callAI = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ title: prompt, description: prompt });
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
        {loading && (
          <div className="tbp-center">
            <div className="tbp-spinner" />
            <p className="tbp-loading-text">AI가 업무를 분석 중입니다...</p>
          </div>
        )}

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
                          onDragStart={() => handleDragStart(ci, ti, task)}
                        >
                          <span className="tbp-task-label">업무 시작 부탁</span>
                          <span className="tbp-task-name">{task}</span>
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
