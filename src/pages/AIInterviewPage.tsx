import React from 'react';
import AIChatBox from '../components/AIChat/AIChatBox';

const AIInterviewPage: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7', padding: 32 }}>
      <div style={{ width: 700, minHeight: 600, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.10)', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ marginBottom: 24, fontWeight: 700, fontSize: 24, color: '#222' }}>AI 작업의뢰서 인터뷰</h2>
        <AIChatBox />
      </div>
    </div>
  );
};

export default AIInterviewPage; 