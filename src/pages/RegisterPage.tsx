import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function saveUser(email: string, password: string) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  users.push({ email, password });
  localStorage.setItem('users', JSON.stringify(users));
}

function isEmailExists(email: string) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  return users.some((u: any) => u.email === email);
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password || !password2) {
      setError('모든 항목을 입력해 주세요.');
      return;
    }
    if (password !== password2) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (isEmailExists(email)) {
      setError('이미 가입된 이메일입니다.');
      return;
    }
    saveUser(email, password);
    setSuccess(true);
    setTimeout(() => navigate('/login'), 1200);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      zIndex: 10
    }}>
      <div style={{ width: 400, maxWidth: '95vw', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 32 }}>
        <h2 style={{ marginBottom: 24, textAlign: 'center' }}>회원가입</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label>이메일</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 4 }} />
          </div>
          <div>
            <label>비밀번호</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 4 }} />
          </div>
          <div>
            <label>비밀번호 확인</label>
            <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} required style={{ width: '100%', padding: 8, marginTop: 4 }} />
          </div>
          {error && <div style={{ color: 'red', marginBottom: 4 }}>{error}</div>}
          {success && <div style={{ color: 'green', marginBottom: 4 }}>회원가입 완료! 로그인 페이지로 이동합니다.</div>}
          <button type="submit" style={{ width: '100%', padding: 10, fontSize: 16 }}>회원가입</button>
        </form>
        <button onClick={() => navigate('/login')} style={{ width: '100%', marginTop: 16, background: 'none', border: 'none', color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}>
          로그인 페이지로 돌아가기
        </button>
      </div>
    </div>
  );
} 