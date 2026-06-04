import { useEffect, useRef, useCallback } from "react";

export interface WsStatusChange {
  type: "STATUS_CHANGE";
  taskId: string;
  newStatus: string;
  changedByUserId: string;
}

export interface WsTaskCreated {
  type: "TASK_CREATED";
  taskId: string;
  title: string;
  status: string;
  assigneeId: string;
  assigneeName: string;
  priority: string;
}

export interface WsTaskDeleted {
  type: "TASK_DELETED";
  taskId: string;
}

export interface WsTaskRestored {
  type: "TASK_RESTORED";
  taskId: string;
  title: string;
  status: string;
  assigneeId: string;
  assigneeName: string;
  priority: string;
}

export interface WsTaskUpdated {
  type: "TASK_UPDATED";
  taskId: string;
  field: "title" | "description" | "dueDate";
  value: string;
}

export type WsMessage = WsStatusChange | WsTaskCreated | WsTaskDeleted | WsTaskRestored | WsTaskUpdated;

interface Handlers {
  onStatusChange?: (msg: WsStatusChange) => void;
  onTaskCreated?:  (msg: WsTaskCreated)  => void;
  onTaskDeleted?:  (msg: WsTaskDeleted)  => void;
  onTaskRestored?: (msg: WsTaskRestored) => void;
  onTaskUpdated?:  (msg: WsTaskUpdated)  => void;
}

export function useWorkspaceSocket(
  workspaceId: string | undefined,
  handlers: Handlers
) {
  const wsRef      = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (!workspaceId) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/tasks?workspaceId=${workspaceId}`);

    ws.onmessage = (event) => {
      try {
        const data: WsMessage = JSON.parse(event.data);
        const myUserId = localStorage.getItem("userId") ?? "";

        switch (data.type) {
          case "STATUS_CHANGE":
            // 본인이 변경한 건 본인 화면엔 이미 반영됐으므로 제외
            if (data.changedByUserId !== myUserId) {
              handlersRef.current.onStatusChange?.(data);
            }
            break;
          case "TASK_CREATED":
            handlersRef.current.onTaskCreated?.(data);
            break;
          case "TASK_DELETED":
            handlersRef.current.onTaskDeleted?.(data);
            break;
          case "TASK_RESTORED":
            handlersRef.current.onTaskRestored?.(data);
            break;
          case "TASK_UPDATED":
            handlersRef.current.onTaskUpdated?.(data);
            break;
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
