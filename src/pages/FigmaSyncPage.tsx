import { useNavigate } from 'react-router-dom';

export default function FigmaSyncPage() {
  const navigate = useNavigate();
  const handleGoHistory = () => {
    navigate('/history');
  };
  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff'
    }}>
      <div style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
        <h2 style={{ marginBottom: 24 }}>Figma 연동 완료</h2>
        <div style={{ margin: '32px 0', color: '#4caf50', fontWeight: 'bold' }}>
          기획안 구조가 Figma로 성공적으로 연동되었습니다!
        </div>
        <button onClick={handleGoHistory} style={{ padding: '10px 24px', fontSize: 16 }}>
          이력 관리로 이동
        </button>
      </div>
    </div>
  );
} 