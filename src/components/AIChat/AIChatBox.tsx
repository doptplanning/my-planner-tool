import React, { useState } from 'react';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface AIChatBoxProps {
  onAIResult?: (result: any) => void;
}

const AIChatBox: React.FC<AIChatBoxProps> = ({ onAIResult }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
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
      if (!res.ok) throw new Error(data.error || 'AI 응답 오류');
      setMessages(prev => [...prev, { role: 'ai', content: data.brief }]);
      setInput('');
      if (onAIResult) {
        // TODO: data에서 폼에 채울 수 있는 구조화된 정보가 있으면 전달
        onAIResult(data);
      }
    } catch (err: any) {
      setError(err.message || '서버 오류');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: 340, height: '80vh', background: '#f9f9f9', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', padding: 16 }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ margin: '8px 0', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
            <div style={{ display: 'inline-block', padding: '8px 12px', borderRadius: 8, background: msg.role === 'user' ? '#dbeafe' : '#fff', color: '#222', maxWidth: 260, wordBreak: 'break-word' }}>
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
          placeholder="AI에게 작업의뢰서 정보를 입력해보세요"
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #bbb', fontSize: 15 }}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} style={{ padding: '0 18px', borderRadius: 6, background: '#111', color: '#fff', border: 'none', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>전송</button>
      </div>
    </div>
  );
};

export default AIChatBox; 