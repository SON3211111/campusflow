import "./CommunityDrawer.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommunityDrawer({ open, onClose }: Props) {
  return (
    <>
      {open && <div className="drawer-backdrop" onClick={onClose} />}
      <div className={`community-drawer ${open ? "open" : ""}`}>
        <div className="drawer-header">
          <span className="drawer-title">Community</span>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="community-drawer-label">채널 및 스레드</div>
        <div className="community-drawer-channel"># 일반</div>
        <div className="community-drawer-channel"># UI/UX 디자인</div>
        <div className="community-drawer-channel">
          # 개발 및 연동
          <span className="community-drawer-dot" />
        </div>
        <div className="community-drawer-label" style={{ marginTop: 16 }}>최근 메시지</div>
        <div className="community-drawer-empty">메시지가 없습니다.</div>
      </div>
    </>
  );
}
