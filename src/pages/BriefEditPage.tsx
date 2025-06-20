import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAutoSave } from '../hooks/useAutoSave';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function saveBriefHistory(brief: string) {
  const history = JSON.parse(localStorage.getItem('briefHistory') || '[]');
  const newItem = {
    id: Date.now().toString(),
    type: 'brief',
    title: `브리프 저장본 (${new Date().toLocaleString()})`,
    date: new Date().toLocaleString(),
    content: brief,
  };
  localStorage.setItem('briefHistory', JSON.stringify([newItem, ...history]));
}

const AUTO_SAVE_KEY = 'briefAutoSave';

export default function BriefEditPage() {
  const query = useQuery();
  const initialBrief = query.get('brief') || '';
  const [brief, setBrief] = useState(initialBrief);
  const [showRestore, setShowRestore] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  // 자동 저장 적용
  useAutoSave(brief, (val) => {
    localStorage.setItem(AUTO_SAVE_KEY, val);
  });

  // 임시 저장본 존재 시 안내
  useEffect(() => {
    const autoSaved = localStorage.getItem(AUTO_SAVE_KEY);
    if (autoSaved && autoSaved !== brief) {
      setShowRestore(true);
    }
  }, [brief]);

  const handleRestore = () => {
    const autoSaved = localStorage.getItem(AUTO_SAVE_KEY);
    if (autoSaved) setBrief(autoSaved);
    setShowRestore(false);
  };

  const handleStructureGenerate = () => {
    // 실제로는 brief를 기반으로 구조 데이터를 생성해야 함
    // 지금은 더미 구조 데이터 전달
    const dummyStructure = JSON.stringify({ sections: [
      { title: '섹션 1', items: ['항목 1', '항목 2'] },
      { title: '섹션 2', items: ['항목 3'] }
    ] });
    navigate(`/structure-edit?structure=${encodeURIComponent(dummyStructure)}`);
  };

  const handleSave = () => {
    saveBriefHistory(brief);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    localStorage.removeItem(AUTO_SAVE_KEY);
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff'
    }}>
      <div style={{ width: 600, maxWidth: '95vw' }}>
        <h2 style={{ marginBottom: 24, textAlign: 'center' }}>AI 브리프 확인 및 수정</h2>
        {showRestore && (
          <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: 12, borderRadius: 6, marginBottom: 12 }}>
            임시 저장된 내용이 있습니다. <button onClick={handleRestore}>복원</button>
          </div>
        )}
        <textarea
          value={brief}
          onChange={e => setBrief(e.target.value)}
          rows={12}
          style={{ width: '100%', fontSize: 16, padding: 12, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <div style={{ marginTop: 16, color: '#888' }}>
          (여기서 브리프를 직접 수정할 수 있습니다)
        </div>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={handleSave} style={{ padding: '10px 24px', fontSize: 16 }}>
            저장
          </button>
          <button onClick={handleStructureGenerate} style={{ padding: '10px 24px', fontSize: 16 }}>
            기획안 구조 생성
          </button>
        </div>
        {saved && <div style={{ color: 'green', marginTop: 12 }}>저장 완료!</div>}
      </div>
    </div>
  );
} 