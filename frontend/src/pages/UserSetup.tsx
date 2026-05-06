import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserSetup.css';
import logoImg from '../assets/Logo.png';
import eyeIcon from '../assets/icons-eye.png';

const UserSetup: React.FC = () => {
  const navigate = useNavigate();
  const [email] = useState(localStorage.getItem('signupEmail') ?? '');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    if (!agreed) {
      setErrorMsg('동의해주세요.');
      return;
    }

    try {
      const res = await fetch('http://localhost:8080/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role: 'STUDENT' }),
      });

      if (res.status === 409) {
        setErrorMsg('이미 존재하는 이메일입니다.');
        return;
      }

      if (res.ok) {
        localStorage.removeItem('signupEmail');
        navigate('/login');
      }
    } catch {
      setErrorMsg('서버에 연결할 수 없습니다.');
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
          <img src={logoImg} alt="C'flow" className="setup-logo-img" />
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
            <div className="label-row">
              <label>비밀번호</label>
              <img src={eyeIcon} alt="view" className="eye-label-icon" />
            </div>
            <div className="pw-wrapper">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <img src={eyeIcon} alt="toggle view" className="eye-inside-img" />
            </div>
          </div>

          <div className="input-group">
            <label>비밀번호 재입력</label>
            <div className="pw-wrapper">
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
              <img src={eyeIcon} alt="toggle view" className="eye-inside-img" />
            </div>
          </div>

          <div className="agree-row">
            <label className="checkbox-container">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span className="checkmark"></span>
              동의
            </label>
            {errorMsg && <p className="error-msg">{errorMsg}</p>}
          </div>

          <button className="submit-btn" onClick={handleComplete}>완료</button>
        </div>

        <div className="setup-footer">
          <hr />
          <p className="footer-link">어쩌구저쩌구</p>
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
