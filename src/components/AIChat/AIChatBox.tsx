import React, { useState } from 'react';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface AIChatBoxProps {
  onAIResult?: (result: any) => void;
}

const questionList = [
  {
    key: 'sizeWidth',
    question: '1. 상세페이지 사이즈는 어떻게 되나요? (예: 가로 860픽셀 등)'
  },
  {
    key: 'sizeSites',
    question: '2. 노출 사이트는 어디인가요? (예: 네이버 스마트스토어, 쿠팡 등)'
  },
  {
    key: 'product',
    question: '3. 제품명/모델명/구성은 어떻게 되나요? (예: ○○○보풀제거기 / XES1098 / 본품, C타입 충전선, 청소솔, 해파필터)'
  },
  {
    key: 'target',
    question: '4. 주요 타겟은 누구인가요? (예: 2030 MZ세대, 남성층 등)'
  },
  {
    key: 'price',
    question: '5. 제품 가격은 얼마인가요? (예: 39,000원)'
  },
];

const greeting =
  '안녕하세요! DOPT 기획의 귀염둥이 기획자 디옵이에요.\n제가 질문하는 걸 순차적으로 작성해주시면 작업의뢰서가 모두 완료가 된답니다. 자, 시작합니다!';

const AIChatBox: React.FC<AIChatBoxProps> = ({ onAIResult }) => {
  const [messages, setMessages] = useState<Message[]>([{ role: 'ai', content: greeting }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});

  const askNext = (nextStep: number) => {
    if (nextStep < questionList.length) {
      setMessages(prev => [...prev, { role: 'ai', content: questionList[nextStep].question }]);
      setStep(nextStep);
    } else {
      // 모든 답변이 끝나면 AI에게 전체 답변을 정리 요청
      handleAIRefine();
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const currentKey = questionList[step]?.key;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setAnswers(prev => ({ ...prev, [currentKey]: input }));
    setInput('');
    askNext(step + 1);
  };

  // AI에게 전체 답변을 정리 요청
  const handleAIRefine = async () => {
    setLoading(true);
    setMessages(prev => [...prev, { role: 'ai', content: '입력해주셔서 감사합니다! 입력하신 내용을 바탕으로 작업의뢰서를 정리 중입니다...' }]);
    setError('');
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://my-planner-tool.onrender.com';
      const res = await fetch(`${API_BASE}/api/gpt-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...answers, summary: Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('\n') }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'ai', content: '작업의뢰서가 아래와 같이 정리되었습니다!' }]);
      // 각 항목별로 입력란에 자동 반영
      if (onAIResult) onAIResult(data);
    } catch (err: any) {
      setError(err.message || '서버 오류');
    } finally {
      setLoading(false);
    }
  };

  // 첫 질문 자동 시작
  React.useEffect(() => {
    if (step === 0 && messages.length === 1) {
      askNext(0);
    }
    // eslint-disable-next-line
  }, []);

  return (
    <div style={{ width: 340, height: '80vh', background: '#f9f9f9', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', padding: 16 }}>
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
          placeholder={step < questionList.length ? '여기에 답변을 입력하세요' : '모든 답변이 완료되었습니다'}
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #bbb', fontSize: 15 }}
          disabled={loading || step >= questionList.length}
        />
        <button onClick={handleSend} disabled={loading || !input.trim() || step >= questionList.length} style={{ padding: '0 18px', borderRadius: 6, background: '#111', color: '#fff', border: 'none', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>전송</button>
      </div>
    </div>
  );
};

export default AIChatBox; 