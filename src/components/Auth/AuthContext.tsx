import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// 사용자 권한 타입 정의
export type UserRole = 'admin' | 'staff' | 'client' | 'planner' | 'viewer';

// 사용자 정보 타입
interface User {
  email: string;
  password?: string;
  role: UserRole;
  token?: string;
}

// AuthContext 타입
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  // 로그인 함수: 백엔드 API에서 인증
  const login = async (email: string, password: string) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'https://my-planner-tool.onrender.com';
    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '로그인 실패');
    const userObj = { email: data.email, role: data.role, token: data.token };
    setUser(userObj);
    localStorage.setItem('user', JSON.stringify(userObj));
    localStorage.setItem('token', data.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
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