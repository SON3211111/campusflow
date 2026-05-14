/**
 * 로그인 페이지
 * 이메일/비밀번호 입력 → JWT accessToken 발급 → localStorage 저장 후 워크스페이스로 이동
 * 이미 로그인된 상태면 자동으로 /workspace 리다이렉트
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import eyeIcon from '../assets/icons-eye.png';
import logoImg from '../assets/Logo.png';
import { login } from '../api/auth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      navigate('/workspace', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async () => {
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await login({ email, password });
      const data = res.data.data;
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('userId', String(data.userId));
      localStorage.setItem('userName', data.name);
      navigate('/workspace');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404) {
        setErrorMsg('존재하지 않는 계정입니다.');
      } else if (status === 401) {
        setErrorMsg('비밀번호가 일치하지 않습니다.');
      } else if (status === 403) {
        setErrorMsg('비활성화된 계정입니다. 관리자에게 문의하세요.');
      } else {
        setErrorMsg('서버에 연결할 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="login-container">
      <aside className="ad-sidebar left">
        <div className="ad-box box-1"></div>
        <div className="ad-box box-2"></div>
      </aside>

      <div className="login-card">
        <div className="logo-wrapper">
          <img src={logoImg} alt="C'flow" className="login-logo-img" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} />
        </div>

        <div className="login-form">
          <div className="input-group">
            <label>이메일</label>
            <input
              type="email"
              placeholder="hong@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="input-group">
            <label>비밀번호</label>
            <div className="pw-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <img
                src={eyeIcon}
                className="pw-toggle-icon"
                alt="보기"
                onClick={() => setShowPassword((v) => !v)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>

          {errorMsg && <p className="error-msg">{errorMsg}</p>}

          <button className="submit-btn" onClick={handleLogin} disabled={loading}>
            {loading ? '로그인 중...' : '완료'}
          </button>
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
