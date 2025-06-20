import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAutoSave } from '../hooks/useAutoSave';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function saveStructureHistory(structure: string) {
  const history = JSON.parse(localStorage.getItem('structureHistory') || '[]');
  const newItem = {
    id: Date.now().toString(),
    type: 'structure',
    title: `구조 저장본 (${new Date().toLocaleString()})`,
    date: new Date().toLocaleString(),
    content: structure,
  };
  localStorage.setItem('structureHistory', JSON.stringify([newItem, ...history]));
}

const AUTO_SAVE_KEY = 'structureAutoSave';

interface Structure {
  sections: { title: string; items: string[] }[];
}

export default function StructureEditPage() {
  const query = useQuery();
  const structureStr = query.get('structure') || '';
  let initialStructure: Structure = { sections: [] };
  try {
    initialStructure = JSON.parse(structureStr);
  } catch {}
  const [structure, setStructure] = useState<Structure>(initialStructure);
  const [saved, setSaved] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const navigate = useNavigate();

  // 자동 저장 적용
  useAutoSave(JSON.stringify(structure), (val) => {
    localStorage.setItem(AUTO_SAVE_KEY, val);
  });

  // 임시 저장본 존재 시 안내
  useEffect(() => {
    const autoSaved = localStorage.getItem(AUTO_SAVE_KEY);
    if (autoSaved && autoSaved !== JSON.stringify(structure)) {
      setShowRestore(true);
    }
  }, [structure]);

  const handleRestore = () => {
    const autoSaved = localStorage.getItem(AUTO_SAVE_KEY);
    if (autoSaved) setStructure(JSON.parse(autoSaved));
    setShowRestore(false);
  };

  const handleFigmaSync = () => {
    navigate('/figma-sync');
  };

  const handleSave = () => {
    saveStructureHistory(JSON.stringify(structure));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    localStorage.removeItem(AUTO_SAVE_KEY);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      zIndex: 10
    }}>
      <div style={{ width: 700, maxWidth: '98vw', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: 32 }}>
        <h2 style={{ marginBottom: 24, textAlign: 'center' }}>기획안 구조 편집</h2>
        {showRestore && (
          <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: 12, borderRadius: 6, marginBottom: 12 }}>
            임시 저장된 내용이 있습니다. <button onClick={handleRestore}>복원</button>
          </div>
        )}
        {structure.sections.length === 0 ? (
          <div>구조 데이터가 없습니다.</div>
        ) : (
          <div>
            {structure.sections.map((section, idx) => (
              <div key={idx} style={{ marginBottom: 24, padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
                <strong>{section.title}</strong>
                <ul>
                  {section.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={handleSave} style={{ padding: '10px 24px', fontSize: 16 }}>
            저장
          </button>
          <button onClick={handleFigmaSync} style={{ padding: '10px 24px', fontSize: 16 }}>
            Figma 연동
          </button>
        </div>
        {saved && <div style={{ color: 'green', marginTop: 12 }}>저장 완료!</div>}
      </div>
    </div>
  );
} 