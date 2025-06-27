import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/Auth/AuthContext';

interface NotionPage {
  id: string;
  title: string;
  content: string;
  lastEdited: string;
}

interface TrainingStatus {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  progress?: number;
}

interface TrainingHistory {
  _id: string;
  status: string;
  result: string;
  createdAt: string;
  pageIds: string[];
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

const NotionTrainingPage: React.FC = () => {
  const { user } = useAuth();
  const [notionToken, setNotionToken] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({ status: 'idle', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [trainingHistory, setTrainingHistory] = useState<TrainingHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTrainingHistory();
    }
  }, [user]);

  const fetchTrainingHistory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/notion/training-history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTrainingHistory(data.trainings);
      }
    } catch (error) {
      console.error('학습 히스토리 조회 오류:', error);
    }
  };

  const handleConnectNotion = async () => {
    if (!notionToken || !databaseId) {
      alert('노션 토큰과 데이터베이스 ID를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setTrainingStatus({ status: 'loading', message: '노션 데이터베이스에 연결 중...' });

    try {
      const response = await fetch(`${API_BASE}/api/notion/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          notionToken,
          databaseId
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPages(data.pages);
        setTrainingStatus({ status: 'success', message: `${data.pages.length}개의 페이지를 찾았습니다.` });
      } else {
        setTrainingStatus({ status: 'error', message: data.message || '연결에 실패했습니다.' });
      }
    } catch (error) {
      setTrainingStatus({ status: 'error', message: '연결 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedPages.length === pages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(pages.map(page => page.id));
    }
  };

  const handleStartTraining = async () => {
    if (selectedPages.length === 0) {
      alert('학습할 페이지를 선택해주세요.');
      return;
    }

    setTrainingStatus({ status: 'loading', message: 'AI 모델 학습을 시작합니다...', progress: 0 });

    try {
      const response = await fetch(`${API_BASE}/api/notion/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          pageIds: selectedPages,
          notionToken,
          databaseId
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTrainingStatus({ 
          status: 'success', 
          message: 'AI 모델 학습이 완료되었습니다!',
          progress: 100
        });
        // 학습 완료 후 히스토리 새로고침
        fetchTrainingHistory();
      } else {
        setTrainingStatus({ status: 'error', message: data.message || '학습에 실패했습니다.' });
      }
    } catch (error) {
      setTrainingStatus({ status: 'error', message: '학습 중 오류가 발생했습니다.' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'loading': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'processing': return '처리 중';
      case 'failed': return '실패';
      case 'pending': return '대기 중';
      default: return status;
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '32px', color: '#111' }}>
        노션 AI 학습 페이지
      </h1>

      {/* 학습 히스토리 버튼 */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {showHistory ? '히스토리 숨기기' : '학습 히스토리 보기'}
        </button>
      </div>

      {/* 학습 히스토리 */}
      {showHistory && (
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          marginBottom: '32px'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px', color: '#111' }}>
            학습 히스토리
          </h2>
          {trainingHistory.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>아직 학습 기록이 없습니다.</p>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {trainingHistory.map((training) => (
                <div
                  key={training._id}
                  style={{
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    background: '#f9fafb'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      {new Date(training.createdAt).toLocaleString()}
                    </span>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: training.status === 'completed' ? '#d1fae5' : 
                                 training.status === 'failed' ? '#fee2e2' : '#dbeafe',
                      color: training.status === 'completed' ? '#065f46' : 
                             training.status === 'failed' ? '#991b1b' : '#1e40af'
                    }}>
                      {getStatusText(training.status)}
                    </span>
                  </div>
                  {training.result && (
                    <div style={{ 
                      background: '#fff', 
                      padding: '12px', 
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: '#374151'
                    }}>
                      <strong>학습 결과:</strong><br />
                      {training.result}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 노션 연결 섹션 */}
      <div style={{ 
        background: '#f9fafb', 
        padding: '24px', 
        borderRadius: '12px', 
        marginBottom: '32px',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px', color: '#111' }}>
          노션 데이터베이스 연결
        </h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
            노션 Integration Token
          </label>
          <input
            type="password"
            value={notionToken}
            onChange={(e) => setNotionToken(e.target.value)}
            placeholder="notion_integration_token_here"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
            데이터베이스 ID
          </label>
          <input
            type="text"
            value={databaseId}
            onChange={(e) => setDatabaseId(e.target.value)}
            placeholder="database_id_here"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>

        <button
          onClick={handleConnectNotion}
          disabled={isLoading}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? '연결 중...' : '노션 연결'}
        </button>
      </div>

      {/* 상태 표시 */}
      {trainingStatus.message && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          background: getStatusColor(trainingStatus.status) === '#10b981' ? '#d1fae5' : 
                     getStatusColor(trainingStatus.status) === '#ef4444' ? '#fee2e2' : '#dbeafe',
          border: `1px solid ${getStatusColor(trainingStatus.status)}`,
          color: getStatusColor(trainingStatus.status)
        }}>
          {trainingStatus.message}
          {trainingStatus.progress !== undefined && (
            <div style={{ marginTop: '8px' }}>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${trainingStatus.progress}%`,
                  height: '100%',
                  background: getStatusColor(trainingStatus.status),
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 페이지 목록 */}
      {pages.length > 0 && (
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111' }}>
              학습할 페이지 선택 ({pages.length}개)
            </h2>
            <button
              onClick={handleSelectAll}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {selectedPages.length === pages.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {pages.map((page) => (
              <div
                key={page.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  background: selectedPages.includes(page.id) ? '#f0f9ff' : '#fff',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  if (selectedPages.includes(page.id)) {
                    setSelectedPages(selectedPages.filter(id => id !== page.id));
                  } else {
                    setSelectedPages([...selectedPages, page.id]);
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedPages.includes(page.id)}
                    onChange={() => {}}
                    style={{ marginRight: '12px' }}
                  />
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0 }}>
                    {page.title}
                  </h3>
                </div>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#6b7280', 
                  margin: '0 0 8px 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {page.content}
                </p>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  마지막 수정: {new Date(page.lastEdited).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={handleStartTraining}
            disabled={selectedPages.length === 0 || trainingStatus.status === 'loading'}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: selectedPages.length === 0 || trainingStatus.status === 'loading' ? 'not-allowed' : 'pointer',
              opacity: selectedPages.length === 0 || trainingStatus.status === 'loading' ? 0.6 : 1,
              marginTop: '20px'
            }}
          >
            {trainingStatus.status === 'loading' ? '학습 중...' : `선택된 ${selectedPages.length}개 페이지로 AI 학습 시작`}
          </button>
        </div>
      )}

      {/* 도움말 */}
      <div style={{ 
        background: '#fef3c7', 
        padding: '20px', 
        borderRadius: '12px',
        border: '1px solid #f59e0b',
        marginTop: '32px'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '12px', color: '#92400e' }}>
          📖 사용 방법
        </h3>
        <ol style={{ color: '#92400e', lineHeight: '1.6', margin: 0, paddingLeft: '20px' }}>
          <li>노션에서 Integration을 생성하고 토큰을 발급받으세요.</li>
          <li>학습하고 싶은 데이터베이스에 Integration을 추가하세요.</li>
          <li>데이터베이스 ID를 복사하여 입력하세요.</li>
          <li>연결 후 학습할 페이지들을 선택하세요.</li>
          <li>AI 학습을 시작하면 선택된 페이지의 내용으로 모델이 학습됩니다.</li>
        </ol>
      </div>
    </div>
  );
};

export default NotionTrainingPage; 