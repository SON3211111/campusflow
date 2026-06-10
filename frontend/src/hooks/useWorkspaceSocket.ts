import { useEffect, useRef } from "react";

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
  boardColumn?: string;
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
  boardColumn?: string;
}

export interface WsTaskUpdated {
  type: "TASK_UPDATED";
  taskId: string;
  field: "title" | "description" | "startDate" | "dueDate" | "assigneeName" | "boardColumn";
  value: string;
}

export interface WsAiSessionUpdate {
  type: "AI_SESSION_UPDATE";
  workspaceId: string;
  updatedBy?: string;
  sessionData?: Record<string, unknown>;
}

export interface WsAiSessionDeleted {
  type: "AI_SESSION_DELETED";
  workspaceId: string;
}

export type WsMessage = WsStatusChange | WsTaskCreated | WsTaskDeleted | WsTaskRestored | WsTaskUpdated | WsAiSessionUpdate | WsAiSessionDeleted;

interface Handlers {
  onStatusChange?:      (msg: WsStatusChange)     => void;
  onTaskCreated?:       (msg: WsTaskCreated)       => void;
  onTaskDeleted?:       (msg: WsTaskDeleted)        => void;
  onTaskRestored?:      (msg: WsTaskRestored)      => void;
  onTaskUpdated?:       (msg: WsTaskUpdated)        => void;
  onAiSessionUpdate?:   (msg: WsAiSessionUpdate)   => void;
  onAiSessionDeleted?:  (msg: WsAiSessionDeleted)  => void;
}

export function useWorkspaceSocket(
  workspaceId: string | undefined,
  handlers: Handlers
) {
  const wsRef           = useRef<WebSocket | null>(null);
  const handlersRef     = useRef(handlers);
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef    = useRef(true);

  // handlers는 매 렌더마다 새 객체지만 ref로 최신 유지
  handlersRef.current = handlers;

  useEffect(() => {
    isMountedRef.current = true;
    if (!workspaceId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    const connect = () => {
      if (!isMountedRef.current) return;

      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/tasks?workspaceId=${workspaceId}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data: WsMessage = JSON.parse(event.data);
          const myUserId = localStorage.getItem("userId") ?? "";

          switch (data.type) {
            case "STATUS_CHANGE":
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
            case "AI_SESSION_UPDATE":
              handlersRef.current.onAiSessionUpdate?.(data);
              break;
            case "AI_SESSION_DELETED":
              handlersRef.current.onAiSessionDeleted?.(data);
              break;
          }
        } catch (e) {
          console.error("WS 메시지 파싱 실패:", e);
        }
      };

      ws.onerror = () => { /* 연결 실패 시 조용히 처리 */ };

      ws.onclose = () => {
        if (!isMountedRef.current) return; // 언마운트 후 재연결 방지
        timerRef.current = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      isMountedRef.current = false;

      // 재연결 타이머 취소
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const ws = wsRef.current;
      wsRef.current = null;
      if (!ws) return;

      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      } else if (ws.readyState === WebSocket.CONNECTING) {
        // CONNECTING 상태에서 close() 하면 브라우저 경고 발생 —
        // open 이벤트를 기다렸다가 즉시 닫는 방식으로 우회
        ws.addEventListener("open", () => ws.close());
      }
    };
  }, [workspaceId]); // workspaceId 바뀔 때만 재연결
}
