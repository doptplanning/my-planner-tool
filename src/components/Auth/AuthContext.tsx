import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// 사용자 권한 타입 정의
export type UserRole = 'admin' | 'planner' | 'viewer';

// 사용자 정보 타입
interface User {
  email: string;
  role: UserRole;
}

// AuthContext 타입
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getRoleByEmail(email: string): UserRole {
  if (email === 'admin@dopt.com') return 'admin';
  if (email.endsWith('@dopt.com')) return 'planner';
  return 'viewer';
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작 시 localStorage에서 user 복원
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  // 로그인 함수: localStorage users에서 인증
  const login = async (email: string, password: string) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const found = users.find((u: any) => u.email === email && u.password === password);
    if (!found) throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    const role = getRoleByEmail(email);
    const userObj = { email, role };
    setUser(userObj);
    localStorage.setItem('user', JSON.stringify(userObj));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}; 