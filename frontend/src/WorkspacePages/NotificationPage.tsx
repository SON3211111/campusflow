import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Calendar, AlertTriangle, HelpCircle, MessageCircle, AtSign, CheckCheck, Inbox, TrendingDown, Clock, BarChart2, GitBranch, Zap, ArrowRight } from "lucide-react";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
import client from "../api/client";
import WorkspacePlannerPanel from "../components/WorkspacePlannerPanel";
import WorkspaceCommunityPanel from "../components/WorkspaceCommunityPanel";
import WorkspaceSwitcherPopover from "../components/WorkspaceSwitcherPopover";
import { createWorkspaceThemeStyle, withStoredGradient, withStoredGradients } from "../utils/workspaceTheme";
import "../WorkspacePages/WorkSpacePage.css";
import "./NotificationPage.css";

interface Workspace { id: string; name: string; gradient: string; }

interface Noti {
  notificationId: string;
  message: string;
  type: string;
  taskId?: string;
  read: boolean;
  createdAt?: string;
}

type QuickSignal = "HELP_NEEDED" | "FEEDBACK_NEEDED";

interface AffectedTask {
  taskId: string;
  title: string;
  dueDate?: string;
  status: string;
  assigneeName?: string;
  estimatedDelayDays?: number;
  depth?: number;  // 병목으로부터의 거리 (1=직접, 2+=간접)
}

interface BottleneckItem {
  taskId: string;
  title: string;
  status: string;
  daysStuck: number;
  delayDays: number;
  assigneeName?: string;
  dueDate?: string;
  affectedTaskCount: number;
  affectedTasks: AffectedTask[];
}

interface BottleneckReport {
  bottlenecks: BottleneckItem[];
  totalDelayDays: number;
  projectDeadline?: string;
  estimatedNewDeadline?: string;
}

interface AllTask {
  taskId: string;
  title: string;
  status: string;
  startDate?: string;
  dueDate?: string;
  assigneeName?: string;
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function getNotificationTypeLabel(n: Noti) {
  if (n.type === "QUICK_SIGNAL" || n.type === "QUICK_SIGNAL_SENT") {
    return n.message.includes("피드백") ? "피드백 요청" : "도움 요청";
  }
  return TYPE_LABEL[n.type] ?? "알림";
}

function getNotificationTypeClass(n: Noti) {
  if (n.type !== "QUICK_SIGNAL" && n.type !== "QUICK_SIGNAL_SENT") return "";
  return n.message.includes("피드백") ? "ntp-item-type--feedback" : "ntp-item-type--help";
}

function getNotificationSignal(n: Noti): QuickSignal | null {
  if (n.type !== "QUICK_SIGNAL" && n.type !== "QUICK_SIGNAL_SENT") return null;
  return n.message.includes("피드백") ? "FEEDBACK_NEEDED" : "HELP_NEEDED";
}

function formatNotificationMessage(n: Noti) {
  if (n.type !== "QUICK_SIGNAL" && n.type !== "QUICK_SIGNAL_SENT") return n.message;
  return n.message.replace(/(?:\s*(?:🆘|SOS))+$/gi, "");
}

const TYPE_LABEL: Record<string, string> = {
  STATUS_CHANGE:     "상태 변경",
  DUE_DATE:          "마감 임박",
  BOTTLENECK:        "병목 감지",
  QUICK_SIGNAL:      "도움 요청",
  QUICK_SIGNAL_SENT: "보낸 요청",
  COMMENT:           "댓글",
  MENTION:           "멘션",
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  STATUS_CHANGE:     <Bell size={20} color="#4f7cff" />,
  DUE_DATE:          <Calendar size={20} color="#f97316" />,
  BOTTLENECK:        <AlertTriangle size={20} color="#ef4444" />,
  QUICK_SIGNAL:      <HelpCircle size={20} color="#dc2626" />,
  QUICK_SIGNAL_SENT: <HelpCircle size={20} color="#94a3b8" />,
  COMMENT:           <MessageCircle size={20} color="#22c55e" />,
  MENTION:           <AtSign size={20} color="#a855f7" />,
};

const FILTERS = [
  { key: "ALL",        label: "전체" },
  { key: "UNREAD",     label: "미읽음" },
  { key: "BOTTLENECK", label: "병목 리포트" },
  { key: "TASK",       label: "업무",  types: ["STATUS_CHANGE", "DUE_DATE", "BOTTLENECK"] },
  { key: "REQUEST",    label: "요청",  types: ["QUICK_SIGNAL", "QUICK_SIGNAL_SENT", "COMMENT", "MENTION"] },
];

export default function NotificationPage() {
  const { state } = useLocation() as { state: { workspace?: Workspace; workspaces?: Workspace[] } };
  const navigate = useNavigate();
  const savedWs = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
  const rawWorkspace = state?.workspace ?? savedWs;
  const workspace = rawWorkspace ? withStoredGradient(rawWorkspace) : undefined;
  const workspaces = withStoredGradients(state?.workspaces ?? []);
  const themeStyle = createWorkspaceThemeStyle(workspace?.gradient);
  const wsName = workspace?.name ?? "워크스페이스";
  const userId = localStorage.getItem("userId") ?? "";

  const [notis, setNotis]       = useState<Noti[]>([]);
  const [loading, setLoading]   = useState(true);
  const [report, setReport]     = useState<BottleneckReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [allTasks, setAllTasks] = useState<AllTask[]>([]);
  const [taskSignals, setTaskSignals] = useState<Record<string, string>>({});
  const [taskSignalsLoaded, setTaskSignalsLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPlanner,   setShowPlanner]   = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showWorkspacePanel, setShowWorkspacePanel] = useState(false);
  const [filter, setFilter] = useState("ALL");

