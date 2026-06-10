/**
 * AI Task 모달 컴포넌트
 * - 새 프롬프트 작성: 새 세션 시작
 * - 진행 중인 업무 이어하기: 기존 세션 복원 (DB 기준)
 * - 큰 작업 추가: 기존 세션에 새 분해 결과를 누적
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, FileText, Plus, Rocket, Sparkles } from "lucide-react";
import { setAppendBuffer } from "../store/aiTaskBuffer";
import client from "../api/client";
import "./AITaskModal.css";

type Screen = "home" | "new-prompt" | "append-prompt";

interface WsItem { id: string; name: string; gradient: string; }

interface Props {
  onClose: () => void;
  workspaces?: WsItem[];
  workspace?: WsItem;
}

const DOMAIN_OPTIONS = [
  { value: "",                 label: "AI가 자동 판단" },
  { value: "software_dev",    label: "소프트웨어 개발" },
  { value: "academic_report", label: "팀 레포트 / 논문" },
  { value: "presentation",    label: "발표 과제" },
  { value: "design_ux",       label: "UI/UX 디자인" },
  { value: "engineering",     label: "공학 설계·제작" },
  { value: "marketing_biz",   label: "마케팅 / 비즈니스" },
  { value: "event_planning",  label: "행사 / 이벤트 기획" },
  { value: "research_science",label: "실험 / 데이터 분석" },
];

export default function AITaskModal({ onClose, workspaces = [], workspace }: Props) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("home");
  const [prompt, setPrompt]       = useState("");
  const [domain, setDomain]       = useState("");
  const [teamSize, setTeamSize]   = useState("");
  const [deadline, setDeadline]   = useState("");
  const [hasSession, setHasSession] = useState(false);

  const activeWs = workspace ?? workspaces[0];

  // DB에서 진행 중인 세션 여부 확인
  useEffect(() => {
    if (!activeWs?.id) return;
    client.get(`/workspaces/${activeWs.id}/ai-session`)
      .then((res) => {
        setHasSession(res.data?.data?.exists === true);
      })
      .catch(() => {
        // API 실패 시 localStorage 폴백
        const key = `ai_task_session_${activeWs.id}`;
        try {
          const saved = JSON.parse(localStorage.getItem(key) ?? "null");
          const hasData = saved && (
            (saved.result?.categories?.some((c: { tasks?: unknown[] }) => (c.tasks?.length ?? 0) > 0)) ||
            Object.values(saved.memberBaskets ?? {}).some((b) => Array.isArray(b) && b.length > 0)
          );
          setHasSession(!!hasData);
        } catch {
          setHasSession(false);
        }
      });
  }, [activeWs?.id]);

  const buildStructuredPrompt = () => {
    const parts = [prompt.trim()];
    if (teamSize) parts.push(`팀 인원: ${teamSize}명`);
    if (deadline) parts.push(`마감: ${deadline}`);
    return parts.join(" / ");
  };

  const handleNewBreakdown = () => {
    if (!prompt.trim()) return;
    onClose();
    navigate("/task-breakdown", {
      state: {
        prompt: buildStructuredPrompt(),
        domain: domain || undefined,
        teamSize: teamSize ? parseInt(teamSize) : undefined,
        deadline: deadline || undefined,
        workspaces,
        workspace: activeWs,
      },
    });
  };

  const handleAppendBreakdown = async () => {
    if (!prompt.trim()) return;
    // DB에서 세션 데이터를 가져와 append 버퍼 구성
    try {
      const res = await client.get(`/workspaces/${activeWs!.id}/ai-session`);
      const sessionData = res.data?.data?.sessionData;
      if (sessionData) {
        const saved = JSON.parse(sessionData);
        setAppendBuffer({
          categories: saved.categories ?? [],
          tasks: saved.tasks ?? [],
          memberBaskets: saved.memberBaskets ?? {},
          sessions: saved.sessions ?? [],
          newSessionPrompt: buildStructuredPrompt(),
        });
      }
    } catch {
      // DB 실패 시 localStorage 폴백
      try {
        const key = `ai_task_session_${activeWs?.id ?? "default"}`;
        const saved = JSON.parse(localStorage.getItem(key) ?? "null");
        if (saved) {
          setAppendBuffer({
            categories: saved.categories ?? [],
            tasks: saved.tasks ?? [],
            memberBaskets: saved.memberBaskets ?? {},
            sessions: saved.sessions ?? [],
            newSessionPrompt: buildStructuredPrompt(),
          });
        }
      } catch {
        console.error("append 버퍼 구성 실패");
      }
    }
    onClose();
    navigate("/task-breakdown", {
      state: {
        prompt: buildStructuredPrompt(),
        domain: domain || undefined,
        teamSize: teamSize ? parseInt(teamSize) : undefined,
        deadline: deadline || undefined,
        workspaces,
        workspace: activeWs,
        append: true,
      },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ai-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="ai-modal-close" onClick={onClose}>✕</button>

        {screen === "home" && (
          <>
            <h3 className="ai-modal-title">AI 업무 분해</h3>
            <div className="ai-modal-options">
              {hasSession && (
                <div className="ai-option-card" onClick={() => {
                  onClose();
                  navigate("/ai-task", { state: { workspace: activeWs, workspaces } });
                }}>
                  <div className="ai-option-icon purple">▶</div>
                  <div className="ai-option-info">
                    <span className="ai-option-name">진행 중인 업무 이어하기</span>
                    <span className="ai-option-desc">기존 Pool에서 계속 작업합니다</span>
                  </div>
                </div>
              )}

              {hasSession && (
                <div className="ai-option-card" onClick={() => setScreen("append-prompt")}>
                  <div className="ai-option-icon green"><Plus size={20} /></div>
                  <div className="ai-option-info">
                    <span className="ai-option-name">작업 추가하기</span>
                    <span className="ai-option-desc">새 업무를 분해해서 기존 Pool에 추가합니다</span>
                  </div>
                </div>
              )}

              <div className="ai-option-card" onClick={() => setScreen("new-prompt")}>
                <div className="ai-option-icon blue"><FileText size={20} /></div>
                <div className="ai-option-info">
                  <span className="ai-option-name">새로 시작</span>
                  <span className="ai-option-desc">새 프롬프트로 처음부터 분해합니다</span>
                </div>
              </div>

              <div className="ai-option-card" onClick={() => {
                onClose();
                navigate("/workspace-board", { state: { workspace: activeWs, workspaces } });
              }}>
                <div className="ai-option-icon orange"><Rocket size={20} /></div>
                <div className="ai-option-info">
                  <span className="ai-option-name">보드로 이동</span>
                  <span className="ai-option-desc">워크스페이스 보드로 바로 이동합니다</span>
                </div>
              </div>
            </div>
          </>
        )}

        {(screen === "new-prompt" || screen === "append-prompt") && (
          <>
            <h3 className="ai-modal-title">
              {screen === "new-prompt" ? "새로 시작" : "작업 추가하기"}
            </h3>

            <label className="ai-prompt-label">과제 / 프로젝트 내용 <span className="ai-required">*</span></label>
            <textarea
              className="ai-prompt-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={"예: 경영학원론 팀 레포트 — MZ세대 소비 트렌드 분析\n예: React + Spring Boot 쇼핑몰 웹사이트 제작\n예: 캡스톤디자인 — AI 일정 관리 앱 개발"}
              autoFocus
              rows={3}
            />

            <div className="ai-form-row">
              <div className="ai-form-field">
                <label className="ai-prompt-label">과제 유형</label>
                <select
                  className="ai-select"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                >
                  {DOMAIN_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="ai-form-field ai-form-field--sm">
                <label className="ai-prompt-label">팀 인원</label>
                <input
                  className="ai-input"
                  type="number"
                  min={1} max={20}
                  placeholder="4"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                />
              </div>
              <div className="ai-form-field">
                <label className="ai-prompt-label">마감</label>
                <input
                  className="ai-input"
                  type="text"
                  placeholder="2주 후 / 6월 30일"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>

            <button
              className="ai-generate-btn"
              disabled={!prompt.trim()}
              onClick={screen === "new-prompt" ? handleNewBreakdown : handleAppendBreakdown}
            >
              {screen === "new-prompt" ? <Bot size={17} /> : <Sparkles size={17} />}
              {screen === "new-prompt" ? "AI로 업무 분해하기" : "기존 Pool에 추가 분해하기"}
            </button>
            <button className="ai-modal-back" onClick={() => setScreen("home")}>← 뒤로</button>
          </>
        )}
      </div>
    </div>
  );
}
