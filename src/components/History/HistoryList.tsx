export type HistoryItem = {
  id: string;
  type: 'brief' | 'structure';
  title: string;
  date: string;
};

import React from 'react';

interface HistoryListProps {
  items: HistoryItem[];
  onSelect: (id: string) => void;
  selectedId?: string;
}

const HistoryList: React.FC<HistoryListProps> = ({ items, onSelect, selectedId }) => {
  return (
    <div style={{ borderRight: '1px solid #eee', minWidth: 220 }}>
      <h3 style={{ padding: '12px 16px', margin: 0 }}>이력 목록</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map(item => (
          <li
            key={item.id}
            onClick={() => onSelect(item.id)}
            style={{
              padding: '12px 16px',
              background: selectedId === item.id ? '#f0f0f0' : undefined,
              cursor: 'pointer',
              borderBottom: '1px solid #f5f5f5',
            }}
          >
            <div style={{ fontWeight: 500 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{item.date}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistoryList; 