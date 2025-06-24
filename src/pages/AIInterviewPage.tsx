import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AIChatBox from '../components/AIChat/AIChatBox';

const AIInterviewPage: React.FC = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // AI 대화 종료 후 PDF 생성 요청
  const handleAIResult = async (data: any) => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://my-planner-tool.onrender.com';
      const res = await fetch(`${API_BASE}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const blob = await res.blob();
      setPdfUrl(URL.createObjectURL(blob));
    } catch {
      alert('PDF 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7' }}>
      <div style={{ width: 420, minHeight: 600, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.10)', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ marginBottom: 24, fontWeight: 700, fontSize: 24, color: '#222' }}>AI 작업의뢰서 인터뷰</h2>
        <AIChatBox onAIResult={handleAIResult} />
        {loading && <div style={{ marginTop: 24, color: '#888' }}>PDF 생성 중...</div>}
        {pdfUrl && (
          <a href={pdfUrl} download="작업의뢰서.pdf" style={{ marginTop: 24, padding: '12px 32px', background: '#111', color: '#fff', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 18 }}>PDF 다운로드</a>
        )}
        <button style={{ marginTop: 16, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => navigate('/')}>홈으로</button>
      </div>
    </div>
  );
};

export default AIInterviewPage; 