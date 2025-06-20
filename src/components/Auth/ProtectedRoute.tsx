import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { UserRole } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) {
    // 로그인하지 않은 경우 로그인 페이지로 이동
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // 권한이 부족한 경우 접근 불가 메시지
    return <div>접근 권한이 없습니다.</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 