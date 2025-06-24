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
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: '#f7f7f7', padding: 32 }}>
      {/* 왼쪽: AI 대화창 */}
      <div style={{ width: 420, minHeight: 600, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.10)', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 32 }}>
        <h2 style={{ marginBottom: 24, fontWeight: 700, fontSize: 24, color: '#222' }}>AI 작업의뢰서 인터뷰</h2>
        <AIChatBox onQAListChange={handleQAList} />
      </div>
      {/* 오른쪽: Q&A 표 */}
      <div style={{ width: 520, minHeight: 600, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.10)', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', position: 'sticky', top: 32 }}>
        <h3 style={{ fontWeight: 700, fontSize: 22, color: '#222', marginBottom: 18 }}>AI Q&A 요약표</h3>
        <div style={{ width: '100%', overflowX: 'auto', marginBottom: 18 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: 8, border: '1px solid #eee' }}>질문</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>답변</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>AI 추천/의견</th>
              </tr>
            </thead>
            <tbody>
              {qaList.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: '#aaa', padding: 24 }}>아직 Q&A가 없습니다.</td></tr>
              ) : qaList.map((qa, i) => (
                <tr key={i}>
                  <td style={{ padding: 8, border: '1px solid #eee', background: '#f9fafb', verticalAlign: 'top' }}>{qa.question}</td>
                  <td style={{ padding: 8, border: '1px solid #eee', verticalAlign: 'top' }}>{qa.answer}</td>
                  <td style={{ padding: 8, border: '1px solid #eee', verticalAlign: 'top', color: '#1976d2' }}>{qa.aiComment || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={handleDownloadPDF} disabled={loading || qaList.length === 0} style={{ marginTop: 8, padding: '10px 28px', borderRadius: 8, background: '#111', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>PDF 다운로드</button>
        {pdfUrl && (
          <a href={pdfUrl} download="AI_QA_요약표.pdf" style={{ marginTop: 12, color: '#1976d2', fontSize: 15 }}>PDF 바로 저장</a>
        )}
        <button style={{ marginTop: 24, background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => navigate('/')}>홈으로</button>
      </div>
    </div>
  );
};

export default AIInterviewPage; 