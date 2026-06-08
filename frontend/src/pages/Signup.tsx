import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Mail, Sparkles, UsersRound, Zap } from "lucide-react";
import "./Signup.css";

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignup = () => {
    setErrorMsg("");

    if (!email) {
      setErrorMsg("이메일을 입력해 주세요.");
      return;
    }
    if (!agreed) {
      setErrorMsg("이용약관에 동의해 주세요.");
      return;
    }

    localStorage.setItem("signupEmail", email);
    navigate("/usersetup");
  };

  return (
    <div className="auth-page signup-auth-page">
      <section className="auth-visual signup-visual">
        <button className="auth-logo-button auth-logo-brand" onClick={() => navigate("/")} aria-label="C'FLOW 랜딩페이지로 이동">
          <span className="auth-logo-mark">C</span>
          <span className="auth-logo-text">C'FLOW</span>
        </button>
        <div className="auth-hero-copy">
          <p className="auth-eyebrow">
            <Sparkles size={15} />
            START YOUR FLOW
          </p>
          <h1>
            팀 과제를
            <span>시작부터</span>
            다르게
          </h1>
          <p>워크스페이스를 만들고 AI 업무 분해, 멤버 초대, 진행률 확인까지 이어가세요.</p>
        </div>
        <div className="signup-motion-stack">
          <div className="signup-flow-card primary">
            <Zap size={18} />
            AI가 업무를 쪼개요
          </div>
          <div className="signup-flow-card">
            <UsersRound size={18} />
            팀원을 초대해요
          </div>
          <div className="signup-flow-card">
            <CheckCircle2 size={18} />
            제출 전까지 추적해요
          </div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <div className="auth-card">
          <p className="auth-card-kicker">SIGN UP</p>
          <h2>이메일로 시작하기</h2>
          <p className="auth-card-desc">먼저 사용할 이메일을 입력하면 프로필 설정으로 이어집니다.</p>

          <div className="auth-form">
            <label className="auth-field">
              <span>이메일</span>
              <div className="auth-input-shell">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSignup();
                  }}
                />
              </div>
            </label>

            <label className="auth-check-row">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>이용약관 및 개인정보 처리방침에 동의합니다.</span>
            </label>

            {errorMsg && <p className="auth-error">{errorMsg}</p>}

            <button className="auth-submit" onClick={handleSignup}>
              다음 단계로
              <ArrowRight size={17} />
            </button>
          </div>

          <div className="auth-social">
            <span>간편 가입</span>
            <div>
              <button className="google">G</button>
              <button className="naver">N</button>
              <button className="microsoft">M</button>
            </div>
          </div>

          <div className="auth-footer-link">
            <span>이미 계정이 있나요?</span>
            <button onClick={() => navigate("/login")}>로그인하기</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Signup;
