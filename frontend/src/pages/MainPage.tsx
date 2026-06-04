import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Globe2,
  MessageSquareText,
  Sparkles,
  UsersRound,
  Zap,
} from "lucide-react";
import Header from "../components/Header";
import stressImg from "../assets/stress.png";
import "./MainPage.css";

const languages = [
  { label: "Korean", native: "한국어" },
  { label: "English", native: "English" },
  { label: "Chinese", native: "中文" },
  { label: "Japanese", native: "日本語" },
  { label: "Russian", native: "Русский" },
  { label: "German", native: "Deutsch" },
];

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("accessToken");
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState("한국어");

  const goStart = () => navigate(isLoggedIn ? "/workspace" : "/login");

  return (
    <div className="main-page-wrapper">
      <Header showSearch={false} />

      <main className="main-container">
        <section className="main-hero">
          <div className="hero-copy">
            <p className="main-eyebrow">
              <Sparkles size={15} />
              TEAM PROJECT CONTROL ROOM
            </p>
            <h1>
              팀플이
              <span>굴러가기</span>
              시작합니다
            </h1>
            <p className="hero-desc">
              과제 목표를 넣으면 AI가 업무를 쪼개고, 팀은 보드에서 바로 움직입니다.
            </p>
            <div className="main-hero-actions">
              <button className="main-primary-btn" onClick={goStart}>
                {isLoggedIn ? "워크스페이스 열기" : "바로 시작하기"}
                <ArrowRight size={17} />
              </button>
              <button className="main-secondary-btn" onClick={() => navigate("/signup")}>
                계정 만들기
              </button>
            </div>
          </div>

          <div className="hero-motion-stage" aria-label="CampusFlow animated preview">
            <div className="motion-orbit orbit-one" />
            <div className="motion-orbit orbit-two" />
            <div className="motion-center">
              <span>CampusFlow</span>
              <strong>72%</strong>
              <p>캡스톤 프로젝트 진행률</p>
            </div>
            <div className="motion-bubble bubble-ai">
              <Zap size={16} />
              AI 업무 분해
            </div>
            <div className="motion-bubble bubble-member">
              <UsersRound size={16} />
              5 members
            </div>
            <div className="motion-bubble bubble-done">
              <CheckCircle2 size={16} />
              15 done
            </div>
          </div>
        </section>

        <section className="kinetic-strip" aria-label="CampusFlow highlights">
          <div className="kinetic-track">
            <span>AI TASK SPLIT</span>
            <span>LIVE BOARD</span>
            <span>MEMBER FLOW</span>
            <span>DASHBOARD</span>
            <span>DEADLINE CHECK</span>
            <span>AI TASK SPLIT</span>
            <span>LIVE BOARD</span>
          </div>
        </section>

        <section className="stress-story-section">
          <div className="stress-giant-copy">
            <p className="main-eyebrow">LESS PROJECT STRESS</p>
            <h2>
              흩어진 할 일을
              <span>한 번에</span>
              잡아줍니다
            </h2>
          </div>
          <div className="stress-visual">
            <img src={stressImg} alt="Project stress visualization" />
            <div className="stress-float stress-float-one">마감 3일 전</div>
            <div className="stress-float stress-float-two">담당자 미정</div>
            <div className="stress-float stress-float-three">회의록 정리</div>
          </div>
        </section>

        <section className="task-wave-section">
          <div className="main-section-heading wide">
            <p className="main-eyebrow">PROJECT FLOW</p>
            <h2>목표가 업무로, 업무가 진행률로 바뀌는 순간</h2>
          </div>
          <div className="task-wave">
            <div className="wave-lane lane-one">
              <span>자료 조사</span>
              <span>와이어프레임</span>
              <span>API 연결</span>
              <span>발표 초안</span>
            </div>
            <div className="wave-lane lane-two">
              <span>Todo</span>
              <span>Doing</span>
              <span>Review</span>
              <span>Done</span>
            </div>
            <div className="wave-lane lane-three">
              <span>민지</span>
              <span>현우</span>
              <span>서연</span>
              <span>준호</span>
            </div>
          </div>
        </section>

        <section className="ai-burst-section">
          <div className="ai-prompt-block">
            <p>이번 주까지 서비스 기획서, 화면 설계, 발표 자료를 끝내야 해</p>
            <button onClick={goStart}>
              AI로 쪼개기
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="ai-result-stack">
            <div><ClipboardList size={18} />기획서 목차 정리</div>
            <div><MessageSquareText size={18} />회의 액션아이템 추출</div>
            <div><BarChart3 size={18} />진행률 대시보드 반영</div>
            <div><CheckCircle2 size={18} />제출 전 체크리스트</div>
          </div>
        </section>

        <section className="feature-rhythm-section">
          <div className="rhythm-line">
            <span>01</span>
            <strong>보드는 가볍게</strong>
            <p>팀 업무를 Todo, Doing, Done 흐름으로 바로 옮깁니다.</p>
          </div>
          <div className="rhythm-line">
            <span>02</span>
            <strong>멤버는 선명하게</strong>
            <p>누가 무엇을 맡았는지, 어디서 막혔는지 빠르게 확인합니다.</p>
          </div>
          <div className="rhythm-line">
            <span>03</span>
            <strong>마감은 놓치지 않게</strong>
            <p>진행률과 알림을 이어 붙여 마지막 순간의 혼선을 줄입니다.</p>
          </div>
        </section>

        <section className="main-cta-panel">
          <div>
            <p className="main-eyebrow">READY TO MOVE</p>
            <h2>다음 팀 과제는 여기서 굴려보세요</h2>
            <p>큰 목표를 작게 나누고, 팀이 바로 실행할 수 있는 흐름으로 바꿉니다.</p>
          </div>
          <button className="main-primary-btn" onClick={goStart}>
            {isLoggedIn ? "내 보드 보기" : "무료로 시작"}
            <ArrowRight size={17} />
          </button>
        </section>

        <footer className="main-footer">
          <div className="main-footer-brand">CAMPUS_FLOW</div>
          <div className="lang-select-area">
            {isLangMenuOpen && (
              <div className="lang-dropdown">
                {languages.map((lang) => (
                  <button
                    key={lang.label}
                    className={`lang-item ${lang.native === selectedLang ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedLang(lang.native);
                      setIsLangMenuOpen(false);
                    }}
                  >
                    <span className="lang-native">{lang.native}</span>
                    <span className="lang-label">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              className="lang-btn"
              onClick={() => setIsLangMenuOpen((open) => !open)}
            >
              <Globe2 size={16} />
              <span>{selectedLang}</span>
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default MainPage;
