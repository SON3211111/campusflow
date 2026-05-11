import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Main from './pages/MainPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MailCode from './pages/Mailcode';
import UserSetup from './pages/UserSetup';
import WorkspaceList from './ListPages/WorkspaceList';
import BoardPage from './ListPages/BoardPage';

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
      </Routes>
    </Router>
  );
}

export default App;
