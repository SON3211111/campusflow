import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendVerificationCode, verifyEmailCode } from '../api/auth';
import './Mailcode.css';
import logoImg from '../assets/Logo.png';

const CODE_LENGTH = 6;

const MailCode: React.FC = () => {
  const navigate = useNavigate();
  const email = localStorage.getItem('signupEmail') ?? '';
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!email) navigate('/signup');
  }, [email, navigate]);

  const updateDigits = (value: string, index: number) => {
    const numbers = value.replace(/\D/g, '').slice(0, CODE_LENGTH - index).split('');
    if (!numbers.length) {
      setDigits((current) => current.map((digit, position) => position === index ? '' : digit));
      return;
    }

    setDigits((current) => current.map((digit, position) =>
      position >= index && position < index + numbers.length ? numbers[position - index] : digit,
    ));
    inputRefs.current[Math.min(index + numbers.length, CODE_LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length !== CODE_LENGTH) {
      setMessage('이메일로 받은 6자리 인증 코드를 입력해 주세요.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await verifyEmailCode(email, code);
      navigate('/usersetup');
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? '인증 코드가 올바르지 않거나 만료되었습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setMessage('');
    try {
      await sendVerificationCode(email);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setMessage('새 인증 코드를 발송했습니다.');
    } catch (err: any) {
      setMessage(err.response?.data?.message ?? '이메일 발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mailcode-container">
      <aside className="ad-sidebar left" aria-hidden="true"><div className="ad-box box-1" /><div className="ad-box box-2" /></aside>
      <main className="mailcode-card">
        <div className="logo-wrapper"><img src={logoImg} alt="CampusFlow" className="mailcode-logo-img" /></div>
        <h2 className="mailcode-title">인증 코드를 입력해 주세요</h2>
        <p className="mailcode-desc">계정 설정을 계속하려면 이메일 인증이 필요합니다.</p>
        <p className="user-email">{email}</p>
        <div className="code-input-group">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => { inputRefs.current[index] = element; }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              className="code-box"
              value={digit}
              onChange={(event) => updateDigits(event.target.value, index)}
              onKeyDown={(event) => {
                if (event.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
                if (event.key === 'Enter') handleVerify();
              }}
              aria-label={`${index + 1}번째 인증 코드`}
            />
          ))}
        </div>
        {message && <p className="mailcode-message">{message}</p>}
        <button className="submit-btn" onClick={handleVerify} disabled={loading}>{loading ? '확인 중...' : '인증 완료'}</button>
        <div className="resend-wrapper"><button type="button" className="resend-link" onClick={handleResend} disabled={loading}>이메일 다시 보내기</button></div>
        <footer className="mailcode-footer"><hr className="footer-line" /><p className="footer-text">인증 코드는 10분 동안 유효합니다.</p></footer>
      </main>
      <aside className="ad-sidebar right" aria-hidden="true"><div className="ad-box box-3" /><div className="ad-box box-4" /><div className="ad-box box-5" /></aside>
    </div>
  );
};

export default MailCode;
