import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AIChatBox from '../components/AIChat/AIChatBox';

interface QAItem {
  question: string;
  answer: string;
  aiComment?: string;
}

const AIInterviewPage: React.FC = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [qaList, setQaList] = useState<QAItem[]>([]);
  const navigate = useNavigate();

  // AIChatBox에서 Q&A 표 데이터 받아오기
  const handleQAList = (list: QAItem[]) => setQaList(list);

  // PDF 다운로드 (선택적)
  const handleDownloadPDF = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://my-planner-tool.onrender.com';
      const res = await fetch(`${API_BASE}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(qaList),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch {
      alert('PDF 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7', padding: 32 }}>
      <div style={{ width: 700, minHeight: 600, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.10)', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ marginBottom: 24, fontWeight: 700, fontSize: 24, color: '#222' }}>AI 작업의뢰서 인터뷰</h2>
        <AIChatBox />
      </div>
    </div>
  );
};

export default AIInterviewPage; 