import { useState, useEffect, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
import client from "../api/client";

interface Props {
  visible: boolean;
  workspaceId?: string;
}

interface Message {
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;
  time: string;
  createdAt: string;
  parentMessageId?: string;
  parentSenderName?: string;
  parentContent?: string;
}

interface Channel { channelId: string; name: string; isDefault: boolean; }

interface ContextMenu { x: number; y: number; message: Message; }

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  return iso.substring(0, 10);
}

function parseMsg(m: any): Message {
  return {
    messageId: m.messageId,
    senderId: m.senderId,
    senderName: m.senderName,
    content: m.content,
    time: timeAgo(m.createdAt),
    createdAt: m.createdAt,
    parentMessageId: m.parentMessageId,
    parentSenderName: m.parentSenderName,
    parentContent: m.parentContent,
  };
}

export default function WorkspaceCommunityPanel({ visible, workspaceId }: Props) {
  const userId   = localStorage.getItem("userId") ?? "";

  const [channels, setChannels]             = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel]   = useState("일반");
  const [addingChannel, setAddingChannel]   = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set());

  const getLastSeenKey = (ch: string) => `community_last_seen_${workspaceId}_${ch}`;

  const markAsRead = (channelName: string) => {
    localStorage.setItem(getLastSeenKey(channelName), new Date().toISOString());
    setUnreadChannels((prev) => { const next = new Set(prev); next.delete(channelName); return next; });
  };

  const checkUnread = (channelName: string, msgs: Message[]): boolean => {
    if (msgs.length === 0) return false;
    const lastSeen = localStorage.getItem(getLastSeenKey(channelName));
    if (!lastSeen) return true;
    const lastMsg = msgs[msgs.length - 1];
    if (!lastMsg.createdAt) return false;
    return new Date(lastMsg.createdAt) > new Date(lastSeen);
  };
  const [messages, setMessages]             = useState<Message[]>([]);
  const [msgInput, setMsgInput]             = useState("");
  const [writing, setWriting]               = useState(false);
  const [replyTarget, setReplyTarget]       = useState<Message | null>(null);
  const [editTarget, setEditTarget]         = useState<Message | null>(null);
  const [editInput, setEditInput]           = useState("");
  const [contextMenu, setContextMenu]       = useState<ContextMenu | null>(null);
  const [members, setMembers]               = useState<{ userId: string; name: string }[]>([]);
  const [mentionQuery, setMentionQuery]     = useState("");
  const [showMention, setShowMention]       = useState(false);
  const [mentioned, setMentioned]           = useState<{ userId: string; name: string }[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !workspaceId) return;
    client.get(`/workspaces/${workspaceId}/members`).then((r) => setMembers(r.data.data ?? [])).catch(() => {});
    client.get(`/workspaces/${workspaceId}/channels`).then((r) => {
      const chs: Channel[] = r.data.data ?? [];
      setChannels(chs);
      // 모든 채널의 미읽 상태 체크
      chs.forEach((ch) => {
        if (ch.name === activeChannel) return;
        client.get(`/workspaces/${workspaceId}/messages?channel=${encodeURIComponent(ch.name)}`)
          .then((res) => {
            const msgs = (res.data.data ?? []).map(parseMsg);
            if (checkUnread(ch.name, msgs)) {
              setUnreadChannels((prev) => new Set([...prev, ch.name]));
            }
          }).catch(() => {});
      });
    }).catch(() => {});
  }, [visible, workspaceId]);

  useEffect(() => {
    if (!visible || !workspaceId) return;
    client.get(`/workspaces/${workspaceId}/messages?channel=${encodeURIComponent(activeChannel)}`)
      .then((r) => {
        const msgs = (r.data.data ?? []).map(parseMsg);
        setMessages(msgs);
        markAsRead(activeChannel);
      })
      .catch(() => {});
    setReplyTarget(null);
  }, [visible, workspaceId, activeChannel]);

  // 컨텍스트 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    const hide = () => setContextMenu(null);
    document.addEventListener("click", hide);
    return () => document.removeEventListener("click", hide);
  }, []);

  const handleRightClick = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !workspaceId) return;
    try {
      const res = await client.post(`/workspaces/${workspaceId}/channels`, { name: newChannelName.trim(), createdByUserId: userId });
      setChannels((prev) => [...prev, res.data.data]);
      setActiveChannel(newChannelName.trim());
      setNewChannelName(""); setAddingChannel(false);
    } catch (err: any) { alert(err?.response?.data?.message ?? "채널 생성 실패"); }
  };

  const handleDeleteChannel = async (ch: Channel) => {
    if (!confirm(`"${ch.name}" 채널을 삭제할까요?`)) return;
    try {
      await client.delete(`/workspaces/${workspaceId}/channels/${ch.channelId}`);
      setChannels((prev) => prev.filter((c) => c.channelId !== ch.channelId));
      if (activeChannel === ch.name) setActiveChannel("일반");
    } catch (err: any) { alert(err?.response?.data?.message ?? "채널 삭제 실패"); }
  };

  const handleInputChange = (val: string) => {
    setMsgInput(val);
    const atIdx = val.lastIndexOf("@");
    if (atIdx !== -1 && val.slice(atIdx + 1).match(/^\w*$/)) {
      setShowMention(true); setMentionQuery(val.slice(atIdx + 1));
    } else { setShowMention(false); }
  };

  const insertMention = (member: { userId: string; name: string }) => {
    const atIdx = msgInput.lastIndexOf("@");
    setMsgInput(msgInput.slice(0, atIdx) + `@${member.name} `);
    setMentioned((prev) => [...prev.filter((m) => m.userId !== member.userId), member]);
    setShowMention(false); inputRef.current?.focus();
  };

  const filteredMembers = members.filter((m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase()) && m.userId !== userId);

  const sendMessage = async () => {
    if (!msgInput.trim() || !workspaceId || !userId) return;
    const mentionListJson = mentioned.length > 0 ? JSON.stringify(mentioned.map((m) => m.userId)) : null;
    try {
      const res = await client.post(`/workspaces/${workspaceId}/messages`, {
        senderId: userId, content: msgInput.trim(),
        channel: activeChannel, mentionList: mentionListJson,
        parentMessageId: replyTarget?.messageId ?? null,
      });
      setMessages((prev) => [...prev, parseMsg(res.data.data)]);
    } catch (err) { console.error("메시지 전송 실패:", err); }
    markAsRead(activeChannel);
    setMsgInput(""); setWriting(false); setReplyTarget(null); setMentioned([]);
  };

  const saveEdit = async () => {
    if (!editTarget || !editInput.trim()) return;
    try {
      const res = await client.patch(`/workspaces/${workspaceId}/messages/${editTarget.messageId}`, { content: editInput.trim() });
      setMessages((prev) => prev.map((m) => m.messageId === editTarget.messageId ? { ...m, content: res.data.data.content } : m));
    } catch (err) { console.error("수정 실패:", err); }
    setEditTarget(null); setEditInput("");
  };

  const deleteMessage = async (msg: Message) => {
    if (!confirm("메시지를 삭제할까요?")) return;
    try {
      await client.delete(`/workspaces/${workspaceId}/messages/${msg.messageId}`);
      setMessages((prev) => prev.filter((m) => m.messageId !== msg.messageId));
    } catch (err) { console.error("삭제 실패:", err); }
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
          <input className="wsp-channel-input" placeholder="채널명..." value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateChannel(); if (e.key === "Escape") setAddingChannel(false); }}
            autoFocus />
          <button className="wsp-msg-send" onClick={handleCreateChannel}>추가</button>
        </div>
      )}
      {channels.map((ch) => (
        <div key={ch.channelId} className={`wsp-channel-item ${activeChannel === ch.name ? "wsp-channel-active" : ""}`}
          onClick={() => { setActiveChannel(ch.name); setWriting(false); }}>
          # {ch.name}
          {unreadChannels.has(ch.name) && activeChannel !== ch.name && (
            <span className="wsp-channel-unread-dot" />
          )}
          {!ch.isDefault && (
            <button className="wsp-channel-del-btn" onClick={(e) => { e.stopPropagation(); handleDeleteChannel(ch); }}>✕</button>
          )}
        </div>
      ))}

      {/* 메시지 목록 */}
      <div className="wsp-channel-label" style={{ marginTop: 12 }}>메시지</div>
      <div className="wsp-msg-list">
        {messages.length === 0
          ? <div className="wsp-msg-empty">메시지가 없습니다.</div>
          : messages.map((m) => (
            <div key={m.messageId} className="wsp-msg-item"
              onContextMenu={(e) => handleRightClick(e, m)}>
              {/* 인용 버블 (카카오톡 스타일) */}
              {m.parentContent && (
                <div className="wsp-reply-quote">
                  <span className="wsp-reply-quote-name">↩ {m.parentSenderName}</span>
                  <span className="wsp-reply-quote-text">{m.parentContent.slice(0, 40)}{m.parentContent.length > 40 ? "..." : ""}</span>
                </div>
              )}
              <div className="wsp-msg-header">
                <span className="wsp-msg-name">{m.senderName}</span>
                <span className="wsp-msg-time">{m.time}</span>
              </div>
              {editTarget?.messageId === m.messageId ? (
                <div className="wsp-edit-form">
                  <input className="wsp-edit-input" value={editInput} onChange={(e) => setEditInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") { setEditTarget(null); setEditInput(""); } }} autoFocus />
                  <div className="wsp-msg-actions">
                    <button className="wsp-msg-send" onClick={saveEdit}>저장</button>
                    <button className="wsp-msg-cancel" onClick={() => { setEditTarget(null); setEditInput(""); }}>취소</button>
                  </div>
                </div>
              ) : (
                <div className="wsp-msg-text" dangerouslySetInnerHTML={{ __html: renderContent(m.content) }} />
              )}
            </div>
          ))
        }
      </div>

      {/* 메시지 입력 */}
      {writing ? (
        <div className="wsp-msg-form" style={{ position:"relative" }}>
          {/* 답글 대상 표시 */}
          {replyTarget && (
            <div className="wsp-reply-bar">
              <span>↩ <strong>{replyTarget.senderName}</strong>: {replyTarget.content.slice(0, 30)}{replyTarget.content.length > 30 ? "..." : ""}</span>
              <button onClick={() => setReplyTarget(null)}>✕</button>
            </div>
          )}
          {/* 멘션 드롭다운 */}
          {showMention && filteredMembers.length > 0 && (
            <div className="wsp-mention-dropdown">
              {filteredMembers.map((m) => (
                <div key={m.userId} className="wsp-mention-item" onClick={() => insertMention(m)}>
                  <span className="wsp-mention-avatar">{m.name[0]}</span>{m.name}
                </div>
              ))}
            </div>
          )}
          {mentioned.length > 0 && (
            <div className="wsp-mentioned-tags">
              {mentioned.map((m) => (
                <span key={m.userId} className="wsp-mentioned-tag">
                  @{m.name}<button onClick={() => setMentioned((prev) => prev.filter((x) => x.userId !== m.userId))}>✕</button>
                </span>
              ))}
            </div>
          )}
          <textarea ref={inputRef} className="wsp-msg-input" placeholder="메시지 입력... (@로 멘션)"
            value={msgInput} onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} autoFocus />
          <div className="wsp-msg-actions">
            <button className="wsp-msg-send" onClick={sendMessage}>전송</button>
            <button className="wsp-msg-cancel" onClick={() => { setWriting(false); setMsgInput(""); setReplyTarget(null); setMentioned([]); }}>취소</button>
          </div>
        </div>
      ) : (
        <button className="wsp-new-msg-btn" onClick={() => setWriting(true)}>새 메시지 작성</button>
      )}

      {/* 우클릭 컨텍스트 메뉴 */}
      {contextMenu && (
        <div ref={menuRef} className="wsp-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}>
          <button onClick={() => {
            setReplyTarget(contextMenu.message);
            setWriting(true);
            setContextMenu(null);
          }}>↩ 답글</button>
          {contextMenu.message.senderId === userId && (
            <>
              <button onClick={() => {
                setEditTarget(contextMenu.message);
                setEditInput(contextMenu.message.content);
                setContextMenu(null);
              }}>
                <Pencil size={13} />
                수정
              </button>
              <button className="wsp-ctx-delete" onClick={() => {
                deleteMessage(contextMenu.message);
                setContextMenu(null);
              }}>
                <Trash2 size={13} />
                삭제
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
