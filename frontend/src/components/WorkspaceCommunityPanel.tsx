import { useState, useEffect, useRef } from "react";
import client from "../api/client";

interface Props {
  visible: boolean;
  workspaceId?: string;
}

interface Message {
  messageId: string;
  senderName: string;
  content: string;
  time: string;
  mentionList?: string;
}

interface Channel {
  channelId: string;
  name: string;
  isDefault: boolean;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  return iso.substring(0, 10);
}

export default function WorkspaceCommunityPanel({ visible, workspaceId }: Props) {
  const userName = localStorage.getItem("userName") ?? "나";
  const userId   = localStorage.getItem("userId") ?? "";

  const [channels, setChannels]           = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState("일반");
  const [addingChannel, setAddingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [messages, setMessages]           = useState<Message[]>([]);
  const [msgInput, setMsgInput]           = useState("");
  const [writing, setWriting]             = useState(false);
  const [threadTarget, setThreadTarget]   = useState<Message | null>(null);
  const [replies, setReplies]             = useState<Message[]>([]);
  const [replyInput, setReplyInput]       = useState("");

  // 멘션 자동완성
  const [members, setMembers]             = useState<{ userId: string; name: string }[]>([]);
  const [mentionQuery, setMentionQuery]   = useState("");
  const [showMention, setShowMention]     = useState(false);
  const [mentioned, setMentioned]         = useState<{ userId: string; name: string }[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!visible || !workspaceId) return;
    client.get(`/workspaces/${workspaceId}/members`)
      .then((res) => setMembers(res.data.data ?? []))
      .catch(() => {});
    client.get(`/workspaces/${workspaceId}/channels`)
      .then((res) => setChannels(res.data.data ?? []))
      .catch(() => {});
  }, [visible, workspaceId]);

  useEffect(() => {
    if (!visible || !workspaceId) return;
    client.get(`/workspaces/${workspaceId}/messages?channel=${encodeURIComponent(activeChannel)}`)
      .then((res) => {
        const data = res.data.data ?? [];
        setMessages(data.map((m: any) => ({ messageId: m.messageId, senderName: m.senderName, content: m.content, time: timeAgo(m.createdAt), mentionList: m.mentionList })));
      })
      .catch(() => {});
    setThreadTarget(null);
    setReplies([]);
  }, [visible, workspaceId, activeChannel]);

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !workspaceId) return;
    try {
      const res = await client.post(`/workspaces/${workspaceId}/channels`, {
        name: newChannelName.trim(),
        createdByUserId: userId,
      });
      setChannels((prev) => [...prev, res.data.data]);
      setActiveChannel(newChannelName.trim());
      setNewChannelName("");
      setAddingChannel(false);
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "채널 생성 실패");
    }
  };

  const handleDeleteChannel = async (ch: Channel) => {
    if (!window.confirm(`"${ch.name}" 채널을 삭제할까요?`)) return;
    try {
      await client.delete(`/workspaces/${workspaceId}/channels/${ch.channelId}`);
      setChannels((prev) => prev.filter((c) => c.channelId !== ch.channelId));
      if (activeChannel === ch.name) setActiveChannel("일반");
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "채널 삭제 실패");
    }
  };

  const openThread = async (msg: Message) => {
    setThreadTarget(msg);
    if (!workspaceId) return;
    const res = await client.get(`/workspaces/${workspaceId}/messages/${msg.messageId}/replies`).catch(() => null);
    if (res) setReplies((res.data.data ?? []).map((m: any) => ({ messageId: m.messageId, senderName: m.senderName, content: m.content, time: timeAgo(m.createdAt) })));
  };

  const handleInputChange = (val: string) => {
    setMsgInput(val);
    const atIdx = val.lastIndexOf("@");
    if (atIdx !== -1 && atIdx === val.length - 1) {
      setShowMention(true);
      setMentionQuery("");
    } else if (atIdx !== -1 && val.slice(atIdx + 1).match(/^\w*$/)) {
      setShowMention(true);
      setMentionQuery(val.slice(atIdx + 1));
    } else {
      setShowMention(false);
    }
  };

  const insertMention = (member: { userId: string; name: string }) => {
    const atIdx = msgInput.lastIndexOf("@");
    const newText = msgInput.slice(0, atIdx) + `@${member.name} `;
    setMsgInput(newText);
    setMentioned((prev) => [...prev.filter((m) => m.userId !== member.userId), member]);
    setShowMention(false);
    inputRef.current?.focus();
  };

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(mentionQuery.toLowerCase()) && m.userId !== userId
  );

  const sendMessage = async (content: string, parentMessageId?: string) => {
    if (!content.trim() || !workspaceId || !userId) return;
    const mentionListJson = mentioned.length > 0
      ? JSON.stringify(mentioned.map((m) => m.userId))
      : null;
    try {
      const res = await client.post(`/workspaces/${workspaceId}/messages`, {
        senderId: userId,
        content: content.trim(),
        channel: activeChannel,
        mentionList: mentionListJson,
        parentMessageId: parentMessageId ?? null,
      });
      const m = res.data.data;
      const newMsg: Message = { messageId: m.messageId, senderName: m.senderName, content: m.content, time: "방금 전" };
      if (parentMessageId) {
        setReplies((prev) => [...prev, newMsg]);
      } else {
        setMessages((prev) => [...prev, newMsg]);
      }
    } catch (err) {
      console.error("메시지 전송 실패:", err);
    }
    setMentioned([]);
  };

  const handleSend = async () => {
    await sendMessage(msgInput);
    setMsgInput("");
    setWriting(false);
  };

  const handleSendReply = async () => {
    if (!threadTarget) return;
    await sendMessage(replyInput, threadTarget.messageId);
    setReplyInput("");
  };

  const renderContent = (content: string) =>
    content.replace(/@(\S+)/g, '<span class="wsp-mention">@$1</span>');

  return (
    <aside className={`wsp-community ${visible ? "panel-visible" : "panel-hidden"}`}>
      <div className="wsp-panel-title"><span className="wsp-panel-icon"></span> community</div>

      {/* 채널 목록 */}
      <div className="wsp-channel-label" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span>채널</span>
        <button className="wsp-channel-add-btn" onClick={() => setAddingChannel((v) => !v)}>+</button>
      </div>

      {addingChannel && (
        <div className="wsp-channel-create">
          <input
            className="wsp-channel-input"
            placeholder="채널명 입력..."
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateChannel(); if (e.key === "Escape") setAddingChannel(false); }}
            autoFocus
          />
          <button className="wsp-msg-send" onClick={handleCreateChannel}>추가</button>
        </div>
      )}

      {channels.map((ch) => (
        <div
          key={ch.channelId}
          className={`wsp-channel-item ${activeChannel === ch.name ? "wsp-channel-active" : ""}`}
          onClick={() => { setActiveChannel(ch.name); setWriting(false); }}
        >
          # {ch.name}
          {!ch.isDefault && (
            <button
              className="wsp-channel-del-btn"
              onClick={(e) => { e.stopPropagation(); handleDeleteChannel(ch); }}
            >✕</button>
          )}
        </div>
      ))}

      {/* 스레드 뷰 */}
      {threadTarget ? (
        <>
          <div className="wsp-thread-header">
            <button className="wsp-thread-back" onClick={() => setThreadTarget(null)}>← 뒤로</button>
            <span className="wsp-thread-title">스레드</span>
          </div>
          <div className="wsp-msg-item wsp-thread-parent">
            <div className="wsp-msg-header">
              <span className="wsp-msg-name">{threadTarget.senderName}</span>
              <span className="wsp-msg-time">{threadTarget.time}</span>
            </div>
            <div className="wsp-msg-text" dangerouslySetInnerHTML={{ __html: renderContent(threadTarget.content) }} />
          </div>
          <div className="wsp-channel-label">답글 {replies.length}개</div>
          <div className="wsp-msg-list">
            {replies.map((r, i) => (
              <div key={i} className="wsp-msg-item">
                <div className="wsp-msg-header">
                  <span className="wsp-msg-name">{r.senderName}</span>
                  <span className="wsp-msg-time">{r.time}</span>
                </div>
                <div className="wsp-msg-text" dangerouslySetInnerHTML={{ __html: renderContent(r.content) }} />
              </div>
            ))}
          </div>
          <div className="wsp-msg-form">
            <textarea
              className="wsp-msg-input"
              placeholder="답글 작성..."
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
            />
            <div className="wsp-msg-actions">
              <button className="wsp-msg-send" onClick={handleSendReply}>전송</button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 메시지 목록 */}
          <div className="wsp-channel-label" style={{ marginTop: 12 }}>메시지</div>
          <div className="wsp-msg-list">
            {messages.length === 0
              ? <div className="wsp-msg-empty">메시지가 없습니다.</div>
              : messages.map((m) => (
                  <div key={m.messageId} className="wsp-msg-item">
                    <div className="wsp-msg-header">
                      <span className="wsp-msg-name">{m.senderName}</span>
                      <span className="wsp-msg-time">{m.time}</span>
                    </div>
                    <div className="wsp-msg-text" dangerouslySetInnerHTML={{ __html: renderContent(m.content) }} />
                    <button className="wsp-thread-btn" onClick={() => openThread(m)}>↩ 답글</button>
                  </div>
                ))
            }
          </div>

          {/* 메시지 입력 */}
          {writing ? (
            <div className="wsp-msg-form" style={{ position: "relative" }}>
              {/* 멘션 드롭다운 */}
              {showMention && filteredMembers.length > 0 && (
                <div className="wsp-mention-dropdown">
                  {filteredMembers.map((m) => (
                    <div key={m.userId} className="wsp-mention-item" onClick={() => insertMention(m)}>
                      <span className="wsp-mention-avatar">{m.name[0]}</span>
                      {m.name}
                    </div>
                  ))}
                </div>
              )}
              {mentioned.length > 0 && (
                <div className="wsp-mentioned-tags">
                  {mentioned.map((m) => (
                    <span key={m.userId} className="wsp-mentioned-tag">
                      @{m.name}
                      <button onClick={() => setMentioned((prev) => prev.filter((x) => x.userId !== m.userId))}>✕</button>
                    </span>
                  ))}
                </div>
              )}
              <textarea
                ref={inputRef}
                className="wsp-msg-input"
                placeholder="메시지 입력... (@로 멘션)"
                value={msgInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                autoFocus
              />
              <div className="wsp-msg-actions">
                <button className="wsp-msg-send" onClick={handleSend}>전송</button>
                <button className="wsp-msg-cancel" onClick={() => { setWriting(false); setMsgInput(""); setMentioned([]); }}>취소</button>
              </div>
            </div>
          ) : (
            <button className="wsp-new-msg-btn" onClick={() => setWriting(true)}>새 메시지 작성</button>
          )}
        </>
      )}
    </aside>
  );
}