  const VALID_TYPES = ["STATUS_CHANGE", "DUE_DATE", "BOTTLENECK", "QUICK_SIGNAL", "QUICK_SIGNAL_SENT", "COMMENT", "MENTION"];

  const fetchNotis = async () => {
    if (!userId) return;
    try {
      const wsParam = workspace?.id ? `&workspaceId=${workspace.id}` : "";
      const res = await client.get(`/notifications?userId=${userId}${wsParam}`);
      const all: Noti[] = res.data.data ?? [];
      setNotis(all.filter((n) => VALID_TYPES.includes(n.type)));
    } catch (err) {
      console.error("알림 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    if (!workspace?.id) return;
    setReportLoading(true);
    try {
      const res = await client.get(`/workspaces/${workspace.id}/tasks/bottleneck-report?days=3`);
      setReport(res.data.data);
    } catch (err) {
      console.error("병목 리포트 조회 실패:", err);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchTaskSignals = async () => {
    if (!workspace?.id) return;
    setTaskSignalsLoaded(false);
    try {
      const res = await client.get(`/workspaces/${workspace.id}/tasks`);
      const data: any[] = res.data.data ?? [];
      const next: Record<string, string> = {};
      for (const task of data) {
        if (task.taskId) next[task.taskId] = task.quickSignal ?? "";
      }
      setTaskSignals(next);
      setTaskSignalsLoaded(true);
      setAllTasks(data.map((t) => ({
        taskId: t.taskId,
        title: t.title,
        status: t.status,
        startDate: t.startDate,
        dueDate: t.dueDate,
        assigneeName: t.assigneeName,
      })));
    } catch (err) {
      console.error("태스크 요청 상태 조회 실패:", err);
      setTaskSignals({});
      setTaskSignalsLoaded(false);
    }
  };

  const isRequestResolved = (n: Noti) => {
    const expectedSignal = getNotificationSignal(n);
    if (!taskSignalsLoaded || !expectedSignal || !n.taskId) return false;
    return taskSignals[n.taskId] !== expectedSignal;
  };

  const unreadCount = notis.filter((n) => !n.read).length;
  const dueDateCount    = notis.filter((n) => n.type === "DUE_DATE").length;
  const requestCount    = notis.filter((n) => ["QUICK_SIGNAL", "QUICK_SIGNAL_SENT"].includes(n.type) && !isRequestResolved(n)).length;

  useEffect(() => { fetchNotis(); }, [userId, workspace?.id]);
  useEffect(() => { fetchTaskSignals(); }, [workspace?.id]);
  useEffect(() => { fetchReport(); }, [workspace?.id]);

  const handleRead = async (notificationId: string) => {
    try {
      await client.post(`/notifications/${notificationId}/read`);
      setNotis((prev) => prev.map((n) => n.notificationId === notificationId ? { ...n, read: true } : n));
    } catch (err) {
      console.error("읽음 처리 실패:", err);
    }
  };

  const handleClickNoti = async (n: Noti) => {
    if (!n.read) {
      await client.post(`/notifications/${n.notificationId}/read`).catch(() => {});
      setNotis((prev) => prev.map((x) => x.notificationId === n.notificationId ? { ...x, read: true } : x));
    }
    if (n.taskId && workspace) {
      navigate("/workspace-board", { state: { workspace, workspaces, highlightTaskId: n.taskId } });
    }
  };

  const handleReadAll = async () => {
    await Promise.all(notis.filter((n) => !n.read).map((n) => client.post(`/notifications/${n.notificationId}/read`).catch(() => {})));
    setNotis((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const activeFilter = FILTERS.find((item) => item.key === filter);
  const filteredNotis = notis.filter((noti) => {
    if (activeFilter?.key === "UNREAD")      return !noti.read;
    if (activeFilter?.key === "BOTTLENECK")  return false; // 리포트 탭엔 알림 대신 리포트 렌더
    if (activeFilter?.types) return activeFilter.types.includes(noti.type);
    return true;
  }).sort((a, b) => {
    if (activeFilter?.key !== "REQUEST") return 0;
    return Number(isRequestResolved(a)) - Number(isRequestResolved(b));
  });

  const renderProjectImpact = () => {
    if (!report || allTasks.length === 0) return null;
    const total = allTasks.length;
    const done  = allTasks.filter((t) => t.status === "DONE").length;
    const stuck = allTasks.filter((t) => ["DOING", "ISSUE"].includes(t.status)).length;
    const affectedIds = new Set(report.bottlenecks.flatMap((b) => b.affectedTasks.map((a) => a.taskId)));
    const donePct = total === 0 ? 0 : Math.round((done / total) * 100);
    return (
      <div className="ntp-impact-summary">
        <div className="ntp-impact-title">전체 프로젝트 영향 현황</div>
        <div className="ntp-impact-stats">
          <div className="ntp-impact-stat"><strong>{total}</strong><span>전체</span></div>
          <div className="ntp-impact-stat"><strong className="stat-done">{done}</strong><span>완료</span></div>
          <div className="ntp-impact-stat"><strong className="stat-doing">{stuck}</strong><span>진행중</span></div>
          <div className="ntp-impact-stat"><strong className="stat-bottleneck">{report.bottlenecks.length}</strong><span>병목</span></div>
          <div className="ntp-impact-stat"><strong className="stat-affected">{affectedIds.size}</strong><span>지연 영향</span></div>
          {report.totalDelayDays > 0 && (
            <div className="ntp-impact-stat"><strong className="stat-delay">+{report.totalDelayDays}일</strong><span>최대 지연</span></div>
          )}
        </div>
        <div className="ntp-impact-progress">
          <div className="ntp-impact-progress-label"><span>전체 진행률</span><span>{donePct}%</span></div>
          <div className="ntp-impact-progress-bar">
            <div className="ntp-impact-progress-fill" style={{ width: `${donePct}%` }} />
            {report.bottlenecks.length > 0 && total > 0 && (
              <div className="ntp-impact-progress-risk" style={{ width: `${Math.min(30, Math.round((affectedIds.size / total) * 100))}%` }} />
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGanttChart = () => {
    if (!report) return null;
    const ganttTasks = allTasks.filter((t) => t.startDate || t.dueDate);
    if (ganttTasks.length === 0) return (
      <div className="ntp-gantt-empty">날짜가 설정된 업무가 없어 간트 차트를 표시할 수 없습니다.</div>
    );

    const bottleneckMap = new Map<string, number>();
    const affectedMap   = new Map<string, number>();
    for (const b of report.bottlenecks) {
      bottleneckMap.set(b.taskId, b.delayDays);
      for (const a of b.affectedTasks) {
        affectedMap.set(a.taskId, Math.max(affectedMap.get(a.taskId) ?? 0, a.estimatedDelayDays ?? 0));
      }
    }

    const MS = 86400000;
    const allMs: number[] = [Date.now()];
    for (const t of ganttTasks) {
      if (t.startDate) allMs.push(new Date(t.startDate).getTime());
      if (t.dueDate)   allMs.push(new Date(t.dueDate).getTime());
    }
    const minMs = Math.min(...allMs) - MS;
    const rawMax = Math.max(...allMs) + (report.totalDelayDays + 5) * MS;
    const totalDays = Math.max(14, (rawMax - minMs) / MS);
    const maxMs = minMs + totalDays * MS;

    const pct = (ms: number) =>
      Math.max(0, Math.min(100, ((ms - minMs) / (totalDays * MS)) * 100));

    const todayPct = pct(Date.now());
    const interval = Math.max(1, Math.ceil(totalDays / 8));
    const markers: Date[] = [];
    const cur = new Date(minMs); cur.setHours(0, 0, 0, 0);
    while (cur.getTime() <= maxMs) { markers.push(new Date(cur)); cur.setDate(cur.getDate() + interval); }

    const orderOf = (t: AllTask) => {
      if (bottleneckMap.has(t.taskId)) return 0;
      if (affectedMap.has(t.taskId))   return 1;
      if (["DOING", "ISSUE"].includes(t.status)) return 2;
      if (t.status === "DONE") return 4;
      return 3;
    };
    const sorted = [...ganttTasks].sort((a, b) => orderOf(a) - orderOf(b));
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

    const NAME_COL_PX = 200;
    const todayCalc = `calc(${NAME_COL_PX}px + ${(todayPct / 100).toFixed(4)} * (100% - ${NAME_COL_PX}px))`;

    return (
      <div className="ntp-gantt">
        <div className="ntp-gantt-heading">
          <BarChart2 size={14} /> 프로젝트 간트 차트
          <span className="ntp-gantt-legend">
            <i className="ntp-gantt-dot dot-bottleneck" />병목
            <i className="ntp-gantt-dot dot-affected" />지연영향
            <i className="ntp-gantt-dot dot-normal" />진행중
            <i className="ntp-gantt-dot dot-done" />완료
          </span>
        </div>
        <div className="ntp-gantt-scroll">
          <div className="ntp-gantt-inner">
            {/* 날짜 눈금 */}
            <div className="ntp-gantt-ruler">
              <div className="ntp-gantt-name-col"><span className="ntp-gantt-ruler-label">업무</span></div>
              <div className="ntp-gantt-track-area">
                {markers.map((d) => (
                  <span key={d.toISOString()} className="ntp-gantt-tick" style={{ left: `${pct(d.getTime())}%` }}>
                    {fmt(d)}
                  </span>
                ))}
                <span className="ntp-gantt-today-tick" style={{ left: `${todayPct}%` }}>오늘</span>
              </div>
            </div>
            {/* 태스크 행들 */}
            <div className="ntp-gantt-body">
              {/* 수직 그리드 라인 */}
              {markers.map((d) => (
                <div
                  key={`gl-${d.toISOString()}`}
                  className="ntp-gantt-grid-line"
                  style={{ left: `calc(${NAME_COL_PX}px + ${(pct(d.getTime()) / 100).toFixed(4)} * (100% - ${NAME_COL_PX}px))` }}
                />
              ))}
              {/* 오늘 기준선 */}
              <div className="ntp-gantt-today-line" style={{ left: todayCalc }} />
              {sorted.map((task, idx) => {
                const startMs = task.startDate
                  ? new Date(task.startDate).getTime()
                  : task.dueDate ? new Date(task.dueDate).getTime() : null;
                const endMs = task.dueDate
                  ? new Date(task.dueDate).getTime()
                  : startMs;
                if (!startMs || !endMs) return null;

                const left  = pct(startMs);
                const right = pct(endMs);
                const width = Math.max(2, right - left);
                const delayDays = bottleneckMap.get(task.taskId) ?? affectedMap.get(task.taskId) ?? 0;
                const isBottleneck = bottleneckMap.has(task.taskId);
                const isAffected   = affectedMap.has(task.taskId);
                const isDone       = task.status === "DONE";

                const barCls = `ntp-gantt-bar ${isDone ? "bar-done" : isBottleneck ? "bar-bottleneck" : isAffected ? "bar-affected" : "bar-normal"}`;
                const dotCls = isDone ? "dot-done" : isBottleneck ? "dot-bottleneck" : isAffected ? "dot-affected" : "dot-normal";

                return (
                  <div key={task.taskId} className={`ntp-gantt-row${idx % 2 === 1 ? " row-stripe" : ""}${isBottleneck ? " row-bottleneck" : isAffected ? " row-affected" : ""}`}>
                    <div className="ntp-gantt-name-col">
                      <i className={`ntp-gantt-dot ${dotCls}`} />
                      <div className="ntp-gantt-name-wrap">
                        <span className="ntp-gantt-task-name" title={task.title}>{task.title}</span>
                        {task.assigneeName && <span className="ntp-gantt-assignee">{task.assigneeName}</span>}
                      </div>
                    </div>
                    <div className="ntp-gantt-track-area">
                      <div className={barCls} style={{ left: `${left}%`, width: `${width}%` }}>
                        {(isBottleneck || isAffected) && delayDays > 0 && width > 6 && (
                          <span className="ntp-gantt-bar-label">+{delayDays}일</span>
                        )}
                      </div>
                      {delayDays > 0 && (
                        <div
                          className="ntp-gantt-delay-ext"
                          style={{
                            left: `${right}%`,
                            width: `${Math.max(1.5, (delayDays / totalDays) * 100)}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBottleneckReport = () => {
    if (reportLoading) return <div className="ntp-empty"><Clock size={24} /><strong>리포트 생성 중...</strong></div>;
    if (!report) return <div className="ntp-empty"><Inbox size={24} /><strong>데이터를 불러올 수 없습니다</strong></div>;
    if (report.bottlenecks.length === 0) return (
      <div className="ntp-empty">
        <strong>현재 병목 태스크가 없습니다</strong>
        <span>모든 업무가 원활히 진행 중입니다</span>
      </div>
    );

    return (
      <div className="ntp-report">
        {/* 전체 프로젝트 영향 요약 */}
        {renderProjectImpact()}

        {/* 간트 차트 */}
        {renderGanttChart()}

        {/* 프로젝트 지연 요약 배너 */}
        {report.totalDelayDays > 0 && (
          <div className="ntp-delay-banner">
            <TrendingDown size={20} />
            <div className="ntp-delay-banner-text">
              <strong>최대 {report.totalDelayDays}일 지연 가능</strong>
              {report.projectDeadline && (
                <span>
                  현재 마감 {report.projectDeadline}
                  {report.estimatedNewDeadline && report.estimatedNewDeadline !== report.projectDeadline
                    ? ` → 최악 시나리오 ${report.estimatedNewDeadline}`
                    : ""}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 병목 태스크 상세 */}
        <div className="ntp-section-heading"><AlertTriangle size={14} /> 병목 태스크 상세</div>
        {report.bottlenecks.map((item) => (
          <div key={item.taskId} className={`ntp-bottleneck-card ${item.delayDays > 0 ? "ntp-bottleneck-card--delayed" : ""}`}>
            <div className="ntp-bottleneck-header" onClick={() => setExpandedId(expandedId === item.taskId ? null : item.taskId)}>
              {/* 왼쪽: 태스크 정보 */}
              <div className="ntp-bottleneck-left">
                <div className="ntp-bottleneck-title-row">
                  <span className={`ntp-status-dot-label ntp-status-dot-label--${item.status.toLowerCase()}`}>
                    <span className="ntp-sdl-dot" />
                    {item.status === "ISSUE" ? "보류" : "진행중"}
                  </span>
                  <p className="ntp-bottleneck-title">{item.title}</p>
                </div>
                <p className="ntp-bottleneck-meta">
                  {item.assigneeName && <span>{item.assigneeName}</span>}
                  {item.dueDate && <span>마감 {item.dueDate}</span>}
                </p>
              </div>
              {/* 오른쪽: 수치 배지들 */}
              <div className="ntp-bottleneck-right">
                <div className="ntp-metric-chip ntp-metric-chip--stuck">
                  <Clock size={12} />
                  <span>{item.daysStuck}일 정체</span>
                </div>
                {item.delayDays > 0 && (
                  <div className="ntp-metric-chip ntp-metric-chip--delay">
                    <Zap size={12} />
                    <span>+{item.delayDays}일</span>
                  </div>
                )}
                {item.affectedTaskCount > 0 && (
                  <div className="ntp-metric-chip ntp-metric-chip--affected">
                    <GitBranch size={12} />
                    <span>{item.affectedTaskCount}개</span>
                  </div>
                )}
                <span className={`ntp-expand-chevron ${expandedId === item.taskId ? "open" : ""}`}>
                  ›
                </span>
              </div>
            </div>

            {expandedId === item.taskId && (
              <div className="ntp-affected-list">
                <div className="ntp-affected-title-row">
                  <GitBranch size={13} />
                  <span>영향 연쇄</span>
                  <span className="ntp-affected-count-chip">{item.affectedTasks.length}개 업무</span>
                </div>
                {item.affectedTasks.length === 0 ? (
                  <div className="ntp-affected-empty">
                    <span>연결된 후속 업무가 없습니다.</span>
                    <span className="ntp-affected-empty-hint">선후행 관계가 설정된 업무가 있으면 영향 분석이 가능합니다.</span>
                  </div>
                ) : (() => {
                  const orderedAffected = [...item.affectedTasks].sort((a, b) =>
                    (a.depth ?? 1) - (b.depth ?? 1) || a.title.localeCompare(b.title)
                  );
                  const byDepth = new Map<number, AffectedTask[]>();
                  for (const a of orderedAffected) {
                    const d = a.depth ?? 1;
                    if (!byDepth.has(d)) byDepth.set(d, []);
                    byDepth.get(d)!.push(a);
                  }
                  const depths = [...byDepth.keys()].sort((x, y) => x - y);
                  return (
                    <>
                      <div className="ntp-impact-chain" aria-label="영향 연쇄 시각화">
                        <div className="ntp-impact-node ntp-impact-node--root">
                          <span className="ntp-impact-node-kicker">병목</span>
                          <span className="ntp-impact-node-title">{item.title}</span>
                        </div>
                        {orderedAffected.map((a) => (
                          <div key={`chain-${a.taskId}`} className="ntp-impact-step">
                            <ArrowRight size={14} />
                            <div className="ntp-impact-node">
                              <span className="ntp-impact-node-kicker">{a.depth ?? 1}단계 영향</span>
                              <span className="ntp-impact-node-title">{a.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {depths.map((depth) => (
                        <div key={depth} className="ntp-affected-depth-group">
                          <div className="ntp-affected-depth-header">
                            <span className={`ntp-depth-tag ${depth === 1 ? "depth-direct" : "depth-indirect"}`}>
                              {depth === 1 ? "직접 영향" : `${depth}단계 영향`}
                            </span>
                            <div className="ntp-depth-arrows">
                              {Array.from({ length: Math.min(depth, 3) }).map((_, i) => (
                                <ArrowRight key={i} size={11} />
                              ))}
                            </div>
                          </div>
                          {byDepth.get(depth)!.map((a) => (
                            <div key={a.taskId} className="ntp-affected-item" style={{ paddingLeft: `${(depth - 1) * 14 + 14}px` }}>
                              <div className="ntp-affected-item-left">
                                <span className={`ntp-affected-status-dot status-${a.status.toLowerCase()}`} />
                                <span className="ntp-affected-name">{a.title}</span>
                              </div>
                              <div className="ntp-affected-meta">
                                {a.assigneeName && <span>{a.assigneeName}</span>}
                                {a.dueDate && <span>{a.dueDate}</span>}
                                {a.estimatedDelayDays != null && a.estimatedDelayDays > 0 && (
                                  <span className="ntp-affected-delay">+{a.estimatedDelayDays}일</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}

            <div className="ntp-bottleneck-actions">
              <button
                className="ntp-action-btn ntp-action-btn--primary"
                onClick={() => workspace && navigate("/workspace-board", { state: { workspace, workspaces, highlightTaskId: item.taskId } })}
              >
                보드에서 보기
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="ntp-page" style={themeStyle}>
      <Header workspaces={workspaces} />
      <BoardSubHeader wsName={wsName} members={[]} workspace={workspace} workspaces={workspaces} initialSelected="Notification" />

      <div className="wsp-panel-layout" style={{ background: workspace?.gradient ?? "#f0f2f8" }}>
      <WorkspaceCommunityPanel visible={showCommunity} workspaceId={workspace?.id} />
      <WorkspacePlannerPanel visible={showPlanner} workspaceId={workspace?.id} />
      <div className="ntp-body">

        {/* 상단 요약 */}
        <section className="ntp-hero">
          <div>
            <p className="ntp-eyebrow">NOTIFICATION CENTER</p>
            <h2 className="ntp-title">알림 센터</h2>
            <p className="ntp-subtitle">팀 프로젝트에서 놓치면 안 되는 소식과 병목 현황을 확인하세요.</p>
          </div>
          <div className="ntp-hero-count">
            <Bell size={18} />
            <strong>{unreadCount}</strong>
            <span>미읽음</span>
          </div>
        </section>

        {/* 요약 카드 4종 */}
        <section className="ntp-summary-grid">
          <div className={`ntp-summary-card ntp-summary-card--bottleneck ${filter === "BOTTLENECK" ? "active" : ""}`} onClick={() => setFilter("BOTTLENECK")} style={{ cursor: "pointer" }}>
            <span className="ntp-summary-icon bottleneck"><AlertTriangle size={17} /></span>
            <div><strong>{report?.bottlenecks.length ?? "—"}</strong><span>병목 태스크</span></div>
          </div>
          <div className={`ntp-summary-card ntp-summary-card--delay ${filter === "BOTTLENECK" ? "active" : ""}`} onClick={() => setFilter("BOTTLENECK")} style={{ cursor: "pointer" }}>
            <span className="ntp-summary-icon delay"><TrendingDown size={17} /></span>
            <div><strong>{report ? `+${report.totalDelayDays}일` : "—"}</strong><span>예상 지연</span></div>
          </div>
          <div className={`ntp-summary-card ${filter === "TASK" ? "active" : ""}`} onClick={() => setFilter("TASK")} style={{ cursor: "pointer" }}>
            <span className="ntp-summary-icon duedate"><Calendar size={17} /></span>
            <div><strong>{dueDateCount}</strong><span>마감 임박</span></div>
          </div>
          <div className={`ntp-summary-card ${filter === "REQUEST" ? "active" : ""}`} onClick={() => setFilter("REQUEST")} style={{ cursor: "pointer" }}>
            <span className="ntp-summary-icon request"><HelpCircle size={17} /></span>
            <div><strong>{requestCount}</strong><span>도움 요청</span></div>
          </div>
        </section>

        {/* 필터 툴바 */}
        <div className="ntp-toolbar">
          <div className="ntp-filters">
            {FILTERS.map((item) => (
              <button key={item.key} className={`ntp-filter-btn ${filter === item.key ? "active" : ""}`} onClick={() => setFilter(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
          {filter !== "BOTTLENECK" && notis.length > 0 && (
            <button className="ntp-read-all-btn" onClick={handleReadAll}>
              <CheckCheck size={15} /> 모두 읽음
            </button>
          )}
          {filter === "BOTTLENECK" && (
            <button className="ntp-read-all-btn" onClick={fetchReport}>
              새로고침
            </button>
          )}
        </div>

        {/* 병목 리포트 탭 */}
        {filter === "BOTTLENECK" ? renderBottleneckReport() : (
          loading ? (
            <div className="ntp-empty"><Inbox size={28} /><strong>불러오는 중...</strong></div>
          ) : filteredNotis.length === 0 ? (
            <div className="ntp-empty"><Inbox size={28} /><strong>표시할 알림이 없습니다.</strong><span>새로운 소식이 생기면 이곳에 표시됩니다.</span></div>
          ) : (
            <div className="ntp-list">
              {filteredNotis.map((n) => (
                <div
                  key={n.notificationId}
                  className={`ntp-item ntp-item--${n.type?.toLowerCase() ?? "default"} ${n.taskId ? "ntp-item--clickable" : ""} ${n.read ? "ntp-item--read" : ""} ${isRequestResolved(n) ? "ntp-item--request-resolved" : ""}`}
                  onClick={() => n.taskId && handleClickNoti(n)}
                >
                  <div className="ntp-item-icon">{TYPE_ICON[n.type] ?? <Bell size={20} color="#999" />}</div>
                  <div className="ntp-item-content">
                    <div className="ntp-item-label-row">
                      <span className={`ntp-item-type ${getNotificationTypeClass(n)}`}>{getNotificationTypeLabel(n)}</span>
                      {isRequestResolved(n) && <span className="ntp-item-resolved-badge">해결됨</span>}
                    </div>
                    <span className="ntp-item-msg">{formatNotificationMessage(n)}</span>
                    <span className="ntp-item-time">{timeAgo(n.createdAt)}</span>
                    {n.taskId && <span className="ntp-item-goto">태스크 보기 →</span>}
                  </div>
                  <button className="ntp-item-read-btn" onClick={(e) => { e.stopPropagation(); handleRead(n.notificationId); }}>
                    확인
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
      </div>

      <WorkspaceTabBar
        active={showWorkspacePanel ? "personal" : showPlanner ? "planner" : showCommunity ? "community" : undefined}
        onTabChange={(t) => {
          if (t === "board")     navigate("/workspace-board", { state: { workspace, workspaces } });
          if (t === "planner")   setShowPlanner((v) => !v);
          if (t === "community") setShowCommunity((v) => !v);
          if (t === "personal")  setShowWorkspacePanel((v) => !v);
        }}
      />
      <WorkspaceSwitcherPopover
        visible={showWorkspacePanel}
        workspace={workspace}
        workspaces={workspaces}
        onClose={() => setShowWorkspacePanel(false)}
      />
    </div>
  );
}
