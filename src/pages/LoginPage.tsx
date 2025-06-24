import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/Auth/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/ai-interview');
    } catch (err: any) {
      setError(err.message || '로그인 실패');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#111',
      zIndex: 10
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="/dopt-logo.jpg" alt="D:opt Logo" style={{ width: 120, marginBottom: 32 }} />
        <div style={{ maxWidth: 400, width: '100%', background: '#fff', color: '#111', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.18)', padding: 36 }}>
          <h2 style={{ marginBottom: 24, textAlign: 'center', color: '#111' }}>로그인</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ color: '#111' }}>이메일</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: 10, marginTop: 4, borderRadius: 4, border: '1px solid #ccc', background: '#fff', color: '#111' }} />
            </div>
            <div>
              <label style={{ color: '#111' }}>비밀번호</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: 10, marginTop: 4, borderRadius: 4, border: '1px solid #ccc', background: '#fff', color: '#111' }} />
            </div>
            {error && <div style={{ color: 'red', marginBottom: 4 }}>{error}</div>}
            <button type="submit" style={{ width: '100%', padding: 12, fontSize: 16, background: '#111', color: '#fff', border: 'none', borderRadius: 4, marginTop: 8, cursor: 'pointer' }}>로그인</button>
          </form>
          <button
            onClick={() => navigate('/register')}
            style={{
              width: '100%',
              padding: 12,
              fontSize: 16,
              marginTop: 12,
              background: '#fff',
              color: '#111',
              border: '1px solid #111',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
} 