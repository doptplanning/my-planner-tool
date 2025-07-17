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
  trainedPages?: Array<{
    id: string;
    title: string;
    status: 'success' | 'failed' | 'pending';
    error?: string;
  }>;
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
  const [showTrainedPages, setShowTrainedPages] = useState(false);
  const [previewPage, setPreviewPage] = useState<NotionPage | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatImages, setChatImages] = useState<string[]>([]);
  const [showBriefSample, setShowBriefSample] = useState(false);
  const [showSampleQuestions, setShowSampleQuestions] = useState(false);

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
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'processing': return '처리 중';
      case 'failed': return '실패';
      case 'pending': return '대기 중';
      case 'success': return '성공';
      case 'error': return '오류';
      default: return status;
    }
  };

  // 학습된 페이지들의 상태를 확인하는 함수
  const getPageTrainingStatus = (pageId: string) => {
    for (const training of trainingHistory) {
      if (training.pageIds.includes(pageId)) {
        if (training.trainedPages) {
          const pageTraining = training.trainedPages.find(p => p.id === pageId);
          if (pageTraining) {
            return {
              status: pageTraining.status,
              trainingId: training._id,
              createdAt: training.createdAt
            };
          }
        }
        return {
          status: training.status === 'completed' ? 'success' : training.status,
          trainingId: training._id,
          createdAt: training.createdAt
        };
      }
    }
    return null;
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

  // 이미지 업로드 핸들러
  const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result && typeof ev.target.result === 'string') {
          setChatImages(prev => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveChatImage = (idx: number) => {
    setChatImages(prev => prev.filter((_, i) => i !== idx));
  };

  // 브리프 샘플 표시 핸들러
  const handleShowBriefSample = () => {
    const briefSample = `# 📋 브리프 작성 가이드

## 🎯 기본 정보
| 항목 | 설명 | 예시 |
|------|------|------|
| 프로젝트명 | 진행할 프로젝트의 명칭 | "2024 봄 신상품 런칭 캠페인" |
| 브랜드명 | 광고할 브랜드/제품명 | "스포츠브랜드 XYZ" |
| 예산 | 총 예산 범위 | "500만원 ~ 1000만원" |
| 기간 | 프로젝트 진행 기간 | "2024.03.01 ~ 2024.04.30" |

## 👥 타겟 분석
| 구분 | 내용 | 세부사항 |
|------|------|----------|
| **주요 타겟** | 1차 타겟 고객층 | 20-30대 여성 |
| **보조 타겟** | 2차 타겟 고객층 | 30-40대 남성 |
| **라이프스타일** | 타겟의 생활 패턴 | SNS 활발, 건강관리 관심 |
| **소비 패턴** | 구매 행동 특성 | 온라인 쇼핑 선호, 프리미엄 제품 구매 |

## 🎨 크리에이티브 요구사항
### 메시지 전략
1. **핵심 메시지**: 브랜드가 전달하고 싶은 주요 메시지
2. **차별화 포인트**: 경쟁사와 구별되는 특징
3. **감정적 어필**: 고객에게 전달할 감정/느낌

### 디자인 가이드라인
| 요소 | 요구사항 | 참고사항 |
|------|----------|----------|
| **컬러톤** | 메인 컬러 및 서브 컬러 | 브랜드 아이덴티티 반영 |
| **이미지 스타일** | 촬영/디자인 방향 | 모던, 클래식, 플레이풀 등 |
| **타이포그래피** | 폰트 스타일 | 가독성과 브랜드 이미지 고려 |
| **레이아웃** | 구성 방식 | 미니멀, 다이나믹, 클린 등 |

## 📱 미디어 전략
### 플랫폼별 전략
- **인스타그램**: 시각적 콘텐츠 중심, 스토리/릴스 활용
- **페이스북**: 커뮤니티 형성, 브랜드 스토리텔링
- **유튜브**: 동영상 콘텐츠, 인플루언서 협업
- **네이버**: 검색 최적화, 블로그 마케팅

### 콘텐츠 유형
| 유형 | 목적 | 예시 |
|------|------|------|
| **이미지 광고** | 브랜드 인지도 향상 | 제품 사진, 라이프스타일 |
| **동영상 광고** | 제품 기능 소개 | 사용법, 후기, 스토리 |
| **인플루언서 콘텐츠** | 신뢰도 구축 | 리뷰, 체험기, 추천 |
| **사용자 생성 콘텐츠** | 커뮤니티 참여 | 해시태그 캠페인 |

## 📊 성과 측정
### KPI 지표
1. **인지도 지표**: 브랜드 인지도, 광고 인지도
2. **참여도 지표**: 좋아요, 댓글, 공유, 클릭률
3. **전환 지표**: 웹사이트 방문, 구매 전환율
4. **ROI 지표**: 광고 비용 대비 매출 증가율

### 측정 방법
| 지표 | 측정 도구 | 목표값 |
|------|-----------|--------|
| **도달률** | 각 플랫폼 인사이트 | 10만명 이상 |
| **참여율** | 좋아요/댓글 비율 | 3% 이상 |
| **클릭률** | CTR (Click Through Rate) | 2% 이상 |
| **전환율** | 구매 전환 비율 | 1% 이상 |

## 💡 추가 요구사항
### 특별 요청사항
- **법적 고려사항**: 광고 심의, 표시 의무 등
- **경쟁사 분석**: 주요 경쟁사와의 차별화 포인트
- **시즌별 고려사항**: 계절, 이벤트, 트렌드 반영
- **긴급성**: 마감일, 특별 일정 등

### 참고 자료
- **브랜드 가이드라인**: 로고, 컬러, 폰트 등
- **기존 광고물**: 과거 성공/실패 사례
- **경쟁사 자료**: 벤치마킹할 만한 사례
- **시장 조사**: 타겟 고객 분석 자료

---
💡 **팁**: 위 항목들을 미리 준비해두시면 더 정확하고 효과적인 브리프 작성이 가능합니다!`;

    setChatHistory(prev => [...prev, { role: 'ai', content: briefSample }]);
    setShowBriefSample(false);
  };

  // 샘플 질문 표시 핸들러
  const handleShowSampleQuestions = () => {
    const sampleQuestions = `# 💡 자주 묻는 질문 샘플

## 🎯 브리프 작성 관련
| 질문 | 설명 |
|------|------|
| "브리프 작성할 때 꼭 포함해야 할 항목은?" | 필수 포함 요소와 작성 팁 |
| "타겟 분석은 어떻게 해야 하나요?" | 타겟 고객 분석 방법론 |
| "예산 설정은 어떻게 해야 할까요?" | 예산 산정 기준과 분배 방법 |

## 📊 광고 전략 관련
| 질문 | 설명 |
|------|------|
| "새로운 브랜드 런칭 전략을 제안해주세요" | 브랜드 런칭 단계별 전략 |
| "소셜미디어 광고 효과를 높이는 방법은?" | 플랫폼별 최적화 전략 |
| "인플루언서 마케팅 전략을 알려주세요" | 인플루언서 선정과 협업 방법 |

## 🎨 크리에이티브 관련
| 질문 | 설명 |
|------|------|
| "광고 카피 작성법을 알려주세요" | 효과적인 카피라이팅 기법 |
| "시각적 디자인 가이드라인은?" | 브랜드 일관성 유지 방법 |
| "A/B 테스트는 어떻게 하나요?" | 광고 효과 측정과 최적화 |

## 📈 성과 측정 관련
| 질문 | 설명 |
|------|------|
| "광고 성과는 어떻게 측정하나요?" | KPI 설정과 측정 방법 |
| "ROI를 높이는 전략은?" | 투자 대비 수익률 개선 방법 |
| "고객 전환율을 높이는 방법은?" | 전환율 최적화 전략 |

---
💡 **사용법**: 위 질문들을 참고해서 AI에게 질문해보세요!`;

    setChatHistory(prev => [...prev, { role: 'ai', content: sampleQuestions }]);
    setShowSampleQuestions(false);
  };

  // 챗봇 질문 전송 핸들러 (이미지 포함)
  const handleSendChat = async () => {
    if (!chatInput.trim() && chatImages.length === 0) return;
    setChatLoading(true);
    setChatError('');
    setChatHistory(prev => [...prev, { role: 'user', content: chatInput + (chatImages.length > 0 ? ' [이미지 첨부]' : '') }]);
    try {
      const response = await fetch(`${API_BASE}/api/notion/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: chatInput, images: chatImages })
      });
      const data = await response.json();
      if (response.ok) {
        setChatHistory(prev => [...prev, { role: 'ai', content: data.answer }]);
        setChatInput('');
        setChatImages([]);
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
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '32px', color: '#111' }}>
        노션 AI 학습 페이지
      </h1>

      {/* 학습 히스토리 버튼 */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
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
        <button
          onClick={() => setShowTrainedPages(!showTrainedPages)}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {showTrainedPages ? '학습된 페이지 숨기기' : '학습된 페이지 확인'}
        </button>
      </div>

      {/* 학습된 페이지 확인 */}
      {showTrainedPages && (
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          marginBottom: '32px'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '20px', color: '#111' }}>
            학습된 페이지 현황
          </h2>
          {pages === null ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
              먼저 노션 데이터베이스를 연결해주세요.
            </p>
                     ) : pages && pages.length === 0 ? (
             <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
               연결된 페이지가 없습니다.
             </p>
           ) : pages ? (
             <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
               {pages.map((page) => {
                 const trainingStatus = getPageTrainingStatus(page.id);
                 return (
                   <div
                     key={page.id}
                     style={{
                       padding: '16px',
                       border: '1px solid #e5e7eb',
                       borderRadius: '8px',
                       marginBottom: '12px',
                       background: trainingStatus ? '#f0fdf4' : '#fff',
                       position: 'relative'
                     }}
                   >
                     <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                       <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111', margin: 0, flex: 1 }}>
                         {page.title}
                       </h3>
                       {trainingStatus ? (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <span style={{
                             padding: '4px 8px',
                             borderRadius: '4px',
                             fontSize: '12px',
                             fontWeight: '600',
                             background: getStatusColor(trainingStatus.status) === '#10b981' ? '#d1fae5' : 
                                        getStatusColor(trainingStatus.status) === '#ef4444' ? '#fee2e2' : '#fef3c7',
                             color: getStatusColor(trainingStatus.status) === '#10b981' ? '#065f46' : 
                                    getStatusColor(trainingStatus.status) === '#ef4444' ? '#991b1b' : '#92400e'
                           }}>
                             {getStatusText(trainingStatus.status)}
                           </span>
                           <span style={{ fontSize: '12px', color: '#6b7280' }}>
                             {new Date(trainingStatus.createdAt).toLocaleDateString()}
                           </span>
                         </div>
                       ) : (
                         <span style={{
                           padding: '4px 8px',
                           borderRadius: '4px',
                           fontSize: '12px',
                           fontWeight: '600',
                           background: '#f3f4f6',
                           color: '#6b7280'
                         }}>
                           미학습
                         </span>
                       )}
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
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                         마지막 수정: {new Date(page.lastEdited).toLocaleDateString()}
                       </span>
                       {trainingStatus && (
                         <button
                           onClick={() => {
                             const training = trainingHistory.find(t => t._id === trainingStatus.trainingId);
                             if (training) {
                               alert(`학습 결과:\n${training.result || '상세 결과 없음'}`);
                             }
                           }}
                           style={{
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
                           학습 결과 보기
                         </button>
                       )}
                     </div>
                   </div>
                 );
               })}
             </div>
           ) : null}
           {pages && pages.length > 0 && (
             <div style={{ marginTop: '16px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
               <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                 학습 현황 요약
               </h4>
               <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                 <span>전체 페이지: <strong>{pages.length}개</strong></span>
                 <span>학습 완료: <strong style={{ color: '#10b981' }}>
                   {pages.filter(p => getPageTrainingStatus(p.id)?.status === 'success').length}개
                 </strong></span>
                 <span>학습 실패: <strong style={{ color: '#ef4444' }}>
                   {pages.filter(p => getPageTrainingStatus(p.id)?.status === 'failed').length}개
                 </strong></span>
                 <span>미학습: <strong style={{ color: '#6b7280' }}>
                   {pages.filter(p => !getPageTrainingStatus(p.id)).length}개
                 </strong></span>
               </div>
             </div>
           )}
        </div>
      )}

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

      {/* 노션 연결+챗봇 UI를 가로 배치 */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginBottom: 32 }}>
        {/* 노션 데이터베이스 연결 영역 (기존 코드) */}
        <div style={{ flex: 1, minWidth: 340 }}>
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
        </div>
        {/* 챗봇 UI */}
        <div style={{ flex: 1, minWidth: 340, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#111', margin: 0 }}>학습된 AI와 대화하기</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleShowSampleQuestions}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                💡 샘플 질문
              </button>
              <button
                onClick={handleShowBriefSample}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                📋 브리프 샘플
              </button>
            </div>
          </div>
          <div style={{ minHeight: 120, marginBottom: 16, maxHeight: '400px', overflowY: 'auto' }}>
            {chatHistory.length === 0 && <div style={{ color: '#6b7280' }}>AI에게 궁금한 점을 자유롭게 물어보세요! (이미지 첨부도 가능)</div>}
            {chatHistory.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: 16, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                <div style={{
                  display: 'inline-block',
                  background: msg.role === 'user' ? '#dbeafe' : '#fff',
                  color: '#111',
                  borderRadius: 12,
                  padding: '12px 16px',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                  fontSize: 15,
                  boxShadow: msg.role === 'ai' ? '0 2px 8px rgba(0,0,0,0.04)' : undefined,
                  textAlign: 'left'
                }}>
                  {msg.role === 'ai' ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.content.split('\n').map((line, lineIdx) => {
                        // 테이블 처리
                        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                          const cells = line.split('|').filter(cell => cell.trim() !== '');
                          return (
                            <div key={lineIdx} style={{ 
                              display: 'flex', 
                              borderBottom: line.includes('---') ? 'none' : '1px solid #e5e7eb',
                              background: line.includes('---') ? '#f9fafb' : 'transparent',
                              fontWeight: line.includes('---') ? '600' : 'normal'
                            }}>
                              {cells.map((cell, cellIdx) => (
                                <div key={cellIdx} style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  borderRight: cellIdx < cells.length - 1 ? '1px solid #e5e7eb' : 'none',
                                  textAlign: 'center',
                                  fontSize: line.includes('---') ? '13px' : '14px'
                                }}>
                                  {cell.trim()}
                                </div>
                              ))}
                            </div>
                          );
                        }
                        // 제목 처리
                        if (line.startsWith('#')) {
                          const level = line.match(/^#+/)?.[0].length || 1;
                          const fontSize = level === 1 ? '20px' : level === 2 ? '18px' : '16px';
                          const fontWeight = level === 1 ? '700' : level === 2 ? '600' : '500';
                          return (
                            <div key={lineIdx} style={{ 
                              fontSize, 
                              fontWeight, 
                              marginTop: level === 1 ? '16px' : '12px', 
                              marginBottom: '8px',
                              color: '#111'
                            }}>
                              {line.replace(/^#+\s*/, '')}
                            </div>
                          );
                        }
                        // 리스트 처리
                        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                          return (
                            <div key={lineIdx} style={{ 
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              marginBottom: '4px',
                              paddingLeft: '8px'
                            }}>
                              <span style={{ marginRight: '8px', color: '#6b7280' }}>•</span>
                              <span>{line.replace(/^[-*]\s*/, '')}</span>
                            </div>
                          );
                        }
                        // 번호 리스트 처리
                        if (/^\d+\.\s/.test(line.trim())) {
                          return (
                            <div key={lineIdx} style={{ 
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              marginBottom: '4px',
                              paddingLeft: '8px'
                            }}>
                              <span style={{ marginRight: '8px', color: '#6b7280', minWidth: '20px' }}>
                                {line.match(/^\d+/)?.[0]}.
                              </span>
                              <span>{line.replace(/^\d+\.\s*/, '')}</span>
                            </div>
                          );
                        }
                        // 강조 처리
                        if (line.includes('**')) {
                          const parts = line.split('**');
                          return (
                            <div key={lineIdx}>
                              {parts.map((part, partIdx) => (
                                <span key={partIdx} style={{ 
                                  fontWeight: partIdx % 2 === 1 ? '600' : 'normal' 
                                }}>
                                  {part}
                                </span>
                              ))}
                            </div>
                          );
                        }
                        // 일반 텍스트
                        return <div key={lineIdx}>{line}</div>;
                      })}
                    </div>
                  ) : (
                    <div>{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ textAlign: 'left', marginBottom: 16 }}>
                <div style={{
                  display: 'inline-block',
                  background: '#fff',
                  color: '#3b82f6',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 15,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid #e5e7eb', 
                      borderTop: '2px solid #3b82f6', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite' 
                    }}></div>
                    AI가 답변을 생성 중입니다...
                  </div>
                </div>
              </div>
            )}
            {chatError && (
              <div style={{ textAlign: 'left', marginBottom: 16 }}>
                <div style={{
                  display: 'inline-block',
                  background: '#fef2f2',
                  color: '#ef4444',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: 15,
                  border: '1px solid #fecaca'
                }}>
                  {chatError}
                </div>
              </div>
            )}
          </div>
          {/* 이미지 미리보기 */}
          {chatImages.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {chatImages.map((img, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={img} alt={`첨부이미지${idx+1}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #d1d5db' }} />
                  <button onClick={() => handleRemoveChatImage(idx)} style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 13, cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>
          )}
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
            <label style={{ display: 'inline-block', background: '#e0e7ff', color: '#3730a3', borderRadius: 8, padding: '12px 16px', fontSize: 15, fontWeight: 600, cursor: chatLoading ? 'not-allowed' : 'pointer', opacity: chatLoading ? 0.6 : 1 }}>
              이미지 업로드
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleChatImageUpload} disabled={chatLoading} />
            </label>
            <button
              onClick={handleSendChat}
              disabled={chatLoading || (!chatInput.trim() && chatImages.length === 0)}
              style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 15, fontWeight: 600, cursor: chatLoading ? 'not-allowed' : 'pointer', opacity: chatLoading || (!chatInput.trim() && chatImages.length === 0) ? 0.6 : 1 }}
            >
              전송
            </button>
          </div>
        </div>
      </div>

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