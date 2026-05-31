import { useState, useEffect } from "react";
import client from "../api/client";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
import "./NotificationPage.css";
import "../WorkspacePages/WorkSpacePage.css";

interface Workspace {
  id: string;
  name: string;
  gradient: string;
}

type TabType = "task" | "mention" | "issue" | "quick";

const TABS: { key: TabType; label: string }[] = [
  { key: "task",    label: "Task 할당 알림" },
  { key: "mention", label: "멘션 알림" },
  { key: "issue",   label: "이슈 알림" },
  { key: "quick",   label: "퀵 시그널 알림" },
];

const DUMMY: Record<TabType, { id: number; icon: string; title: string; desc: string; time: string; unread: boolean }[]> = {
  task: [
    { id: 1, icon: "📋", title: "Task 할당", desc: "홍길동님이 '로그인 API 연동' 태스크를 나에게 할당했습니다.", time: "5분 전", unread: true },
    { id: 2, icon: "📋", title: "Task 할당", desc: "김철수님이 '회원가입 UI 수정' 태스크를 나에게 할당했습니다.", time: "1시간 전", unread: true },
    { id: 3, icon: "📋", title: "Task 완료 요청", desc: "이영희님이 '대시보드 차트' 태스크의 검토를 요청했습니다.", time: "어제", unread: false },
  ],
  mention: [
    { id: 1, icon: "💬", title: "멘션", desc: "홍길동님이 댓글에서 나를 멘션했습니다: '@나 이 부분 확인 부탁드려요'", time: "10분 전", unread: true },
    { id: 2, icon: "💬", title: "멘션", desc: "박지수님이 '프론트 구조' 카드에서 나를 멘션했습니다.", time: "3시간 전", unread: false },
  ],
  issue: [
    { id: 1, icon: "⚠️", title: "이슈 발생", desc: "'백엔드 배포 실패' 이슈가 생성되었습니다.", time: "30분 전", unread: true },
    { id: 2, icon: "⚠️", title: "이슈 업데이트", desc: "'DB 연결 오류' 이슈가 '해결됨' 상태로 변경되었습니다.", time: "2시간 전", unread: false },
    { id: 3, icon: "⚠️", title: "이슈 할당", desc: "홍길동님이 '성능 최적화 필요' 이슈를 나에게 할당했습니다.", time: "어제", unread: false },
  ],
  quick: [
    { id: 1, icon: "⚡", title: "퀵 시그널", desc: "홍길동님이 긴급 시그널을 보냈습니다: '지금 바로 확인 필요!'", time: "방금 전", unread: true },
    { id: 2, icon: "⚡", title: "퀵 시그널", desc: "김철수님이 퀵 시그널을 보냈습니다: '오늘 오후 미팅 확인해주세요'", time: "1시간 전", unread: false },
  ],
};

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS_KO = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const TODAY = new Date();

