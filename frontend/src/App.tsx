import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// 컴포넌트들 임포트
import Main from './pages/MainPage';       // 메인페이지 (비디오/광고 있는 거)
import Login from './pages/Login';     // 로그인페이지
import Signup from './pages/Signup';   // 회원가입페이지
import MailCode from './pages/Mailcode'; // 메일인증페이지
import UserSetup from './pages/UserSetup';

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. 기본 경로(/)를 메인페이지로 연결 (이게 빠졌던 겁니다) */}
        <Route path="/" element={<Main />} />
        
        {/* 2. 로그인 페이지 */}
        <Route path="/login" element={<Login />} />
        
        {/* 3. 회원가입 페이지 */}
        <Route path="/signup" element={<Signup />} />
        
        {/* 4. 메일 인증 페이지 */}
        <Route path="/mailcode" element={<MailCode />} />

        <Route path="/usersetup" element={<UserSetup />} /> {/* 이 줄 추가 */}
      </Routes>
    </Router>
  );
}

export default App;