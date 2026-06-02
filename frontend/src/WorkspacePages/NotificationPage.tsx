import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Calendar, AlertTriangle, HelpCircle, MessageCircle, AtSign, CheckCheck, Inbox } from "lucide-react";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
import client from "../api/client";
import WorkspacePlannerPanel from "../components/WorkspacePlannerPanel";
import WorkspaceCommunityPanel from "../components/WorkspaceCommunityPanel";
import WorkspaceSwitcherPopover from "../components/WorkspaceSwitcherPopover";
import { withStoredGradient, withStoredGradients } from "../utils/workspaceTheme";
import "../WorkspacePages/WorkSpacePage.css";
import "./NotificationPage.css";

interface Workspace { id: string; name: string; gradient: string; }

interface Noti {
  notificationId: string;
  message: string;
  type: string;
  taskId?: string;
  createdAt?: string;
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
  STATUS_CHANGE: "상태 변경",
  DUE_DATE: "마감 임박",
  BOTTLENECK: "병목 감지",
  QUICK_SIGNAL: "도움 요청",
  COMMENT: "댓글",
  MENTION: "멘션",
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  STATUS_CHANGE: <Bell size={20} color="#4f7cff" />,
  DUE_DATE:      <Calendar size={20} color="#f97316" />,
  BOTTLENECK:    <AlertTriangle size={20} color="#ef4444" />,
  QUICK_SIGNAL:  <HelpCircle size={20} color="#dc2626" />,
  COMMENT:       <MessageCircle size={20} color="#22c55e" />,
  MENTION:       <AtSign size={20} color="#a855f7" />,
};

const FILTERS = [
  { key: "ALL", label: "전체" },
  { key: "TASK", label: "업무", types: ["STATUS_CHANGE", "DUE_DATE", "BOTTLENECK"] },
  { key: "REQUEST", label: "요청", types: ["QUICK_SIGNAL", "COMMENT", "MENTION"] },
];

export default function NotificationPage() {
  const { state } = useLocation() as { state: { workspace?: Workspace; workspaces?: Workspace[] } };
  const navigate = useNavigate();
  const savedWs = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
  const rawWorkspace = state?.workspace ?? savedWs;
  const workspace = rawWorkspace ? withStoredGradient(rawWorkspace) : undefined;
  const workspaces = withStoredGradients(state?.workspaces ?? []);
  const wsName = workspace?.name ?? "워크스페이스";
  const userId = localStorage.getItem("userId") ?? "";

  const [notis, setNotis] = useState<Noti[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanner,   setShowPlanner]   = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [showWorkspacePanel, setShowWorkspacePanel] = useState(false);
  const [filter, setFilter] = useState("ALL");

  const VALID_TYPES = ["STATUS_CHANGE", "DUE_DATE", "BOTTLENECK", "QUICK_SIGNAL", "COMMENT", "MENTION"];

  const fetchNotis = async () => {
    if (!userId) return;
    try {
      const res = await client.get(`/notifications?userId=${userId}`);
      const all: Noti[] = res.data.data ?? [];
      setNotis(all.filter((n) => VALID_TYPES.includes(n.type)));
    } catch (err) {
      console.error("알림 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotis(); }, [userId]);

  const handleRead = async (notificationId: string) => {
    try {
      await client.post(`/notifications/${notificationId}/read`);
      setNotis((prev) => prev.filter((n) => n.notificationId !== notificationId));
    } catch (err) {
      console.error("읽음 처리 실패:", err);
    }
  };

  const handleClickNoti = async (n: Noti) => {
    await client.post(`/notifications/${n.notificationId}/read`).catch(() => {});
    setNotis((prev) => prev.filter((x) => x.notificationId !== n.notificationId));
    if (n.taskId && workspace) {
      navigate("/workspace-board", { state: { workspace, workspaces, highlightTaskId: n.taskId } });
    }
  };

  const handleReadAll = async () => {
    await Promise.all(notis.map((n) => client.post(`/notifications/${n.notificationId}/read`).catch(() => {})));
    setNotis([]);
  };

  const activeFilter = FILTERS.find((item) => item.key === filter);
  const filteredNotis = activeFilter?.types
    ? notis.filter((noti) => activeFilter.types?.includes(noti.type))
    : notis;
  const requestCount = notis.filter((noti) => ["QUICK_SIGNAL", "COMMENT", "MENTION"].includes(noti.type)).length;

  return (
    <div className="ntp-page">
      <Header workspaces={workspaces} />
      <BoardSubHeader wsName={wsName} members={[]} workspace={workspace} workspaces={workspaces} initialSelected="Notification" />

      <div className="wsp-panel-layout" style={{ background: workspace?.gradient ?? "#f0f2f8" }}>
      <WorkspaceCommunityPanel visible={showCommunity} workspaceId={workspace?.id} />
      <WorkspacePlannerPanel visible={showPlanner} workspaceId={workspace?.id} />
      <div className="ntp-body">
        <section className="ntp-hero">
          <div>
            <p className="ntp-eyebrow">NOTIFICATION CENTER</p>
            <h2 className="ntp-title">알림</h2>
            <p className="ntp-subtitle">팀 프로젝트에서 놓치면 안 되는 소식을 확인하세요.</p>
          </div>
          <div className="ntp-hero-count">
            <Bell size={18} />
            <strong>{notis.length}</strong>
            <span>새 알림</span>
          </div>
        </section>

        <section className="ntp-summary-grid">
          <div className="ntp-summary-card">
            <span className="ntp-summary-icon task"><Calendar size={17} /></span>
            <div><strong>{notis.length - requestCount}</strong><span>업무 업데이트</span></div>
          </div>
          <div className="ntp-summary-card">
            <span className="ntp-summary-icon request"><MessageCircle size={17} /></span>
            <div><strong>{requestCount}</strong><span>요청 및 소통</span></div>
          </div>
        </section>

        <div className="ntp-toolbar">
          <div className="ntp-filters">
            {FILTERS.map((item) => (
              <button key={item.key} className={`ntp-filter-btn ${filter === item.key ? "active" : ""}`} onClick={() => setFilter(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
          {notis.length > 0 && (
            <button className="ntp-read-all-btn" onClick={handleReadAll}>
              <CheckCheck size={15} /> 모두 읽음
            </button>
          )}
        </div>

        {loading ? (
          <div className="ntp-empty"><Inbox size={28} /><strong>불러오는 중...</strong></div>
        ) : filteredNotis.length === 0 ? (
          <div className="ntp-empty"><Inbox size={28} /><strong>표시할 알림이 없습니다.</strong><span>새로운 소식이 생기면 이곳에 표시됩니다.</span></div>
        ) : (
          <div className="ntp-list">
            {filteredNotis.map((n) => (
              <div
                key={n.notificationId}
                className={`ntp-item ntp-item--${n.type?.toLowerCase() ?? "default"} ${n.taskId ? "ntp-item--clickable" : ""}`}
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
