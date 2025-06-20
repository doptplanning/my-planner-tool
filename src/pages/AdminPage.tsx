import React, { useState } from 'react';
// @ts-ignore: no types for html2pdf.js
import html2pdf from 'html2pdf.js/dist/html2pdf.min.js';

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

  const handleDownloadPDF = (email: string) => {
    const data = localStorage.getItem(`formData_${email}`);
    if (!data) {
      alert('해당 유저의 제출 완료된 작업의뢰서가 없습니다.');
      return;
    }
    const formData = JSON.parse(data);
    // PDF용 HTML 생성 (섹션별 표로 보기 좋게)
    const html = `
      <div style='font-family: sans-serif; padding: 24px; max-width: 800px;'>
        <h2 style='text-align:center; margin-bottom:24px;'>작업의뢰서</h2>
        <h3>1. 기본 정보</h3>
        <table border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse; width:100%; margin-bottom:16px;'>
          ${Object.entries(formData.upload || {}).map(([k,v]) => `<tr><td style='background:#f0f4fa;font-weight:600;'>${k}</td><td>${v}</td></tr>`).join('')}
        </table>
        <h3>2. 제품스펙</h3>
        <table border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse; width:100%; margin-bottom:16px;'>
          ${Object.entries(formData.productSpec || {}).map(([k,v]) => `<tr><td style='background:#f0f4fa;font-weight:600;'>${k}</td><td>${v}</td></tr>`).join('')}
        </table>
        <h3>3. 기획 의도</h3>
        <div style='margin-bottom:16px;'>${formData.plan || ''}</div>
        <h3>4. 주요 특장점 (USP)</h3>
        <table border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse; width:100%; margin-bottom:16px;'>
          <tr><th style='background:#f8eecb;'>No.</th><th style='background:#f8eecb;'>기능</th><th style='background:#f8eecb;'>설명</th></tr>
          ${(formData.usp || []).map((row: any, i: number) => `<tr><td style='text-align:center;'>${i+1}</td><td>${row.function}</td><td>${row.desc}</td></tr>`).join('')}
        </table>
        <h3>5. 디자인</h3>
        <table border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse; width:100%; margin-bottom:16px;'>
          ${(formData.design?.values || []).map((v: string, i: number) => `<tr><td style='background:#f0f4fa;font-weight:600;'>디자인 키워드${i+1}</td><td>${v}</td></tr>`).join('')}
        </table>
        <div style='margin-bottom:8px;'><b>링크:</b> ${(formData.design?.referenceLinks || []).join(', ')}</div>
        <h3>6. 촬영</h3>
        <table border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse; width:100%; margin-bottom:16px;'>
          <tr><td style='background:#f0f4fa;font-weight:600;'>연출컷 촬영 컨셉 방향</td><td>${formData.shooting?.concept || ''}</td></tr>
          <tr><td style='background:#f0f4fa;font-weight:600;'>촬영 참고 레퍼런스</td><td>${formData.shooting?.reference || ''}</td></tr>
        </table>
      </div>
    `;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    document.body.appendChild(tempDiv);
    html2pdf().from(tempDiv).set({ margin: 10, filename: `${email}_의뢰서.pdf`, html2canvas: { scale: 2 } }).save();
    document.body.removeChild(tempDiv);
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
            <th style={{ padding: 8, border: '1px solid #ccc' }}>의뢰서 PDF 다운로드</th>
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
              <td style={{ padding: 8, border: '1px solid #ccc' }}>
                <button style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid #aaa', background: '#f8f8f8', cursor: 'pointer' }} onClick={() => handleDownloadPDF(u.email)}>
                  의뢰서 PDF 다운로드
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 