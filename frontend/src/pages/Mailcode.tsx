import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Mailcode.css';
import logoImg from '../assets/Logo.png'; 

const MailCode: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mailcode-container">
      {/* 왼쪽 광고 영역 (기존 레이아웃 유지) */}
      <aside className="ad-sidebar left">
        <div className="ad-box box-1"></div>
        <div className="ad-box box-2"></div>
      </aside>

      {/* 중앙 인증 카드 */}
      <div className="mailcode-card">
        <div className="logo-wrapper">
          <img src={logoImg} alt="C’flow" className="mailcode-logo-img" />
        </div>
        
        <h2 className="mailcode-title">코드를 이메일로 발송하였습니다</h2>
        <p className="mailcode-desc">계정 설정을 완료하려면 다음 주소를 어쩌구</p>
        <p className="user-email">hong@gmail.com</p>

        <div className="code-input-group">
          <input type="text" maxLength={1} className="code-box" />
          <input type="text" maxLength={1} className="code-box" />
          <input type="text" maxLength={1} className="code-box" />
          <input type="text" maxLength={1} className="code-box" />
        </div>

        <button className="submit-btn" onClick={() => navigate('/UserSetup')}>완료</button>

        <div className="resend-wrapper">
          <span className="resend-link">이메일 다시 보내기</span>
        </div>

        <div className="mailcode-footer">
          <hr className="footer-line" />
          <p className="footer-text">어쩌구저쩌구</p>
        </div>
      </div>

      {/* 오른쪽 광고 영역 (기존 레이아웃 유지) */}
      <aside className="ad-sidebar right">
        <div className="ad-box box-3"></div>
        <div className="ad-box box-4"></div>
        <div className="ad-box box-5"></div>
      </aside>
    </div>
  );
};

export default MailCode;