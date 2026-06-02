import { useState, useEffect } from "react";
import client from "../api/client";

interface Props {
  visible: boolean;
  workspaceId?: string;
}

export default function WorkspaceCommunityPanel({ visible, workspaceId }: Props) {
  const userName = localStorage.getItem("userName") ?? "나";
  const userId   = localStorage.getItem("userId") ?? "";
  const [messages, setMessages] = useState<{ user: string; text: string; time: string }[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [writing, setWriting]   = useState(false);

  useEffect(() => {
    if (!visible || !workspaceId) return;
    client.get(`/workspaces/${workspaceId}/messages`)
      .then((res) => {
        const data = res.data.data ?? [];
        setMessages(data.map((m: any) => ({ user: m.senderName, text: m.content, time: m.createdAt?.substring(0, 10) ?? "" })));
      })
      .catch(() => {});
  }, [visible, workspaceId]);

  const handleSend = async () => {
    if (!msgInput.trim()) return;
    const text = msgInput.trim();
    setMsgInput("");
    setWriting(false);
    if (workspaceId && userId) {
      try {
        const res = await client.post(`/workspaces/${workspaceId}/messages`, { senderId: userId, content: text });
        const m = res.data.data;
        setMessages((prev) => [...prev, { user: m.senderName, text: m.content, time: "방금 전" }]);
      } catch (err) {
        console.error("메시지 전송 실패:", err);
        setMessages((prev) => [...prev, { user: userName, text, time: "방금 전" }]);
      }
    } else {
      setMessages((prev) => [...prev, { user: userName, text, time: "방금 전" }]);
    }
  };

  return (
    <aside className={`wsp-community ${visible ? "panel-visible" : "panel-hidden"}`}>
      <div className="wsp-panel-title"><span className="wsp-panel-icon"></span> community</div>
      <div className="wsp-channel-label">채널 및 스레드</div>
      <div className="wsp-channel-item"># 일반</div>
      <div className="wsp-channel-item"># UI/UX 디자인</div>
      <div className="wsp-channel-item"># 개발 및 연동<span className="wsp-channel-dot" /></div>
      <div className="wsp-channel-label" style={{ marginTop: 16 }}>메시지</div>
      <div className="wsp-msg-list">
        {messages.length === 0
          ? <div className="wsp-msg-empty">메시지가 없습니다.</div>
          : messages.map((m, i) => (
              <div key={i} className="wsp-msg-item">
                <div className="wsp-msg-header">
                  <span className="wsp-msg-name">{m.user}</span>
                  <span className="wsp-msg-time">{m.time}</span>
                </div>
                <div className="wsp-msg-text">{m.text}</div>
              </div>
            ))
        }
      </div>
      {writing ? (
        <div className="wsp-msg-form">
          <textarea
            className="wsp-msg-input"
            placeholder="메시지 입력..."
            value={msgInput}
            onChange={(e) => setMsgInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            autoFocus
          />
          <div className="wsp-msg-actions">
            <button className="wsp-msg-send" onClick={handleSend}>전송</button>
            <button className="wsp-msg-cancel" onClick={() => { setWriting(false); setMsgInput(""); }}>취소</button>
          </div>
        </div>
      ) : (
        <button className="wsp-new-msg-btn" onClick={() => setWriting(true)}>새 메시지 작성</button>
      )}
    </aside>
  );
}
