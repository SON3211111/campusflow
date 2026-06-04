import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import { login, signup } from "../api/auth";
import logoImg from "../assets/Logo.png";
import "./UserSetup.css";

const UserSetup: React.FC = () => {
  const navigate = useNavigate();
  const [email] = useState(localStorage.getItem("signupEmail") ?? "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate("/signup");
    }
  }, [email, navigate]);

  const handleComplete = async () => {
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("이름을 입력해 주세요.");
      return;
    }
    if (!password) {
      setErrorMsg("비밀번호를 입력해 주세요.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMsg("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      await signup({ email, password, name, role: "STUDENT" });
      localStorage.removeItem("signupEmail");

      const loginRes = await login({ email, password });
      const data = loginRes.data.data;
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("userId", String(data.userId));
      localStorage.setItem("userName", data.name);
      navigate("/workspace");
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 409) {
        setErrorMsg("이미 존재하는 이메일입니다.");
      } else {
        setErrorMsg("서버에 연결할 수 없습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleComplete();
  };

  return (
    <div className="auth-page setup-auth-page">
      <section className="auth-visual setup-visual">
        <button className="auth-logo-button" onClick={() => navigate("/")}>
          <img src={logoImg} alt="CampusFlow" />
        </button>
        <div className="auth-hero-copy">
          <p className="auth-eyebrow">
            <Sparkles size={15} />
            ALMOST THERE
          </p>
          <h1>
            마지막
            <span>프로필만</span>
            완성하면 돼요
          </h1>
          <p>이름과 비밀번호를 설정하면 바로 워크스페이스로 이동합니다.</p>
        </div>
        <div className="setup-motion-path">
          <div className="setup-step done">
            <span>01</span>
            이메일 확인
          </div>
          <div className="setup-step active">
            <span>02</span>
            프로필 설정
          </div>
          <div className="setup-step">
            <span>03</span>
            워크스페이스 입장
          </div>
        </div>
      </section>

      <section className="auth-panel-wrap">
        <div className="auth-card">
          <p className="auth-card-kicker">PROFILE SETUP</p>
          <h2>계정 정보 완성하기</h2>
          <p className="auth-card-desc">팀원에게 표시될 이름과 로그인 비밀번호를 설정하세요.</p>

          <div className="setup-email-pill">
            <Mail size={17} />
            <span>{email}</span>
          </div>

          <div className="auth-form">
            <label className="auth-field">
              <span>이름</span>
              <div className="auth-input-shell">
                <UserRound size={18} />
                <input
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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

            <label className="auth-field">
              <span>비밀번호 확인</span>
              <div className="auth-input-shell">
                <LockKeyhole size={18} />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="button"
                  className="auth-icon-button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {errorMsg && <p className="auth-error">{errorMsg}</p>}

            <button className="auth-submit" onClick={handleComplete} disabled={loading}>
              {loading ? "계정 생성 중..." : "완료하고 시작"}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UserSetup;
