// 앱 전체 라우팅 설정
// PrivateRoute: accessToken 없으면 /login으로 리다이렉트
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Main from './pages/MainPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MailCode from './pages/Mailcode';
import UserSetup from './pages/UserSetup';
import ProfileSettings from './pages/ProfileSettings';
import WorkspaceList from './ListPages/WorkspaceList';
import TaskBreakdownPage from './WorkspacePages/TaskBreakdownPage';
import AiTaskPage from './WorkspacePages/AiTaskPage';
import WorkSpacePage from './WorkspacePages/WorkSpacePage';
import DashboardPage from './WorkspacePages/DashboardPage';
import NotificationPage from './WorkspacePages/NotificationPage';
import BoardPage from './ListPages/BoardPage';
import MemberPage from './ListPages/MemberPage';
import SettingPage from './ListPages/SettingPage';
import TemplatePage from './ListPages/TemplatePage';
import JoinPage from './ListPages/JoinPage';
import CalendarPage from './WorkspacePages/CalendarPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/mailcode" element={<MailCode />} />
        <Route path="/usersetup" element={<UserSetup />} />
        <Route path="/profile-settings" element={<PrivateRoute><ProfileSettings /></PrivateRoute>} />
        <Route path="/workspace" element={<PrivateRoute><WorkspaceList /></PrivateRoute>} />
        <Route path="/board" element={<PrivateRoute><BoardPage /></PrivateRoute>} />
        <Route path="/members" element={<PrivateRoute><MemberPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingPage /></PrivateRoute>} />
        <Route path="/templates" element={<PrivateRoute><TemplatePage /></PrivateRoute>} />
        <Route path="/task-breakdown" element={<PrivateRoute><TaskBreakdownPage /></PrivateRoute>} />
        <Route path="/ai-task" element={<PrivateRoute><AiTaskPage /></PrivateRoute>} />
        <Route path="/workspace-board" element={<PrivateRoute><WorkSpacePage /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><NotificationPage /></PrivateRoute>} />
        <Route path="/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
        <Route path="/join" element={<PrivateRoute><JoinPage /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
