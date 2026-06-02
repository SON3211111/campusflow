interface Props {
  visible: boolean;
}

export default function WorkspaceCommunityPanel({ visible }: Props) {
  return (
    <aside className={`wsp-community ${visible ? "panel-visible" : "panel-hidden"}`}>
      <div className="wsp-panel-title"><span className="wsp-panel-icon"></span> community</div>
      <input className="wsp-search" placeholder="채널 및 메시지 검색..." />
      <div className="wsp-channel-label">채널 및 스레드</div>
      <div className="wsp-channel-item"># 일반</div>
      <div className="wsp-channel-item"># UI/UX 디자인</div>
      <div className="wsp-channel-item"># 개발 및 연동<span className="wsp-channel-dot" /></div>
      <div className="wsp-channel-label" style={{ marginTop: 16 }}>최근 메시지</div>
      <div className="wsp-msg-empty">메시지가 없습니다.</div>
    </aside>
  );
}