export default function NotificationPage() {
  const { state } = useLocation() as {
    state: { workspace?: Workspace; workspaces?: Workspace[] };
  };
  const navigate = useNavigate();

  const savedWs    = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
  const workspace  = state?.workspace ?? state?.workspaces?.[0] ?? savedWs;
  const workspaces = state?.workspaces ?? [];
  const wsName     = workspace?.name ?? "워크스페이스";

  const [activeTab, setActiveTab] = useState<TabType>("task");
  const [wtbTab, setWtbTab] = useState<"board" | "planner" | "community" | "personal">("board");
  const [showPlanner, setShowPlanner] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);

  const [calYear, setCalYear] = useState(TODAY.getFullYear());
  const [calMonth, setCalMonth] = useState(TODAY.getMonth());
  const [messages, setMessages] = useState<{ user: string; text: string; time: string }[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [writingMsg, setWritingMsg] = useState(false);
  const [upcomingTasks, setUpcomingTasks] = useState<{ taskId: string; title: string; dueDate: string; daysLeft: number; color: string }[]>([]);
  const [plannerDotMap, setPlannerDotMap] = useState<Record<string, string[]>>({});
  const userName = localStorage.getItem("userName") ?? "나";

  const STATUS_COLOR_NOTI: Record<string,string> = { TODO:"#aaa", REVIEW:"#888", DOING:"#4f7cff", ISSUE:"#f59e0b", DONE:"#22c55e" };

  useEffect(() => {
    if (!workspace?.id) return;
    client.get(`/workspaces/${workspace.id}/tasks`).then(res => {
      const tasks: { taskId: string; title: string; status: string; dueDate?: string }[] = res.data.data ?? [];
      const now = new Date(); now.setHours(0,0,0,0);
      const upcoming = tasks.filter(t => {
        if (!t.dueDate || t.status === "DONE") return false;
        const d = new Date(t.dueDate); d.setHours(0,0,0,0);
        const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
        return diff >= 0 && diff <= 5;
      }).map(t => {
        const d = new Date(t.dueDate!); d.setHours(0,0,0,0);
        return { taskId: t.taskId, title: t.title, dueDate: t.dueDate!, daysLeft: Math.ceil((d.getTime() - now.getTime()) / 86400000), color: STATUS_COLOR_NOTI[t.status] ?? "#aaa" };
      }).sort((a,b) => a.daysLeft - b.daysLeft);
      setUpcomingTasks(upcoming);

      const dotMap: Record<string, string[]> = {};
      for (const t of tasks) {
        if (!t.dueDate) continue;
        const ds = t.dueDate.slice(0, 10);
        if (!dotMap[ds]) dotMap[ds] = [];
        if (dotMap[ds].length < 3) dotMap[ds].push(STATUS_COLOR_NOTI[t.status] ?? "#aaa");
      }
      setPlannerDotMap(dotMap);
    }).catch(() => {});
  }, [workspace?.id]);

  const handleSendMsg = () => {
    if (!msgInput.trim()) return;
    setMessages(p => [...p, { user: userName, text: msgInput.trim(), time: "방금" }]);
    setMsgInput(""); setWritingMsg(false);
  };

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calDays = [...Array(firstDay).fill(0), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const items = DUMMY[activeTab];
  const unreadCount = items.filter((n) => n.unread).length;

  return (
    <div className="noti-page">
      <Header workspaces={workspaces} />
      <BoardSubHeader
        wsName={wsName}
        workspace={workspace}
        workspaces={workspaces}
        initialSelected="Notification"
      />

      <div className="wsp-body" style={{ background: workspace?.gradient ?? "#f0f2f8" }}>

        {/* 커뮤니티 패널 */}
        <aside className={`wsp-community ${showCommunity ? "panel-visible" : "panel-hidden"}`}>
          <div className="wsp-panel-title"><span className="wsp-panel-icon">💬</span> community</div>
          <input className="wsp-search" placeholder="채널 및 메시지 검색..." />
          <div className="wsp-channel-label">채널 및 스레드</div>
          <div className="wsp-channel-item"># 일반</div>
          <div className="wsp-channel-item"># UI/UX 디자인</div>
          <div className="wsp-channel-item"># 개발 및 연동<span className="wsp-channel-dot" /></div>
          <div className="wsp-channel-label" style={{ marginTop: 16 }}>최근 메시지</div>
          <div className="wsp-msg-list">
            {messages.length === 0
              ? <div className="wsp-msg-empty">메시지가 없습니다.</div>
              : messages.map((m, i) => (
                <div key={i} className="wsp-msg-item">
                  <div className="wsp-msg-header"><span className="wsp-msg-name">{m.user}</span><span className="wsp-msg-time">{m.time}</span></div>
                  <div className="wsp-msg-text">{m.text}</div>
                </div>
              ))
            }
          </div>
          {writingMsg ? (
            <div className="wsp-msg-form">
              <textarea className="wsp-msg-input" placeholder="메시지 입력..." value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMsg(); } }}
                autoFocus />
              <div className="wsp-msg-actions">
                <button className="wsp-msg-send" onClick={handleSendMsg}>전송</button>
                <button className="wsp-msg-cancel" onClick={() => { setWritingMsg(false); setMsgInput(""); }}>취소</button>
              </div>
            </div>
          ) : (
            <button className="wsp-new-msg-btn" onClick={() => setWritingMsg(true)}>새 메시지 작성</button>
          )}
        </aside>

        {/* 플래너 패널 */}
        <aside className={`wsp-planner ${showPlanner ? "panel-visible" : "panel-hidden"}`}>
          <div className="wsp-panel-title"><span className="wsp-panel-icon">📅</span> Planner</div>
          <div className="wsp-cal-header">
            <button className="wsp-cal-nav" onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}>‹</button>
            <span className="wsp-cal-title">{calYear}년 {calMonth + 1}월</span>
            <button className="wsp-cal-nav" onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}>›</button>
          </div>
          <div className="wsp-cal-grid">
            {DAYS.map((d) => (
              <div key={d} className={`wsp-cal-day-label ${d === "일" ? "sun" : d === "토" ? "sat" : ""}`}>{d}</div>
            ))}
            {calDays.map((d, i) => {
              const isToday = d === TODAY.getDate() && calMonth === TODAY.getMonth() && calYear === TODAY.getFullYear();
              const ds = d ? `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}` : "";
              const dots = ds ? (plannerDotMap[ds] ?? []) : [];
              return (
                <div key={i} className={`wsp-cal-day ${!d ? "empty" : ""} ${isToday ? "today" : ""}`}>
                  {d || ""}
                  {dots.length > 0 && (
                    <div className="planner-dots">
                      {dots.map((c, j) => <span key={j} className="planner-dot" style={{ background: c }} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="wsp-upcoming-label">
            다가오는 마감일
            {upcomingTasks.length > 0 && <span className="wsp-upcoming-count">({upcomingTasks.length})</span>}
          </div>
          {upcomingTasks.length === 0
            ? <div className="wsp-upcoming-empty">마감일이 없습니다.</div>
            : upcomingTasks.map(t => (
              <div key={t.taskId} className="wsp-upcoming-item" style={{ borderLeftColor: t.color }}>
                <div className="wsp-upcoming-info">
                  <span className="wsp-upcoming-name">{t.title}</span>
                  <span className="wsp-upcoming-date">⊙ {MONTHS_KO[new Date(t.dueDate).getMonth()]} {new Date(t.dueDate).getDate()}일 · {t.daysLeft === 0 ? "오늘" : `${t.daysLeft}일 남음`}</span>
                </div>
              </div>
            ))
          }
        </aside>

        {/* 알림 본문 */}
        <div className="noti-card" style={{ flex: 1, overflowY: "auto", margin: "20px", borderRadius: "16px" }}>
          <div className="noti-card-header">
            <h3 className="noti-card-title">알림</h3>
            {unreadCount > 0 && (
              <span className="noti-unread-badge">{unreadCount}개의 새 알림</span>
            )}
          </div>

          <div className="noti-tabs">
            {TABS.map((tab) => {
              const cnt = DUMMY[tab.key].filter((n) => n.unread).length;
              return (
                <button
                  key={tab.key}
                  className={`noti-tab ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {cnt > 0 && <span className="noti-tab-dot">{cnt}</span>}
                </button>
              );
            })}
          </div>

          <div className="noti-list">
            {items.length === 0 ? (
              <div className="noti-empty">알림이 없습니다.</div>
            ) : (
              items.map((item) => (
                <div key={item.id} className={`noti-item ${item.unread ? "unread" : ""}`}>
                  <div className="noti-item-icon">{item.icon}</div>
                  <div className="noti-item-body">
                    <div className="noti-item-title">{item.title}</div>
                    <div className="noti-item-desc">{item.desc}</div>
                    <div className="noti-item-time">{item.time}</div>
                  </div>
                  {item.unread && <div className="noti-item-dot" />}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <WorkspaceTabBar
        active={wtbTab}
        onTabChange={(t) => {
          setWtbTab(t);
          if (t === "planner")   setShowPlanner((v) => !v);
          if (t === "community") setShowCommunity((v) => !v);
          if (t === "board")     navigate("/workspace-board", { state: { workspace, workspaces } });
        }}
      />
    </div>
  );
}
