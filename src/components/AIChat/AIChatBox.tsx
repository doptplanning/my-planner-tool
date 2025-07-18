import React, { useState, useEffect, useRef } from 'react';
import FileUploader from '../FileUploader/FileUploader';

interface QAItem {
  question: string;
  answer: string;
  aiComment?: string;
}

interface AIChatBoxProps {
  onAIResult?: (result: any) => void;
  height?: number | string;
  style?: React.CSSProperties;
  onQAListChange?: (qaList: QAItem[]) => void;
}

const greeting =
  '안녕하세요! DOPT 기획의 귀염둥이 기획자 디옵이에요! 작업의뢰서 작성을 도와드릴꺼에요 :)\n먼저 제품명이 모에요?';

const AIChatBox: React.FC<AIChatBoxProps> = ({ onAIResult, height = '80vh', style, onQAListChange }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([{ role: 'ai', content: greeting }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [qaList, setQaList] = useState<QAItem[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [webSearchLoading, setWebSearchLoading] = useState(false);
  const [fileAnalysisLoading, setFileAnalysisLoading] = useState(false);
  const [productInfo, setProductInfo] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

## 🏢 B2B 운영 관리 브리프 (추가)

### 📋 B2B 프로젝트 기본 정보
| 항목 | 설명 | 예시 |
|------|------|------|
| **프로젝트명** | 진행할 B2B 프로젝트 명칭 | "기업용 CRM 시스템 구축" |
| **고객사 정보** | 발주 기업 정보 | "중소기업 100명 규모" |
| **예산 범위** | 프로젝트 총 예산 | "5,000만원 ~ 1억원" |
| **프로젝트 기간** | 개발 및 구축 기간 | "2024.03.01 ~ 2024.08.31" |

### 👥 B2B 타겟 분석
| 구분 | 내용 | 세부사항 |
|------|------|----------|
| **주요 의사결정자** | 최종 결정권자 | CEO, CTO, IT 담당자 |
| **영향력자** | 의사결정에 영향 | 부서장, 팀장 |
| **사용자** | 실제 시스템 사용자 | 직원, 관리자 |
| **구매 프로세스** | 의사결정 과정 | RFI → RFP → 계약 |

### 🎯 B2B 영업 전략
#### 문의 관리
- **문의 수집**: 웹사이트, 이메일, 전화 등
- **신속 응대**: 3분 내 안내 메일 발송
- **고객 분류**: 잠재고객, 활성고객, VIP 등급

#### 견적서 관리
- **견적서 작성**: 브랜딩된 전문 견적서
- **빠른 발송**: 요청 후 5분 내 발송
- **견적 추적**: 견적서 열람, 수정 이력 관리

#### 계약 관리
- **계약서 작성**: 표준 계약서 템플릿
- **승인 프로세스**: 다단계 승인 워크플로우
- **계약 이행**: 납기, 품질, 유지보수 관리

### 💰 B2B 정산 관리
#### 수익 관리
- **매출 추적**: 계약별, 월별 매출 현황
- **미수금 관리**: 채권 관리 및 회수 전략
- **세금계산서**: 홈택스 연동 자동 발행

#### 지출 관리
- **계약별 지출**: 프로젝트별 비용 추적
- **마진 분석**: 수익 대비 비용 분석
- **예산 관리**: 월별, 분기별 예산 대비 실적

### 📊 B2B 성과 측정
#### 영업 KPI
- **문의 전환율**: 문의 → 견적 → 계약 전환율
- **영업 주기**: 첫 문의부터 계약까지 소요 기간
- **고객 단가**: 계약 건당 평균 금액

#### 운영 KPI
- **고객 만족도**: 서비스 품질 평가
- **재계약율**: 기존 고객 재계약 비율
- **수익성**: 프로젝트별 마진율

---
💡 **팁**: 위 항목들을 미리 준비해두시면 더 정확하고 효과적인 브리프 작성이 가능합니다!`;

    setMessages(prev => [...prev, { role: 'ai', content: briefSample }]);
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

## 🏢 B2B 운영 관리 관련
| 질문 | 설명 |
|------|------|
| "B2B 영업 프로세스 최적화 방법은?" | 영업 자동화 및 효율성 향상 |
| "견적서 작성 및 브랜딩 전략은?" | 전문적인 견적서 작성법 |
| "B2B 정산 관리 및 미수금 관리?" | 수익성 향상을 위한 정산 전략 |
| "B2B 고객 관리 시스템 구축법?" | CRM 및 고객 관계 관리 |
| "B2B 계약 관리 및 리스크 관리?" | 계약 체결부터 관리까지 |

## 🔧 플러그(Pluuug) 활용 관련
| 질문 | 설명 |
|------|------|
| "플러그로 B2B 운영 효율성 높이는 법?" | 플러그 활용 사례 및 전략 |
| "B2B 기업 운영 관리 솔루션 비교?" | 플러그 vs 경쟁사 분석 |
| "B2B 영업부터 정산까지 원스톱 관리?" | 통합 운영 관리 플랫폼 |

---
💡 **사용법**: 위 질문들을 참고해서 AI에게 질문해보세요!`;

    setMessages(prev => [...prev, { role: 'ai', content: sampleQuestions }]);
  };

  // 파일 분석 함수
  const handleFileAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    
    setFileAnalysisLoading(true);
    setMessages(prev => [...prev, { role: 'ai', content: '🔍 파일을 분석하고 있습니다...' }]);
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://my-planner-tool.onrender.com';
      let images: string[] = [];
      let pdfContent = '';
      
      // 파일 타입별 처리
      for (const file of uploadedFiles) {
        if (file.type.startsWith('image/')) {
          const imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          images.push(imageBase64);
        } else if (file.type === 'application/pdf') {
          // PDF 파일 파싱
          const pdfBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          
          try {
            const pdfRes = await fetch(`${API_BASE}/api/upload-pdf`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                pdfBase64,
                fileName: file.name
              }),
            });
            
            const pdfData = await pdfRes.json();
            if (pdfData.success) {
              pdfContent = pdfData.text;
            } else {
              pdfContent = `PDF 파일: ${file.name} (${(file.size / 1024).toFixed(1)}KB) - 파싱 실패`;
            }
          } catch (error) {
            console.error('PDF 파싱 오류:', error);
            pdfContent = `PDF 파일: ${file.name} (${(file.size / 1024).toFixed(1)}KB) - 파싱 오류`;
          }
        }
      }
      
      const res = await fetch(`${API_BASE}/api/analyze-files`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          images,
          pdfContent,
          productInfo
        }),
      });
      
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'ai', content: `파일 분석 실패: ${data.error}` }]);
      } else {
        const analysisResult = data.analysis;
        let analysisMessage = `# 📊 파일 분석 결과\n\n`;
        
        if (analysisResult.productAnalysis) {
          analysisMessage += `## 🎯 제품 분석\n${analysisResult.productAnalysis}\n\n`;
        }
        
        if (analysisResult.shootingRecommendation) {
          analysisMessage += `## 📸 촬영 추천\n${analysisResult.shootingRecommendation}\n\n`;
        }
        
        if (analysisResult.detailPageRecommendation) {
          analysisMessage += `## 📋 상세페이지 구성\n${analysisResult.detailPageRecommendation}\n\n`;
        }
        
        if (analysisResult.designReferences && analysisResult.designReferences.length > 0) {
          analysisMessage += `## 🎨 디자인 레퍼런스 추천\n\n`;
          analysisResult.designReferences.forEach((ref: any, index: number) => {
            analysisMessage += `### ${index + 1}. ${ref.title}\n`;
            analysisMessage += `**스타일**: ${ref.description}\n`;
            analysisMessage += `**컬러 팔레트**: ${ref.colorScheme.map((color: string) => `\`${color}\``).join(', ')}\n`;
            analysisMessage += `**타이포그래피**: ${ref.typography}\n`;
            analysisMessage += `**레이아웃**: ${ref.layout}\n`;
            analysisMessage += `**주요 특징**: ${ref.features?.join(', ') || 'N/A'}\n`;
            analysisMessage += `**적합한 제품**: ${ref.bestFor || 'N/A'}\n`;
            
            // 샘플 이미지 추가
            if (ref.sampleImages && ref.sampleImages.length > 0) {
              analysisMessage += `**샘플 이미지**:\n`;
              ref.sampleImages.forEach((img: string, imgIndex: number) => {
                analysisMessage += `![${ref.title} 샘플 ${imgIndex + 1}](${img})\n`;
              });
            }
            analysisMessage += `\n`;
          });
        }
        
        setMessages(prev => [...prev, { role: 'ai', content: analysisMessage }]);
      }
    } catch (error) {
      console.error('파일 분석 오류:', error);
      setMessages(prev => [...prev, { role: 'ai', content: '파일 분석 중 오류가 발생했습니다.' }]);
    } finally {
      setFileAnalysisLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || loading) return;
    if (input.trim()) setMessages(prev => [...prev, { role: 'user', content: input }]);
    if (uploadedFiles.length > 0) setMessages(prev => [...prev, { role: 'user', content: `[이미지 ${uploadedFiles.length}개 업로드]` }]);
    
    setLoading(true);
    if (enableWebSearch) {
      setWebSearchLoading(true);
      setMessages(prev => [...prev, { role: 'ai', content: '🔍 웹 검색을 통해 최신 정보를 수집하고 있습니다...' }]);
    }
    
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://my-planner-tool.onrender.com';
      let images: string[] = [];
      if (uploadedFiles.length > 0) {
        images = await Promise.all(uploadedFiles.map(file => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }));
      }
      
      // 웹 검색이 활성화된 경우 노션 AI 챗봇 API 사용
      if (enableWebSearch) {
        const res = await fetch(`${API_BASE}/api/notion/ai-chat`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ 
            message: input, 
            images,
            enableWebSearch: true
          }),
        });
        const data = await res.json();
        if (data.error) {
          let aiMsg = data.error || 'AI 응답 생성에 실패했습니다.';
          setMessages(prev => [...prev, { role: 'ai', content: aiMsg }]);
        } else {
          let aiMsg = data.answer || 'AI 응답을 생성할 수 없습니다.';
          setMessages(prev => [...prev, { role: 'ai', content: aiMsg }]);
        }
      } else {
        // 기존 브리프 API 사용
        const res = await fetch(`${API_BASE}/api/gpt-brief`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ summary: messages.concat(input.trim() ? { role: 'user', content: input } : []), images }),
        });
        const data = await res.json();
        if (data.error) {
          let aiMsg = data.raw || JSON.stringify(data);
          setMessages(prev => [...prev, { role: 'ai', content: aiMsg }]);
        } else {
          let aiMsg = data.brief || JSON.stringify(data);
          setMessages(prev => [...prev, { role: 'ai', content: aiMsg }]);
          if (onAIResult) onAIResult(data);
          setQaList(prev => [
            ...prev,
            {
              question: input,
              answer: aiMsg,
              aiComment: data.aiComment || (data.recommendation ?? undefined)
            }
          ]);
        }
      }
      
      setInput('');
      setUploadedFiles([]);
    } catch (err: any) {
      let aiMsg = err.message || '서버 오류';
      setMessages(prev => [...prev, { role: 'ai', content: aiMsg }]);
      setInput('');
      setUploadedFiles([]);
    } finally {
      setLoading(false);
      setWebSearchLoading(false);
      setTimeout(() => { inputRef.current?.focus(); }, 100);
    }
  };

  useEffect(() => {
    if (onQAListChange) onQAListChange(qaList);
  }, [qaList, onQAListChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div style={{ width: 680, height, background: '#fff', borderRadius: 18, boxShadow: '0 2px 16px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', padding: 24, ...style }}>
      {/* 브리프 샘플 및 샘플 질문 버튼 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
        <button
          onClick={() => setEnableWebSearch(!enableWebSearch)}
          style={{
            background: enableWebSearch ? '#10b981' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.2s'
          }}
        >
          {enableWebSearch ? '🌐 웹 검색 ON' : '🌐 웹 검색 OFF'}
        </button>
        {uploadedFiles.length > 0 && (
          <button
            onClick={handleFileAnalysis}
            disabled={fileAnalysisLoading}
            style={{
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: fileAnalysisLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: fileAnalysisLoading ? 0.6 : 1
            }}
          >
            {fileAnalysisLoading ? '🔍 분석 중...' : '📊 파일 분석'}
          </button>
        )}
      </div>
      
      {/* 업로드된 파일 목록 */}
      {uploadedFiles.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '12px', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #b3d9ff' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#0066cc' }}>
            📁 업로드된 파일 ({uploadedFiles.length}개)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                style={{
                  padding: '6px 12px',
                  background: '#e6f3ff',
                  borderRadius: '16px',
                  fontSize: '12px',
                  color: '#0066cc',
                  border: '1px solid #b3d9ff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {file.type.startsWith('image/') ? '🖼️' : '📄'} {file.name}
                <button
                  onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff6b6b',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '0',
                    marginLeft: '4px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          {/* 제품 정보 입력 필드 */}
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#495057' }}>
            📝 제품 정보 (선택사항)
          </div>
          <input
            type="text"
            value={productInfo}
            onChange={(e) => setProductInfo(e.target.value)}
            placeholder="제품명, 브랜드, 주요 특징 등을 입력하면 더 정확한 분석이 가능합니다"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ced4da',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
        {messages.map((msg, i) => {
          // HTML table 감지
          const isTable = /<table[\s\S]*<\/table>/.test(msg.content);
          return (
            <div key={i} style={{ margin: '12px 0', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
              {isTable ? (
                <div className="markdown-brief" dangerouslySetInnerHTML={{ __html: msg.content }} />
              ) : (
                <div style={{ 
                  display: 'inline-block', 
                  padding: '12px 18px', 
                  borderRadius: 16, 
                  background: msg.role === 'user' ? '#e3f0ff' : '#f6f6f6', 
                  color: '#222', 
                  maxWidth: 520, 
                  wordBreak: 'break-word', 
                  whiteSpace: 'pre-line', 
                  fontSize: 17, 
                  boxShadow: msg.role === 'user' ? '0 1px 4px #b6d4fe33' : '0 1px 4px #eee',
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
                              fontWeight: line.includes('---') ? '600' : 'normal',
                              marginBottom: '4px'
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
                        // 이미지 처리
                        if (line.includes('![') && line.includes('](') && line.includes(')')) {
                          const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                          if (match) {
                            const [, alt, src] = match;
                            return (
                              <div key={lineIdx} style={{ margin: '8px 0' }}>
                                <img 
                                  src={src} 
                                  alt={alt} 
                                  style={{ 
                                    maxWidth: '100%', 
                                    height: 'auto', 
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb'
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            );
                          }
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
                        
                        // 코드 블록 처리
                        if (line.includes('`')) {
                          const parts = line.split('`');
                          return (
                            <div key={lineIdx}>
                              {parts.map((part, partIdx) => (
                                <span key={partIdx} style={{ 
                                  background: partIdx % 2 === 1 ? '#f1f5f9' : 'transparent',
                                  padding: partIdx % 2 === 1 ? '2px 6px' : '0',
                                  borderRadius: partIdx % 2 === 1 ? '4px' : '0',
                                  fontFamily: partIdx % 2 === 1 ? 'monospace' : 'inherit',
                                  fontSize: partIdx % 2 === 1 ? '13px' : 'inherit'
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
              )}
            </div>
          );
        })}
        {loading && (
          <div style={{ color: '#888', fontSize: 15 }}>
            {webSearchLoading ? '🔍 웹 검색 중...' : fileAnalysisLoading ? '🔍 파일 분석 중...' : 'AI가 답변 중...'}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); }}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder="궁금한 점이나 정보를 입력하세요"
          style={{ flex: 1, padding: '16px 22px', borderRadius: 32, border: '1.5px solid #bbb', fontSize: 18, boxShadow: '0 2px 8px #e3e3e3', outline: 'none', background: '#fafbfc', transition: 'border 0.2s', minWidth: 0 }}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || (!input.trim() && uploadedFiles.length === 0)} style={{ padding: '0 28px', borderRadius: 32, background: '#1976d2', color: '#fff', border: 'none', fontWeight: 600, fontSize: 18, cursor: 'pointer', height: 48 }}>전송</button>
        <FileUploader files={uploadedFiles} onFileSelect={setUploadedFiles} simple />
      </div>
    </div>
  );
};

export default AIChatBox; 