import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { login } from "../api/auth";
import "./Login.css";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("accessToken")) {
      navigate("/workspace", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async () => {
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await login({ email, password });
      const data = res.data.data;
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("userId", String(data.userId));
      localStorage.setItem("userName", data.name);
      localStorage.setItem("role", String(data.role));
      navigate("/workspace");
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404) {
        setErrorMsg("존재하지 않는 계정입니다.");
      } else if (status === 401) {
        setErrorMsg("비밀번호가 일치하지 않습니다.");
      } else if (status === 403) {
        setErrorMsg("비활성화된 계정입니다. 관리자에게 문의하세요.");
      } else {
        setErrorMsg("서버에 연결할 수 없습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="auth-page login-auth-page">
      <section className="auth-visual">
        <button className="auth-logo-button auth-logo-brand" onClick={() => navigate("/")} aria-label="C'FLOW 랜딩페이지로 이동">
          <span className="auth-logo-mark">C</span>
          <span className="auth-logo-text">C'FLOW</span>
        </button>
        <div className="auth-hero-copy">
          <p className="auth-eyebrow">
            <Sparkles size={15} />
            WELCOME BACK
          </p>
          <h1>
            다시
            <span>팀플을</span>
            굴려볼까요
          </h1>
          <p>진행 중인 보드, 팀 멤버, AI 업무 분해 흐름으로 바로 돌아갑니다.</p>
        </div>
        <div className="auth-motion-board">
          <div className="auth-orbit orbit-a" />
          <div className="auth-orbit orbit-b" />
          <div className="auth-center-stat">
            <strong>72%</strong>
            <span>진행 중</span>
          </div>
          <div className="auth-floating-chip chip-one">AI 업무 4개 생성</div>
          <div className="auth-floating-chip chip-two">마감 3일 전</div>
          <div className="auth-floating-chip chip-three">5 members</div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <div className="auth-card">
          <p className="auth-card-kicker">LOGIN</p>
          <h2>워크스페이스로 돌아가기</h2>
          <p className="auth-card-desc">이메일과 비밀번호를 입력해 팀 보드에 접속하세요.</p>

          <div className="auth-form">
            <label className="auth-field">
              <span>이메일</span>
              <div className="auth-input-shell">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="hong@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </label>

            <label className="auth-field">
              <span>비밀번호</span>
              <div className="auth-input-shell">
                <LockKeyhole size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="button"
                  className="auth-icon-button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {errorMsg && <p className="auth-error">{errorMsg}</p>}

            <button className="auth-submit" onClick={handleLogin} disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
              <ArrowRight size={17} />
            </button>
          </div>

          <div className="auth-social">
            <span>간편 로그인</span>
            <div>
              <button className="google">G</button>
              <button className="naver">N</button>
              <button className="microsoft">M</button>
            </div>
          </div>

          <div className="auth-footer-link">
            <span>아직 계정이 없나요?</span>
            <button onClick={() => navigate("/signup")}>계정 만들기</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;
