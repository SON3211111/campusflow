import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import eyeIcon from '../assets/icons-eye.png';
import logoImg from '../assets/Logo.png'; 

const Login: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="login-container">
      {/* 왼쪽 광고 영역 */}
      <aside className="ad-sidebar left">
        <div className="ad-box box-1"></div>
        <div className="ad-box box-2"></div>
      </aside>

      {/* 중앙 로그인 카드 */}
      <div className="login-card">
        {/* ★ 로고 부분: h1 대신 이미지로 교체 */}
        <div className="logo-wrapper">
          <img src={logoImg} alt="C’flow" className="login-logo-img" />
        </div>
        
        <div className="login-form">
          <div className="input-group">
            <label>이메일</label>
            <input type="email" placeholder="hong@gmail.com" />
          </div>

          <div className="input-group">
            <label>비밀번호</label>
            <div className="pw-input-wrapper">
              <input type="password" />
              <img src={eyeIcon} className="pw-toggle-icon" alt="보기" />
            </div>
          </div>

          <div className="login-options">
            <label className="checkbox-container">
              <input type="checkbox" /> 내 정보 저장
            </label>
          </div>

          <button className="submit-btn" onClick={() => navigate('/workspace')}>완료</button>
        </div>

        <div className="social-login">
          <p>간편 로그인</p>
          <div className="social-icons">
            <button className="icon-google" style={{ backgroundColor: '#EA4335' }}>G</button>
            <button className="icon-naver" style={{ backgroundColor: '#03C75A' }}>N</button>
            <button className="icon-ms" style={{ backgroundColor: '#00A4EF' }}>M</button>
          </div>
        </div>

        <div className="login-footer-links">
          <span>비밀번호가 생각나지 않으세요?</span>
          <span 
            style={{ cursor: 'pointer', textDecoration: 'underline' }} 
            onClick={() => navigate('/signup')}
          >
            계정 새로 만들기
          </span>
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

export default Login;