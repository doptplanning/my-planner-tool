import React, { useState, useEffect } from 'react';

interface QAItem {
  question: string;
  answer: string;
  aiComment?: string;
}

interface AIChatBoxProps {
  onAIResult?: (result: any) => void;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  onQAListChange?: (qaList: QAItem[]) => void;
}

const greeting =
  '안녕하세요! DOPT 기획의 귀염둥이 기획자 디옵이에요.\n작업의뢰서에 필요한 정보를 자유롭게 말씀해 주세요!\n(예: 여러 항목을 한 번에 입력하거나, 궁금한 점을 물어보셔도 됩니다)';

const AIChatBox: React.FC<AIChatBoxProps> = ({ onAIResult, width = 340, height = '80vh', style, onQAListChange }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([{ role: 'ai', content: greeting }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string, raw?: string } | null>(null);
  const [qaList, setQaList] = useState<QAItem[]>([]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setLoading(true);
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://my-planner-tool.onrender.com';
      const res = await fetch(`${API_BASE}/api/gpt-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: messages.concat({ role: 'user', content: input }) }),
      });
      const data = await res.json();
      if (data.error) {
        setError({ message: data.error, raw: data.raw });
        throw new Error(data.error);
      }
      setError(null);
      let aiMsg = data.brief || JSON.stringify(data);
      setMessages(prev => [...prev, { role: 'ai', content: aiMsg }]);
      setInput('');
      if (onAIResult) onAIResult(data);
      setQaList(prev => [
        ...prev,
        {
          question: input,
          answer: aiMsg,
          aiComment: data.aiComment || (data.recommendation ?? undefined)
        }
      ]);
    } catch (err: any) {
      setError({ message: err.message || '서버 오류' });
    } finally {
      setLoading(false);
    }
  };

  // Q&A 표가 바뀔 때마다 부모에 전달
  useEffect(() => {
    if (onQAListChange) onQAListChange(qaList);
  }, [qaList, onQAListChange]);

  return (
    <div style={{ width, height, background: '#f9f9f9', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', padding: 16, ...style }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ margin: '8px 0', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
            <div style={{ display: 'inline-block', padding: '8px 12px', borderRadius: 8, background: msg.role === 'user' ? '#dbeafe' : '#fff', color: '#222', maxWidth: 260, wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ color: '#888', fontSize: 14 }}>AI가 답변 중...</div>}
        {error && (
          <div style={{ color: 'red', fontSize: 14 }}>
            {typeof error === 'object' ? (error.message || '에러') : error}
            {typeof error === 'object' && error.raw && (
              <pre style={{
                color: '#888',
                fontSize: 12,
                marginTop: 4,
                background: '#f3f3f3',
                padding: 8,
                borderRadius: 4,
                whiteSpace: 'pre-wrap'
              }}>
                {error.raw}
              </pre>
            )}
          </div>
        )}
      </div>
      {qaList.length > 0 && (
        <div style={{ margin: '16px 0', background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#222' }}>질문/답변 & AI 추천의견</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: 6, border: '1px solid #eee' }}>질문</th>
                <th style={{ padding: 6, border: '1px solid #eee' }}>답변</th>
                <th style={{ padding: 6, border: '1px solid #eee' }}>AI 추천/의견</th>
              </tr>
            </thead>
            <tbody>
              {qaList.map((qa, i) => (
                <tr key={i}>
                  <td style={{ padding: 6, border: '1px solid #eee', verticalAlign: 'top', background: '#f9fafb' }}>{qa.question}</td>
                  <td style={{ padding: 6, border: '1px solid #eee', verticalAlign: 'top' }}>{qa.answer}</td>
                  <td style={{ padding: 6, border: '1px solid #eee', verticalAlign: 'top', color: '#1976d2' }}>{qa.aiComment || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder="여기에 자유롭게 입력하세요"
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #bbb', fontSize: 15 }}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} style={{ padding: '0 18px', borderRadius: 6, background: '#111', color: '#fff', border: 'none', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>전송</button>
      </div>
    </div>
  );
};

export default AIChatBox; 