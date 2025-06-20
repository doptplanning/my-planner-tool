import React from 'react';
import type { HistoryItem } from './HistoryList';

interface HistoryDetailProps {
  item: HistoryItem | null;
}

const HistoryDetail: React.FC<HistoryDetailProps> = ({ item }) => {
  if (!item) return <div style={{ padding: 32 }}>이력을 선택하세요.</div>;
  return (
    <div style={{ padding: 32 }}>
      <h3>{item.title}</h3>
      <div style={{ color: '#888', marginBottom: 16 }}>{item.date}</div>
      {item.type === 'brief' ? (
        <div>브리프 내용 (예시)</div>
      ) : (
        <div>구조 내용 (예시)</div>
      )}
    </div>
  );
};

export default HistoryDetail; 