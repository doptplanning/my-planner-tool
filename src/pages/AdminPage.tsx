import React, { useState } from 'react';

const roleLabels = {
  admin: '관리자',
  staff: '직원',
  client: '클라이언트',
};

export default function AdminPage() {
  const [users, setUsers] = useState(() => JSON.parse(localStorage.getItem('users') || '[]'));

  const handleRoleChange = (email: string, newRole: string) => {
    const updated = users.map((u: any) => u.email === email ? { ...u, role: newRole } : u);
    setUsers(updated);
    localStorage.setItem('users', JSON.stringify(updated));
  };

  return (
    <div style={{ padding: 32 }}>
      <h2>사용자 목록 및 권한 관리</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24 }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={{ padding: 8, border: '1px solid #ccc' }}>이메일</th>
            <th style={{ padding: 8, border: '1px solid #ccc' }}>권한</th>
            <th style={{ padding: 8, border: '1px solid #ccc' }}>권한 변경</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.email}>
              <td style={{ padding: 8, border: '1px solid #ccc' }}>{u.email}</td>
              <td style={{ padding: 8, border: '1px solid #ccc' }}>{roleLabels[u.role as 'admin' | 'staff' | 'client']}</td>
              <td style={{ padding: 8, border: '1px solid #ccc' }}>
                <select value={u.role} onChange={e => handleRoleChange(u.email, e.target.value)}>
                  <option value="admin">관리자</option>
                  <option value="staff">직원</option>
                  <option value="client">클라이언트</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 