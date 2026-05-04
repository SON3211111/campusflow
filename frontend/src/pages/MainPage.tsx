import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MainPage.css";
import stressImg from "../assets/stress.png";

// 언어 데이터를 원어와 병기하도록 수정
const languages = [
  { label: "한국어", native: "한국어" },
  { label: "영어", native: "English" },
  { label: "중국어", native: "中文" },
  { label: "일본어", native: "日本語" },
  { label: "러시아어", native: "Русский" },
  { label: "독일어", native: "Deutsch" },
];

const MainPage: React.FC = () => {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState("한국어");
  const navigate = useNavigate();

  return (
    <div className="main-page-wrapper">
      <header className="nav-bar">
        <div className="logo">CAMPUS_FLOW</div>
        <button className="login-btn" onClick={() => navigate("/login")}>
          로그인
        </button>
      </header>

      <main className="container">
        {/* 섹션 1: 비디오 및 메인 버튼 */}
        <section className="section">
          <div className="btn-group">
            <button
              className="main-btn login"
              onClick={() => navigate("/login")}
            >
              login
            </button>
            <button className="main-btn pro">PRO</button>
          </div>

          <div className="shadow-box video-area">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/JL1lpqMPFu0"
              title="CampusFlow Demo Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </section>

        {/* 섹션 2: 업무 분담 Stress */}
        <section className="section">
          <h1 className="section-title">업무 분담 Stress</h1>
          <div
            className="shadow-box stress-box"
            style={{ display: "flex", overflow: "hidden" }}
          >
            <div className="s-left">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="s-bar" />
              ))}
            </div>

            {/* 오른쪽 빨간 칸 전체를 이미지로 채움 */}
            <div className="s-right" style={{ padding: 0, overflow: "hidden" }}>
              <img
                src={stressImg}
                alt="Stress"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover", // 빈틈없이 꽉 채움
                  display: "block",
                }}
              />
            </div>
          </div>
        </section>

        {/* 섹션 3: 실시간 대시보드 */}
        <section className="section">
          <h1 className="section-title">실시간 대시보드</h1>
          <div className="shadow-box dash-box">
            <div className="dash-header">
              <div className="dash-dot"></div>
            </div>
          </div>
        </section>

        {/* 섹션 4: 시간 공유표 */}
        <section className="section">
          <h1 className="section-title">시간 공유표</h1>
          <div className="shadow-box time-area">
            <div className="t-sq"></div>
            <span className="t-arrow">→</span>
            <div className="t-sq"></div>
            <span className="t-arrow">→</span>
            <div className="t-sq"></div>
          </div>
        </section>

        <footer className="footer">
          <div className="logo">CAMPUS_FLOW</div>

          <div className="lang-select-area">
            {isLangMenuOpen && (
              <div className="lang-dropdown">
                {languages.map((lang) => (
                  <div
                    key={lang.label}
                    className="lang-item"
                    onClick={() => {
                      setSelectedLang(lang.native);
                      setIsLangMenuOpen(false);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={lang.native === selectedLang}
                      readOnly
                    />
                    <span className="lang-native">{lang.native}</span>
                    <span className="lang-label">({lang.label})</span>
                  </div>
                ))}
              </div>
            )}
            <button
              className="lang-btn"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            >
              <span>{isLangMenuOpen ? "∧" : "∨"}</span>
              <span>{selectedLang}</span>
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default MainPage;
