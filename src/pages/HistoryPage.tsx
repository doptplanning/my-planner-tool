import React, { useState, useEffect } from 'react';
import HistoryList from '../components/History/HistoryList';
import type { HistoryItem } from '../components/History/HistoryList';
import HistoryDetail from '../components/History/HistoryDetail';

function loadHistory(): (HistoryItem & { content?: string })[] {
  const brief = JSON.parse(localStorage.getItem('briefHistory') || '[]');
  const structure = JSON.parse(localStorage.getItem('structureHistory') || '[]');
  return [...brief, ...structure].sort((a, b) => Number(b.id) - Number(a.id));
}

export default function HistoryPage() {
  const [history, setHistory] = useState<(HistoryItem & { content?: string })[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const h = loadHistory();
    setHistory(h);
    setSelectedId(h[0]?.id || null);
  }, []);

  const selectedItem = history.find(item => item.id === selectedId) || null;

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff'
    }}>
      <div style={{ display: 'flex', maxWidth: 900, width: '100%', border: '1px solid #eee', borderRadius: 8, minHeight: 400 }}>
        <HistoryList items={history} onSelect={setSelectedId} selectedId={selectedId || undefined} />
        <div style={{ flex: 1 }}>
          <HistoryDetail item={selectedItem} />
          {selectedItem && (
            <div style={{ marginTop: 24, background: '#fafafa', padding: 16, borderRadius: 8, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {selectedItem.content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 