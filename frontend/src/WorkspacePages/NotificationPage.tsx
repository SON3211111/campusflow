import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BoardSubHeader from "../components/BoardSubHeader";
import WorkspaceTabBar from "../components/WorkspaceTabBar";
import client from "../api/client";
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
};

const TYPE_ICON: Record<string, string> = {
  STATUS_CHANGE: "🔔",
  DUE_DATE: "📅",
  BOTTLENECK: "⚠️",
};

export default function NotificationPage() {
  const { state } = useLocation() as { state: { workspace?: Workspace; workspaces?: Workspace[] } };
  const navigate = useNavigate();
  const savedWs = JSON.parse(localStorage.getItem("clickedWorkspace") ?? "null");
  const workspace = state?.workspace ?? savedWs;
  const workspaces = state?.workspaces ?? [];
  const wsName = workspace?.name ?? "워크스페이스";
  const userId = localStorage.getItem("userId") ?? "";

  const [notis, setNotis] = useState<Noti[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotis = async () => {
    if (!userId) return;
    try {
      const res = await client.get(`/notifications?userId=${userId}`);
      setNotis(res.data.data ?? []);
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

  const handleReadAll = async () => {
    await Promise.all(notis.map((n) => client.post(`/notifications/${n.notificationId}/read`).catch(() => {})));
    setNotis([]);
  };

  return (
    <div className="ntp-page">
      <Header workspaces={workspaces} />
      <BoardSubHeader wsName={wsName} members={[]} workspace={workspace} workspaces={workspaces} initialSelected="Notification" />

      <div className="ntp-body">
        <div className="ntp-header-row">
          <h2 className="ntp-title">알림</h2>
          {notis.length > 0 && (
            <button className="ntp-read-all-btn" onClick={handleReadAll}>
              모두 읽음
            </button>
          )}
        </div>

        {loading ? (
          <div className="ntp-empty">불러오는 중...</div>
        ) : notis.length === 0 ? (
          <div className="ntp-empty">새 알림이 없습니다.</div>
        ) : (
          <div className="ntp-list">
            {notis.map((n) => (
              <div key={n.notificationId} className={`ntp-item ntp-item--${n.type?.toLowerCase() ?? "default"}`}>
                <div className="ntp-item-icon">{TYPE_ICON[n.type] ?? "🔔"}</div>
                <div className="ntp-item-content">
                  <span className="ntp-item-type">{TYPE_LABEL[n.type] ?? "알림"}</span>
                  <span className="ntp-item-msg">{n.message}</span>
                  <span className="ntp-item-time">{timeAgo(n.createdAt)}</span>
                </div>
                <button className="ntp-item-read-btn" onClick={() => handleRead(n.notificationId)}>
                  확인
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <WorkspaceTabBar
        onTabChange={(t) => {
          if (t === "board") navigate("/workspace-board", { state: { workspace, workspaces } });
          if (t === "planner") navigate("/workspace-board", { state: { workspace, workspaces } });
          if (t === "community") navigate("/workspace-board", { state: { workspace, workspaces } });
        }}
      />
    </div>
  );
}
