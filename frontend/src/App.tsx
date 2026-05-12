import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Main from './pages/MainPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MailCode from './pages/Mailcode';
import UserSetup from './pages/UserSetup';
import WorkspaceList from './ListPages/WorkspaceList';
import TaskBreakdownPage from './WorkspacePages/TaskBreakdownPage';
import AiTaskPage from './WorkspacePages/AiTaskPage';
import BoardPage from './ListPages/BoardPage';
import MemberPage from './ListPages/MemberPage';
import SettingPage from './ListPages/SettingPage';
import TemplatePage from './ListPages/TemplatePage';

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
        <Route path="/workspace" element={<PrivateRoute><WorkspaceList /></PrivateRoute>} />
        <Route path="/board" element={<PrivateRoute><BoardPage /></PrivateRoute>} />
        <Route path="/members" element={<PrivateRoute><MemberPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingPage /></PrivateRoute>} />
        <Route path="/templates" element={<PrivateRoute><TemplatePage /></PrivateRoute>} />
        <Route path="/task-breakdown" element={<PrivateRoute><TaskBreakdownPage /></PrivateRoute>} />
        <Route path="/ai-task" element={<PrivateRoute><AiTaskPage /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
