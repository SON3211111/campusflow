import { useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

interface TaskStatusMessage {
  taskId: string;
  newStatus: string;
  changedByUserId: string;
}

export function useWorkspaceSocket(
  workspaceId: string | undefined,
  onTaskStatusChange: (msg: TaskStatusMessage) => void
) {
  const clientRef = useRef<Client | null>(null);
  const onMsgRef  = useRef(onTaskStatusChange);
  onMsgRef.current = onTaskStatusChange;

  const connect = useCallback(() => {
    if (!workspaceId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(
          `/topic/workspace/${workspaceId}/tasks`,
          (msg) => {
            try {
              const data: TaskStatusMessage = JSON.parse(msg.body);
              const myUserId = localStorage.getItem("userId") ?? "";
              if (data.changedByUserId !== myUserId) {
                onMsgRef.current(data);
              }
            } catch (e) {
              console.error("WS 메시지 파싱 실패:", e);
            }
          }
        );
      },
    });

    client.activate();
    clientRef.current = client;
  }, [workspaceId]);

  useEffect(() => {
    connect();
    return () => { clientRef.current?.deactivate(); };
  }, [connect]);
}
