import React, { useState, useEffect, useRef } from 'react';
import FileUploader from '../FileUploader/FileUploader';

interface QAItem {
  question: string;
  answer: string;
  aiComment?: string;
}

interface AIChatBoxProps {
  onAIResult?: (result: any) => void;
  height?: number | string;
  style?: React.CSSProperties;
  onQAListChange?: (qaList: QAItem[]) => void;
}

const greeting =
  '안녕하세요! DOPT 기획의 귀염둥이 기획자 디옵이에요! 작업의뢰서 작성을 도와드릴꺼에요 :)\n먼저 제품명이 모에요?';

const AIChatBox: React.FC<AIChatBoxProps> = ({ onAIResult, height = '80vh', style, onQAListChange }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([{ role: 'ai', content: greeting }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [qaList, setQaList] = useState<QAItem[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || loading) return;
    if (input.trim()) setMessages(prev => [...prev, { role: 'user', content: input }]);
    if (uploadedFiles.length > 0) setMessages(prev => [...prev, { role: 'user', content: `[이미지 ${uploadedFiles.length}개 업로드]` }]);
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://my-planner-tool.onrender.com';
      let images: string[] = [];
      if (uploadedFiles.length > 0) {
        images = await Promise.all(uploadedFiles.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }));
      }
      const res = await fetch(`${API_BASE}/api/gpt-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: messages.concat(input.trim() ? { role: 'user', content: input } : []), images }),
      });
      const data = await res.json();
      if (data.error) {
        let aiMsg = data.raw || JSON.stringify(data);
        setMessages(prev => [...prev, { role: 'ai', content: aiMsg }]);
        setInput('');
        setUploadedFiles([]);
        return;
      }
      let aiMsg = data.brief || JSON.stringify(data);
      setMessages(prev => [...prev, { role: 'ai', content: aiMsg }]);
      setInput('');
      setUploadedFiles([]);
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
      let aiMsg = err.message || '서버 오류';
      setMessages(prev => [...prev, { role: 'ai', content: aiMsg }]);
      setInput('');
      setUploadedFiles([]);
    } finally {
      setLoading(false);
      setTimeout(() => { inputRef.current?.focus(); }, 100);
    }
  };

  useEffect(() => {
    if (onQAListChange) onQAListChange(qaList);
  }, [qaList, onQAListChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div style={{ width: 680, height, background: '#fff', borderRadius: 18, boxShadow: '0 2px 16px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', padding: 24, ...style }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
        {messages.map((msg, i) => {
          // HTML table 감지
          const isTable = /<table[\s\S]*<\/table>/.test(msg.content);
          return (
            <div key={i} style={{ margin: '12px 0', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
              {isTable ? (
                <div className="markdown-brief" dangerouslySetInnerHTML={{ __html: msg.content }} />
              ) : (
                <div style={{ display: 'inline-block', padding: '12px 18px', borderRadius: 16, background: msg.role === 'user' ? '#e3f0ff' : '#f6f6f6', color: '#222', maxWidth: 520, wordBreak: 'break-word', whiteSpace: 'pre-line', fontSize: 17, boxShadow: msg.role === 'user' ? '0 1px 4px #b6d4fe33' : '0 1px 4px #eee' }}>
                  {msg.content}
                </div>
              )}
            </div>
          );
        })}
        {loading && <div style={{ color: '#888', fontSize: 15 }}>AI가 답변 중...</div>}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); }}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder="궁금한 점이나 정보를 입력하세요"
          style={{ flex: 1, padding: '16px 22px', borderRadius: 32, border: '1.5px solid #bbb', fontSize: 18, boxShadow: '0 2px 8px #e3e3e3', outline: 'none', background: '#fafbfc', transition: 'border 0.2s', minWidth: 0 }}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || (!input.trim() && uploadedFiles.length === 0)} style={{ padding: '0 28px', borderRadius: 32, background: '#1976d2', color: '#fff', border: 'none', fontWeight: 600, fontSize: 18, cursor: 'pointer', height: 48 }}>전송</button>
        <FileUploader files={uploadedFiles} onFileSelect={setUploadedFiles} simple />
      </div>
    </div>
  );
};

export default AIChatBox; 