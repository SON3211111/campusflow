import { useEffect, useRef, useCallback } from "react";

interface TaskStatusMessage {
  taskId: string;
  newStatus: string;
  changedByUserId: string;
}

export function useWorkspaceSocket(
  workspaceId: string | undefined,
  onTaskStatusChange: (msg: TaskStatusMessage) => void
) {
  const wsRef    = useRef<WebSocket | null>(null);
  const onMsgRef = useRef(onTaskStatusChange);
  onMsgRef.current = onTaskStatusChange;

  const connect = useCallback(() => {
    if (!workspaceId) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/tasks?workspaceId=${workspaceId}`);

    ws.onmessage = (event) => {
      try {
        const data: TaskStatusMessage = JSON.parse(event.data);
        const myUserId = localStorage.getItem("userId") ?? "";
        if (data.changedByUserId !== myUserId) {
          onMsgRef.current(data);
        }
      } catch (e) {
        console.error("WS 메시지 파싱 실패:", e);
      }
    };

    ws.onerror = () => {
      // 연결 실패 시 조용히 처리 (WebSocket 미지원 환경 대응)
    };

    ws.onclose = () => {
      // 연결 끊기면 3초 후 재연결
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) connect();
      }, 3000);
    };

    wsRef.current = ws;
  }, [workspaceId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);
}
