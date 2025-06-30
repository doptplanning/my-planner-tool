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
  const [pages, setPages] = useState<NotionPage[] | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({ status: 'idle', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [trainingHistory, setTrainingHistory] = useState<TrainingHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [previewPage, setPreviewPage] = useState<NotionPage | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');

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

  const handleConnectNotion = async (opts?: { search?: string; page?: number }) => {
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
          databaseId,
          search: opts?.search !== undefined ? opts.search : search,
          page: opts?.page !== undefined ? opts.page : page,
          pageSize
        })
      });
      const data = await response.json();
      if (response.ok) {
        setPages(data.pages);
        setTotal(data.total || 0);
        setTrainingStatus({ status: 'success', message: `${data.total || data.pages.length}개의 페이지를 찾았습니다.` });
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
    if (selectedPages.length === pages?.length || pages === null) {
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

  // 검색 핸들러
  const handleSearch = () => {
    setPage(1);
    handleConnectNotion({ search, page: 1 });
  };

  // 페이지 변경 핸들러
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    handleConnectNotion({ page: newPage });
  };

  // 챗봇 질문 전송 핸들러
  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    setChatError('');
    setChatHistory(prev => [...prev, { role: 'user', content: chatInput }]);
    try {
      const response = await fetch(`${API_BASE}/api/notion/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: chatInput })
      });
      const data = await response.json();
      if (response.ok) {
        setChatHistory(prev => [...prev, { role: 'ai', content: data.answer }]);
        setChatInput('');
      } else {
        setChatError(data.error || 'AI 답변 생성에 실패했습니다.');
      }
    } catch (e) {
      setChatError('AI 답변 생성 중 오류가 발생했습니다.');
    } finally {
      setChatLoading(false);
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
          onClick={() => handleConnectNotion()}
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
      {pages !== null && (
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          {/* 검색 UI (이동) */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="제목 검색어 입력"
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              검색
            </button>
          </div>
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
                  cursor: 'pointer',
                  position: 'relative'
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
                  <button
                    onClick={e => { e.stopPropagation(); setPreviewPage(page); }}
                    style={{
                      marginLeft: 'auto',
                      background: '#e0e7ff',
                      color: '#3730a3',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 12px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    미리보기
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      window.open(`https://www.notion.so/${page.id.replace(/-/g, '')}`, '_blank');
                    }}
                    style={{
                      marginLeft: '8px',
                      background: '#fef9c3',
                      color: '#b45309',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 12px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    원본 페이지 보기
                  </button>
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
            {pages.length > 0 && selectedPages.length === 0 && (
              <div style={{ color: '#ef4444', textAlign: 'center', marginTop: '16px' }}>
                학습할 페이지를 선택해주세요.
              </div>
            )}
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

          {/* 미리보기 모달 */}
          {previewPage && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.3)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
              onClick={() => setPreviewPage(null)}
            >
              <div style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '600px',
                width: '90%',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                position: 'relative'
              }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setPreviewPage(null)}
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    background: 'transparent',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                  aria-label="닫기"
                >
                  ×
                </button>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '16px', color: '#111', display: 'flex', alignItems: 'center' }}>
                  {previewPage.title}
                  <a
                    href={`https://www.notion.so/${previewPage.id.replace(/-/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginLeft: '10px',
                      color: '#3b82f6',
                      textDecoration: 'none',
                      fontSize: '18px',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                    title="노션에서 열기"
                  >
                    🔗
                  </a>
                </h2>
                <div style={{ fontSize: '15px', color: '#374151', whiteSpace: 'pre-line' }}>{previewPage.content}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '16px' }}>
                  마지막 수정: {new Date(previewPage.lastEdited).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* 페이지네이션 UI (이동) */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '24px', gap: '8px' }}>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              style={{
                background: '#e5e7eb',
                color: '#6b7280',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.6 : 1
              }}
            >
              이전
            </button>
            <span style={{ fontSize: '15px', fontWeight: 500 }}>
              {page} / {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= Math.ceil(total / pageSize)}
              style={{
                background: '#e5e7eb',
                color: '#6b7280',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: page >= Math.ceil(total / pageSize) ? 'not-allowed' : 'pointer',
                opacity: page >= Math.ceil(total / pageSize) ? 0.6 : 1
              }}
            >
              다음
            </button>
          </div>

          {pages.length === 0 ? (
            <div style={{ color: '#ef4444', textAlign: 'center', margin: '32px 0' }}>
              검색 결과가 없습니다.
            </div>
          ) : (
            <>
              {/* ...기존 리스트/미리보기/원본 보기 ... */}
            </>
          )}
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

      {/* 챗봇 UI */}
      <div style={{ marginTop: '48px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '32px', maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: 16, color: '#111' }}>학습된 AI와 대화하기</h2>
        <div style={{ minHeight: 120, marginBottom: 16 }}>
          {chatHistory.length === 0 && <div style={{ color: '#6b7280' }}>AI에게 궁금한 점을 자유롭게 물어보세요!</div>}
          {chatHistory.map((msg, idx) => (
            <div key={idx} style={{ marginBottom: 10, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
              <span style={{
                display: 'inline-block',
                background: msg.role === 'user' ? '#dbeafe' : '#fff',
                color: '#111',
                borderRadius: 8,
                padding: '8px 14px',
                maxWidth: 400,
                wordBreak: 'break-word',
                fontSize: 15,
                boxShadow: msg.role === 'ai' ? '0 2px 8px rgba(0,0,0,0.04)' : undefined
              }}>{msg.content}</span>
            </div>
          ))}
          {chatLoading && <div style={{ color: '#3b82f6', marginTop: 8 }}>AI가 답변을 생성 중입니다...</div>}
          {chatError && <div style={{ color: '#ef4444', marginTop: 8 }}>{chatError}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !chatLoading) handleSendChat(); }}
            placeholder="AI에게 질문을 입력하세요"
            style={{ flex: 1, padding: '12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15 }}
            disabled={chatLoading}
          />
          <button
            onClick={handleSendChat}
            disabled={chatLoading || !chatInput.trim()}
            style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: chatLoading ? 'not-allowed' : 'pointer', opacity: chatLoading || !chatInput.trim() ? 0.6 : 1 }}
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotionTrainingPage; 