import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css";

const AVATAR_COLORS = ["#a89cf8", "#6ab4f8", "#7de89a", "#f8b4b4", "#f8d08a"];

export default function ProfilePage() {
  const navigate = useNavigate();

  const storedName  = localStorage.getItem("userName") ?? "사용자";
  const storedEmail = localStorage.getItem("userEmail") ?? "이메일 정보 없음";
  const userId      = localStorage.getItem("userId") ?? "";
  const avatarColor = AVATAR_COLORS[storedName.charCodeAt(0) % AVATAR_COLORS.length];

  // 기본 프로필
  const [name,       setName]       = useState(storedName);
  const [nameMsg,    setNameMsg]     = useState("");
  const [avatarSrc,  setAvatarSrc]  = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 비밀번호
  const [pwForm,  setPwForm]  = useState({ current: "", next: "", confirm: "" });
  const [pwMsg,   setPwMsg]   = useState("");

  // 알림 설정 (localStorage)
  const [emailNoti,  setEmailNoti]  = useState(() => localStorage.getItem("noti_email") !== "off");
  const [inviteNoti, setInviteNoti] = useState(() => localStorage.getItem("noti_invite") !== "off");

  // 회원 탈퇴
  const [showWithdraw,  setShowWithdraw]  = useState(false);
  const [withdrawPw,    setWithdrawPw]    = useState("");
  const [withdrawMsg,   setWithdrawMsg]   = useState("");

  // 이름 저장 (localStorage만)
  const handleSaveName = () => {
    if (!name.trim()) { setNameMsg("이름을 입력해주세요."); return; }
    localStorage.setItem("userName", name.trim());
    setNameMsg("이름이 변경되었습니다.");
    setTimeout(() => setNameMsg(""), 2000);
  };

  // 프로필 사진 미리보기
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  // 비밀번호 변경 (UI only)
  const handleChangePw = () => {
    if (!pwForm.current) { setPwMsg("현재 비밀번호를 입력해주세요."); return; }
    if (pwForm.next.length < 6) { setPwMsg("새 비밀번호는 6자 이상이어야 합니다."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwMsg("새 비밀번호가 일치하지 않습니다."); return; }
    setPwMsg("서버 연동이 필요한 기능입니다.");
  };

  // 알림 토글
  const toggleEmailNoti = () => {
    const next = !emailNoti;
    setEmailNoti(next);
    localStorage.setItem("noti_email", next ? "on" : "off");
  };
  const toggleInviteNoti = () => {
    const next = !inviteNoti;
    setInviteNoti(next);
    localStorage.setItem("noti_invite", next ? "on" : "off");
  };

  // 회원 탈퇴 (로컬 세션 삭제 후 로그인 이동)
  const handleWithdraw = () => {
    if (!withdrawPw) { setWithdrawMsg("비밀번호를 입력해주세요."); return; }
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="pf-page">
      {/* 상단 네비 */}
      <div className="pf-topbar">
        <button className="pf-back-btn" onClick={() => navigate(-1)}>← 돌아가기</button>
        <span className="pf-topbar-title">개인정보 설정</span>
      </div>

      <div className="pf-body">
        {/* 좌측 아바타 카드 */}
        <aside className="pf-sidebar">
          <div className="pf-avatar-wrap" onClick={() => fileRef.current?.click()}>
            {avatarSrc
              ? <img src={avatarSrc} className="pf-avatar-img" alt="avatar" />
              : <div className="pf-avatar-circle" style={{ background: avatarColor }}>{storedName[0]}</div>
            }
            <div className="pf-avatar-overlay">사진 변경</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
          <p className="pf-sidebar-name">{name}</p>
          <p className="pf-sidebar-email">{storedEmail}</p>
          <p className="pf-sidebar-id">ID: {userId.slice(0, 8)}...</p>
        </aside>

        {/* 우측 설정 섹션 */}
        <main className="pf-main">

          {/* 기본 프로필 */}
          <section className="pf-section">
            <h2 className="pf-section-title">기본 프로필</h2>

            <div className="pf-field">
              <label className="pf-label">이름 (표시 이름)</label>
              <div className="pf-input-row">
                <input className="pf-input" value={name} onChange={e => setName(e.target.value)} placeholder="이름 입력" />
                <button className="pf-btn-primary" onClick={handleSaveName}>저장</button>
              </div>
              {nameMsg && <p className="pf-msg success">{nameMsg}</p>}
            </div>

            <div className="pf-field">
              <label className="pf-label">프로필 사진</label>
              <div className="pf-input-row">
                <span className="pf-value-text">{avatarSrc ? "사진 업로드됨" : "기본 아바타 사용 중"}</span>
                <button className="pf-btn-secondary" onClick={() => fileRef.current?.click()}>사진 변경</button>
              </div>
              <p className="pf-hint">* 사진은 현재 세션에서만 유지됩니다.</p>
            </div>

            <div className="pf-field">
              <label className="pf-label">이메일</label>
              <div className="pf-input-row">
                <input className="pf-input" value={storedEmail} readOnly />
                <span className="pf-readonly-badge">변경 불가</span>
              </div>
            </div>
          </section>

          {/* 보안 */}
          <section className="pf-section">
            <h2 className="pf-section-title">보안</h2>

            <div className="pf-field">
              <label className="pf-label">비밀번호 변경</label>
              <div className="pf-pw-form">
                <input className="pf-input" type="password" placeholder="현재 비밀번호"
                  value={pwForm.current} onChange={e => setPwForm(p => ({...p, current: e.target.value}))} />
                <input className="pf-input" type="password" placeholder="새 비밀번호 (6자 이상)"
                  value={pwForm.next} onChange={e => setPwForm(p => ({...p, next: e.target.value}))} />
                <input className="pf-input" type="password" placeholder="새 비밀번호 확인"
                  value={pwForm.confirm} onChange={e => setPwForm(p => ({...p, confirm: e.target.value}))} />
                <button className="pf-btn-primary" onClick={handleChangePw}>비밀번호 변경</button>
              </div>
              {pwMsg && <p className="pf-msg">{pwMsg}</p>}
            </div>

            <div className="pf-field">
              <label className="pf-label">로그인 기록</label>
              <div className="pf-login-history">
                <p className="pf-hint">* 로그인 기록 기능은 서버 연동이 필요합니다.</p>
              </div>
            </div>
          </section>

          {/* 알림 설정 */}
          <section className="pf-section">
            <h2 className="pf-section-title">알림 설정</h2>

            <div className="pf-field pf-toggle-row">
              <div>
                <p className="pf-label">이메일 알림</p>
                <p className="pf-hint">주요 업데이트를 이메일로 받습니다.</p>
              </div>
              <button className={`pf-toggle ${emailNoti ? "on" : ""}`} onClick={toggleEmailNoti}>
                <span className="pf-toggle-thumb" />
              </button>
            </div>

            <div className="pf-field pf-toggle-row">
              <div>
                <p className="pf-label">초대 알림</p>
                <p className="pf-hint">워크스페이스 초대 알림을 받습니다.</p>
              </div>
              <button className={`pf-toggle ${inviteNoti ? "on" : ""}`} onClick={toggleInviteNoti}>
                <span className="pf-toggle-thumb" />
              </button>
            </div>
          </section>

          {/* 계정 관리 */}
          <section className="pf-section danger-zone">
            <h2 className="pf-section-title">계정 관리</h2>

            {!showWithdraw ? (
              <div className="pf-field">
                <label className="pf-label">회원 탈퇴</label>
                <p className="pf-hint">탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.</p>
                <button className="pf-btn-danger" onClick={() => setShowWithdraw(true)}>탈퇴하기</button>
              </div>
            ) : (
              <div className="pf-field">
                <label className="pf-label">탈퇴 확인</label>
                <p className="pf-hint pf-danger-text">정말 탈퇴하시겠습니까? 비밀번호를 입력해주세요.</p>
                <div className="pf-input-row">
                  <input className="pf-input" type="password" placeholder="비밀번호 입력"
                    value={withdrawPw} onChange={e => setWithdrawPw(e.target.value)} />
                </div>
                {withdrawMsg && <p className="pf-msg error">{withdrawMsg}</p>}
                <div className="pf-btn-row">
                  <button className="pf-btn-danger" onClick={handleWithdraw}>탈퇴 확인</button>
                  <button className="pf-btn-secondary" onClick={() => { setShowWithdraw(false); setWithdrawPw(""); }}>취소</button>
                </div>
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
}
