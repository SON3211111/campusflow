import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserSetup.css';
import logoImg from '../assets/Logo.png';
import eyeIcon from '../assets/icons-eye.png';
import { signup, login } from '../api/auth';

const UserSetup: React.FC = () => {
  const navigate = useNavigate();
  const [email] = useState(localStorage.getItem('signupEmail') ?? '');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);

  const handleComplete = async () => {
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('이름을 입력해주세요.');
      return;
    }
    if (!password) {
      setErrorMsg('비밀번호를 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMsg('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      await signup({ email, password, name, role: 'STUDENT' });
      localStorage.removeItem('signupEmail');

      // 가입 직후 자동 로그인
      const loginRes = await login({ email, password });
      const data = loginRes.data.data;
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('userId', String(data.userId));
      localStorage.setItem('userName', data.name);
      navigate('/workspace');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 409) {
        setErrorMsg('이미 존재하는 이메일입니다.');
      } else {
        setErrorMsg('서버에 연결할 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-container">
      <aside className="ad-sidebar left">
        <div className="ad-box box-1"></div>
        <div className="ad-box box-2"></div>
      </aside>

      <div className="setup-card">
        <div className="logo-wrapper">
          <img src={logoImg} alt="C'flow" className="setup-logo-img" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} />
        </div>

        <h2 className="setup-title">회원가입 유저 정보 기입</h2>

        <div className="info-display">
          <p className="label">이메일 주소</p>
          <p className="user-email-text">{email}</p>
        </div>

        <div className="setup-form">
          <div className="input-group">
            <label>유저 이름</label>
            <input
              type="text"
              placeholder="홍길동"
              className="blue-outline"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>비밀번호</label>
            <div className="pw-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <img
                src={eyeIcon}
                alt="toggle view"
                className="eye-inside-img"
                onClick={() => setShowPassword((v) => !v)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>

          <div className="input-group">
            <label>비밀번호 재입력</label>
            <div className="pw-wrapper">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
              <img
                src={eyeIcon}
                alt="toggle view"
                className="eye-inside-img"
                onClick={() => setShowConfirm((v) => !v)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>

          {errorMsg && <p className="error-msg">{errorMsg}</p>}

          <button className="submit-btn" onClick={handleComplete} disabled={loading}>
            {loading ? '처리 중...' : '완료'}
          </button>
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

export default UserSetup;
