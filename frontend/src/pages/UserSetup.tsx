import React from 'react';
import { useNavigate } from 'react-router-dom';
import './UserSetup.css';
import logoImg from '../assets/Logo.png';
import eyeIcon from '../assets/icons-eye.png'; // 형님이 직접 가져오신 PNG

const UserSetup: React.FC = () => {
  const navigate = useNavigate();

  // 완료 버튼 클릭 시 알림창 띄우고 이동
  const handleComplete = () => {
    alert("로그인 완료!"); 
    navigate('/Login'); // 대문자 Login으로 경로 수정
  };

  return (
    <div className="setup-container">
      {/* 왼쪽 광고 영역 */}
      <aside className="ad-sidebar left">
        <div className="ad-box box-1"></div>
        <div className="ad-box box-2"></div>
      </aside>

      {/* 중앙 설정 카드 */}
      <div className="setup-card">
        <div className="logo-wrapper">
          <img src={logoImg} alt="C’flow" className="setup-logo-img" />
        </div>
        
        <h2 className="setup-title">회원가입 유저 정보 기입</h2>

        <div className="info-display">
          <p className="label">이메일 주소</p>
          <p className="user-email-text">hong@gmail.com</p>
        </div>

        <div className="setup-form">
          {/* 유저 이름 입력창 */}
          <div className="input-group">
            <label>유저 이름</label>
            <input type="text" placeholder="홍길동" className="blue-outline" />
          </div>

          {/* 비밀번호 입력창 */}
          <div className="input-group">
            <div className="label-row">
              <label>비밀번호</label>
              <img src={eyeIcon} alt="view" className="eye-label-icon" />
            </div>
            <div className="pw-wrapper">
              <input type="password" />
              {/* 무서운 눈 대신 형님의 PNG 적용 */}
              <img src={eyeIcon} alt="toggle view" className="eye-inside-img" />
            </div>
          </div>

          {/* 비밀번호 재입력창 */}
          <div className="input-group">
            <label>비밀번호 재입력</label>
            <div className="pw-wrapper">
              <input type="password" />
              <img src={eyeIcon} alt="toggle view" className="eye-inside-img" />
            </div>
          </div>

          <div className="agree-row">
            <label className="checkbox-container">
              <input type="checkbox" /> 
              <span className="checkmark"></span>
              동의
            </label>
          </div>

          {/* 완료 버튼 */}
          <button className="submit-btn" onClick={handleComplete}>완료</button>
        </div>

        <div className="setup-footer">
          <hr />
          <p className="footer-link">어쩌구저쩌구</p>
        </div>
      </div>

      {/* 오른쪽 광고 영역 */}
      <aside className="ad-sidebar right">
        <div className="ad-box box-3"></div>
        <div className="ad-box box-4"></div>
        <div className="ad-box box-5"></div>
      </aside>
    </div>
  );
};

export default UserSetup;