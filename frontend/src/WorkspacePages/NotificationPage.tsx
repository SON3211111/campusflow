import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Calendar, AlertTriangle, HelpCircle, MessageCircle, AtSign, CheckCheck, Inbox, TrendingDown, Clock } from "lucide-react";
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

interface AffectedTask {
  taskId: string;
  title: string;
  dueDate?: string;
  status: string;
  assigneeName?: string;
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

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
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

  const unreadCount = notis.filter((n) => !n.read).length;
  const dueDateCount    = notis.filter((n) => n.type === "DUE_DATE").length;
  const requestCount    = notis.filter((n) => ["QUICK_SIGNAL", "COMMENT", "MENTION"].includes(n.type)).length;

  useEffect(() => { fetchNotis(); }, [userId]);
  useEffect(() => {
    if (filter === "BOTTLENECK") fetchReport();
  }, [filter, workspace?.id]);

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
  });

  const renderBottleneckReport = () => {
    if (reportLoading) return <div className="ntp-empty"><Clock size={24} /><strong>리포트 생성 중...</strong></div>;
    if (!report) return <div className="ntp-empty"><Inbox size={24} /><strong>데이터를 불러올 수 없습니다</strong></div>;
    if (report.bottlenecks.length === 0) return (
      <div className="ntp-empty">
        <span style={{ fontSize: 32 }}>✅</span>
        <strong>현재 병목 태스크가 없습니다</strong>
        <span>모든 업무가 원활히 진행 중입니다</span>
      </div>
    );

    return (
      <div className="ntp-report">
        {/* 프로젝트 지연 요약 배너 */}
        {report.totalDelayDays > 0 && (
          <div className="ntp-delay-banner">
            <TrendingDown size={20} />
            <div className="ntp-delay-banner-text">
              <strong>프로젝트 {report.totalDelayDays}일 지연 위험</strong>
              {report.projectDeadline && (
                <span>
                  현재 마감 {report.projectDeadline}
                  {report.estimatedNewDeadline && report.estimatedNewDeadline !== report.projectDeadline
                    ? ` → 예상 연기 ${report.estimatedNewDeadline}`
                    : ""}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 병목 태스크 카드 목록 */}
        {report.bottlenecks.map((item) => (
          <div key={item.taskId} className="ntp-bottleneck-card">
            <div className="ntp-bottleneck-header" onClick={() => setExpandedId(expandedId === item.taskId ? null : item.taskId)}>
              <div className="ntp-bottleneck-left">
                <span className={`ntp-status-badge ntp-status-badge--${item.status.toLowerCase()}`}>
                  {item.status === "ISSUE" ? "🔴 보류" : "🟡 진행중"}
                </span>
                <div>
                  <p className="ntp-bottleneck-title">{item.title}</p>
                  <p className="ntp-bottleneck-meta">
                    {item.assigneeName && <span>담당: {item.assigneeName}</span>}
                    {item.dueDate && <span> · 마감 {item.dueDate}</span>}
                  </p>
                </div>
              </div>
              <div className="ntp-bottleneck-right">
                <div className="ntp-stuck-badge">
                  <Clock size={13} />
                  {item.daysStuck}일째 정체
                </div>
                {item.delayDays > 0 && (
                  <div className="ntp-delay-badge">+{item.delayDays}일 지연</div>
                )}
                <div className="ntp-affected-badge">{item.affectedTaskCount}개 영향</div>
                <span className="ntp-expand-arrow">{expandedId === item.taskId ? "▲" : "▼"}</span>
              </div>
            </div>

            {expandedId === item.taskId && item.affectedTasks.length > 0 && (
              <div className="ntp-affected-list">
                <p className="ntp-affected-title">⚠️ 영향받는 후속 업무</p>
                {item.affectedTasks.map((a) => (
                  <div key={a.taskId} className="ntp-affected-item">
                    <span className="ntp-affected-name">{a.title}</span>
                    <div className="ntp-affected-meta">
                      {a.assigneeName && <span>{a.assigneeName}</span>}
                      {a.dueDate && <span> · {a.dueDate} 마감</span>}
                    </div>
                  </div>
                ))}
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
          <div className="ntp-summary-card ntp-summary-card--bottleneck" onClick={() => setFilter("BOTTLENECK")} style={{ cursor: "pointer" }}>
            <span className="ntp-summary-icon bottleneck"><AlertTriangle size={17} /></span>
            <div><strong>{report?.bottlenecks.length ?? "—"}</strong><span>병목 태스크</span></div>
          </div>
          <div className="ntp-summary-card ntp-summary-card--delay" onClick={() => setFilter("BOTTLENECK")} style={{ cursor: "pointer" }}>
            <span className="ntp-summary-icon delay"><TrendingDown size={17} /></span>
            <div><strong>{report ? `+${report.totalDelayDays}일` : "—"}</strong><span>예상 지연</span></div>
          </div>
          <div className="ntp-summary-card">
            <span className="ntp-summary-icon duedate"><Calendar size={17} /></span>
            <div><strong>{dueDateCount}</strong><span>마감 임박</span></div>
          </div>
          <div className="ntp-summary-card">
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
                  className={`ntp-item ntp-item--${n.type?.toLowerCase() ?? "default"} ${n.taskId ? "ntp-item--clickable" : ""} ${n.read ? "ntp-item--read" : ""}`}
                  onClick={() => n.taskId && handleClickNoti(n)}
                >
                  <div className="ntp-item-icon">{TYPE_ICON[n.type] ?? <Bell size={20} color="#999" />}</div>
                  <div className="ntp-item-content">
                    <span className="ntp-item-type">{TYPE_LABEL[n.type] ?? "알림"}</span>
                    <span className="ntp-item-msg">{n.message}</span>
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
