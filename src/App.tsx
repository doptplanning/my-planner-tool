import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import BriefEditPage from './pages/BriefEditPage';
import StructureEditPage from './pages/StructureEditPage';
import FigmaSyncPage from './pages/FigmaSyncPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HistoryPage from './pages/HistoryPage';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { useAuth } from './components/Auth/AuthContext';
import ProductSpecPage from './pages/ProductSpecPage';
import PlanPage from './pages/PlanPage';
import UspPage from './pages/UspPage';
import DesignPage from './pages/DesignPage';
import ShootingPage from './pages/ShootingPage';
import SummaryPage from './pages/SummaryPage';
import CompletePage from './pages/CompletePage';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // 로그인/회원가입 페이지에서는 네비게이션 숨김
  if (location.pathname === '/login' || location.pathname === '/register') return null;
  if (!user) return null;
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 60,
      background: 'rgba(17,17,17,0.98)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 100,
      borderBottom: '1px solid #222',
      padding: '0 32px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/upload')}>
        <img src="/dopt-logo.jpg" alt="D:opt Logo" style={{ height: 36, marginRight: 12 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ color: '#fff', marginRight: 16 }}>{user.email} ({user.role})</span>
        <button onClick={handleLogout} style={{ background: '#fff', color: '#111', border: 'none', borderRadius: 4, padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}>로그아웃</button>
      </div>
    </div>
  );
};

function AppRoutes() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: 60 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/upload" element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          } />
          <Route path="/brief-edit" element={
            <ProtectedRoute>
              <BriefEditPage />
            </ProtectedRoute>
          } />
          <Route path="/structure-edit" element={
            <ProtectedRoute>
              <StructureEditPage />
            </ProtectedRoute>
          } />
          <Route path="/figma-sync" element={
            <ProtectedRoute>
              <FigmaSyncPage />
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute requiredRole="planner">
              <HistoryPage />
            </ProtectedRoute>
          } />
          <Route path="/product-spec" element={
            <ProtectedRoute>
              <ProductSpecPage />
            </ProtectedRoute>
          } />
          <Route path="/plan" element={
            <ProtectedRoute>
              <PlanPage />
            </ProtectedRoute>
          } />
          <Route path="/usp" element={
            <ProtectedRoute>
              <UspPage />
            </ProtectedRoute>
          } />
          <Route path="/design" element={
            <ProtectedRoute>
              <DesignPage />
            </ProtectedRoute>
          } />
          <Route path="/shooting" element={
            <ProtectedRoute>
              <ShootingPage />
            </ProtectedRoute>
          } />
          <Route path="/summary" element={
            <ProtectedRoute>
              <SummaryPage />
            </ProtectedRoute>
          } />
          <Route path="/complete" element={
            <ProtectedRoute>
              <CompletePage />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
