import React from 'react';
import { useNavigate } from 'react-router-dom'; // 1. 이동 함수 임포트
import './Signup.css';
import logoImg from '../assets/Logo.png';

const Signup: React.FC = () => {
  const navigate = useNavigate(); // 2. navigate 객체 생성

  return (
    <div className="signup-container">
      {/* 왼쪽 광고 영역 */}
      <aside className="ad-sidebar left">
        <div className="ad-box box-1"></div>
        <div className="ad-box box-2"></div>
      </aside>

      {/* 중앙 회원가입 카드 */}
      <div className="signup-card">
        <div className="logo-wrapper">
          <img src={logoImg} alt="C’flow" className="signup-logo-img" />
        </div>
        
        <p className="signup-subtitle">이메일로 가입하기</p>

        <div className="signup-form">
          <div className="input-group">
            <label>이메일</label>
            <input type="email" placeholder="name@company.com" />
          </div>

          <div className="terms-container">
            <label className="checkbox-label">
              <input type="checkbox" /> 
              <span>이용약관 및 개인정보 처리방침에 동의합니다.</span>
            </label>
          </div>

          {/* 3. 버튼 클릭 시 Mailcode 페이지로 이동하도록 설정 */}
          <button 
            className="submit-btn" 
            onClick={() => navigate('/MailCode')} 
          >
            가입
          </button>
        </div>

        <div className="social-login">
          <p>간편 Sign up</p>
          <div className="social-icons">
            <button className="icon-google">G</button>
            <button className="icon-naver">N</button>
            <button className="icon-ms">M</button>
          </div>
        </div>

        <div className="signup-footer-links">
          <span 
            className="link-text"
            onClick={() => navigate('/login')}
          >
            로그인 페이지로 이동하기
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

export default Signup;