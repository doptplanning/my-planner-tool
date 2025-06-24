import React, { useState } from 'react';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface AIChatBoxProps {
  onAIResult?: (result: any) => void;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
}

const greeting =
  '안녕하세요! DOPT 기획의 귀염둥이 기획자 디옵이에요.\n작업의뢰서에 필요한 정보를 자유롭게 말씀해 주세요!\n(예: 여러 항목을 한 번에 입력하거나, 궁금한 점을 물어보셔도 됩니다)';

const AIChatBox: React.FC<AIChatBoxProps> = ({ onAIResult, width = 340, height = '80vh', style }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([{ role: 'ai', content: greeting }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setLoading(true);
    setError('');
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://my-planner-tool.onrender.com';
      const res = await fetch(`${API_BASE}/api/gpt-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: input }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // AI가 자유롭게 답변/분류/정리/추가 질문
      setMessages(prev => [...prev, { role: 'ai', content: data.brief || JSON.stringify(data) }]);
      setInput('');
      if (onAIResult) onAIResult(data);
    } catch (err: any) {
      setError(err.message || '서버 오류');
    } finally {
      setLoading(false);
    }
  };

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
        {error && <div style={{ color: 'red', fontSize: 14 }}>{error}</div>}
      </div>
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