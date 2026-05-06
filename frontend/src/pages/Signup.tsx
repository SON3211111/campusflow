import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Signup.css';
import logoImg from '../assets/Logo.png';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = () => {
    setErrorMsg('');

    if (!email) {
      setErrorMsg('이메일을 입력해주세요.');
      return;
    }
    if (!agreed) {
      setErrorMsg('이용약관에 동의해주세요.');
      return;
    }

    localStorage.setItem('signupEmail', email);
    navigate('/usersetup');
  };

  return (
    <div className="signup-container">
      <aside className="ad-sidebar left">
        <div className="ad-box box-1"></div>
        <div className="ad-box box-2"></div>
      </aside>

      <div className="signup-card">
        <div className="logo-wrapper">
          <img src={logoImg} alt="C'flow" className="signup-logo-img" />
        </div>

        <p className="signup-subtitle">이메일로 가입하기</p>

        <div className="signup-form">
          <div className="input-group">
            <label>이메일</label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errorMsg === '이메일을 입력해주세요.' && <p className="error-msg">{errorMsg}</p>}
          </div>

          <div className="terms-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>이용약관 및 개인정보 처리방침에 동의합니다.</span>
            </label>
            {errorMsg === '이용약관에 동의해주세요.' && <p className="error-msg">{errorMsg}</p>}
          </div>

          <button className="submit-btn" onClick={handleSignup}>
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
          <span className="link-text" onClick={() => navigate('/login')}>
            로그인 페이지로 이동하기
          </span>
        </div>
      </div>

      <aside className="ad-sidebar right">
        <div className="ad-box box-3"></div>
        <div className="ad-box box-4"></div>
        <div className="ad-box box-5"></div>
      </aside>
    </div>
  );
};

export default Signup;
