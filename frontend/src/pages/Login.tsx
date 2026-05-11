import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import eyeIcon from '../assets/icons-eye.png';
import logoImg from '../assets/Logo.png';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 404) {
        setErrorMsg('계정이 없습니다.');
        return;
      }
      if (res.status === 401) {
        setErrorMsg('비밀번호가 일치하지 않습니다.');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('userId', data.data.userId);
        localStorage.setItem('userName', data.data.name);
        navigate('/workspace');
      }
    } catch {
      setErrorMsg('서버에 연결할 수 없습니다.');
    }
  };

  return (
    <div className="login-container">
      <aside className="ad-sidebar left">
        <div className="ad-box box-1"></div>
        <div className="ad-box box-2"></div>
      </aside>

      <div className="login-card">
        <div className="logo-wrapper">
          <img src={logoImg} alt="C'flow" className="login-logo-img" />
        </div>

        <div className="login-form">
          <div className="input-group">
            <label>이메일</label>
            <input
              type="email"
              placeholder="hong@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errorMsg && <p className="error-msg">{errorMsg}</p>}
          </div>

          <div className="input-group">
            <label>비밀번호</label>
            <div className="pw-input-wrapper">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <img src={eyeIcon} className="pw-toggle-icon" alt="보기" />
            </div>
          </div>

          <div className="login-options">
            <label className="checkbox-container">
              <input type="checkbox" /> 내 정보 저장
            </label>
          </div>

          <button className="submit-btn" onClick={handleLogin}>완료</button>
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

      <aside className="ad-sidebar right">
        <div className="ad-box box-3"></div>
        <div className="ad-box box-4"></div>
        <div className="ad-box box-5"></div>
      </aside>
    </div>
  );
};

export default Login;
