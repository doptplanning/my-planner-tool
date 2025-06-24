import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFormData } from '../components/FormDataContext';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

function makeSummaryText(formData: any) {
  // formData를 AI가 이해하기 쉬운 구조적인 텍스트로 변환
  let text = '다음은 상세페이지 기획을 위한 사용자 입력 데이터입니다.\n\n';

  text += `## 1. 기본 정보\n`;
  Object.entries(formData.upload).forEach(([k, v]) => {
    if (v) text += `- ${k}: ${v}\n`;
  });

  text += `\n## 2. 제품스펙\n`;
  Object.entries(formData.productSpec).forEach(([k, v]) => {
    if (v) text += `- ${k}: ${v}\n`;
  });

  if (formData.plan) {
    text += `\n## 3. 기획 의도\n- ${formData.plan}\n`;
  }

  if (formData.usp && formData.usp.some((u: any) => u.function || u.desc)) {
    text += `\n## 4. 주요 특장점 (USP)\n`;
    formData.usp.forEach((u: any) => {
      if (u.function || u.desc) text += `- ${u.function || '특장점'}: ${u.desc || '설명 없음'}\n`;
    });
  }

  if (formData.design && (formData.design.values?.length > 0 || formData.design.referenceLinks?.length > 0)) {
    text += `\n## 5. 디자인 컨셉\n`;
    if (formData.design.values?.length > 0) {
        text += '### 선호하는 디자인 키워드\n'
        formData.design.values.forEach((v: string) => { text += `- ${v}\n`; });
    }
    if (formData.design.referenceLinks?.length > 0 && formData.design.referenceLinks[0]) {
        text += `\n### 참고 레퍼런스 링크\n- ${formData.design.referenceLinks.join('\n- ')}\n`;
    }
  }

  if (formData.shooting && (formData.shooting.concept || formData.shooting.reference)) {
    text += `\n## 6. 촬영 컨셉\n`;
    if(formData.shooting.concept) text += `- 컨셉: ${formData.shooting.concept}\n`;
    if(formData.shooting.reference) text += `- 레퍼런스: ${formData.shooting.reference}\n`;
  }

  return text;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export default function CompletePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { finalFormData } = location.state || { finalFormData: useFormData().formData };
  const [brief, setBrief] = useState<string>('AI 브리프 생성 중...');

  useEffect(() => {
    // location.state에서 데이터를 받지 못한 경우를 대비한 안전장치
    if (!finalFormData || Object.keys(finalFormData.upload).length === 0) {
      setBrief('오류: 브리프를 생성할 데이터가 없습니다. 다시 시도해주세요.');
      return;
    }

    // === 유저별 formData 저장 ===
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.email) {
      localStorage.setItem(`formData_${user.email}`, JSON.stringify(finalFormData));
    }
    // === 유저별 formData 저장 끝 ===

    async function fetchBrief() {
      // 기존 summaryText 대신, 대화 내역(messages) 배열을 만들어 전달
      const messages = [];
      // 예시: 각 주요 항목을 질문/답변 쌍으로 messages에 추가 (실제 대화 내역이 있다면 그걸 사용)
      if (finalFormData.upload) {
        Object.entries(finalFormData.upload).forEach(([k, v]) => {
          if (v) {
            messages.push({ role: 'user', content: `${k} 알려줘` });
            messages.push({ role: 'ai', content: v });
          }
        });
      }
      if (finalFormData.productSpec) {
        Object.entries(finalFormData.productSpec).forEach(([k, v]) => {
          if (v) {
            messages.push({ role: 'user', content: `${k} 스펙은?` });
            messages.push({ role: 'ai', content: v });
          }
        });
      }
      if (finalFormData.plan) {
        messages.push({ role: 'user', content: '개발/판매 동기 알려줘' });
        messages.push({ role: 'ai', content: finalFormData.plan });
      }
      if (finalFormData.usp) {
        finalFormData.usp.forEach((u: any, i: number) => {
          if (u.function || u.desc) {
            messages.push({ role: 'user', content: `USP${i + 1} 알려줘` });
            messages.push({ role: 'ai', content: `${u.function || ''} ${u.desc || ''}` });
          }
        });
      }
      if (finalFormData.design) {
        if (finalFormData.design.values?.length > 0) {
          finalFormData.design.values.forEach((v: string, i: number) => {
            if (v) {
              messages.push({ role: 'user', content: `디자인 컨셉${i + 1} 알려줘` });
              messages.push({ role: 'ai', content: v });
            }
          });
        }
        if (finalFormData.design.referenceLinks?.length > 0) {
          finalFormData.design.referenceLinks.forEach((l: string, i: number) => {
            if (l) {
              messages.push({ role: 'user', content: `디자인 참고 레퍼런스${i + 1} 알려줘` });
              messages.push({ role: 'ai', content: l });
            }
          });
        }
      }
      if (finalFormData.shooting) {
        if (finalFormData.shooting.concept) {
          messages.push({ role: 'user', content: '촬영 컨셉 알려줘' });
          messages.push({ role: 'ai', content: finalFormData.shooting.concept });
        }
        if (finalFormData.shooting.reference) {
          messages.push({ role: 'user', content: '촬영 참고 레퍼런스 알려줘' });
          messages.push({ role: 'ai', content: finalFormData.shooting.reference });
        }
      }

      const imagePromises = (finalFormData.shooting.images || []).map((file: File) => toBase64(file));
      const imageBase64s = await Promise.all(imagePromises);

      try {
        const res = await fetch('/api/gpt-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ summary: messages, images: imageBase64s }),
        });
        const data = await res.json();
        setBrief(data.brief || '브리프 생성 실패');
      } catch (e) {
        setBrief('브리프 생성 실패');
      }
    }
    fetchBrief();
  }, [finalFormData]);

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f7f7f7', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
      <div style={{ width: '100%', maxWidth: 900, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.10)', padding: 48, textAlign: 'center' }}>
        <h2 style={{ fontSize: 32, marginBottom: 24, color: '#222', fontWeight: 700 }}>수고하셨습니다.</h2>
        <div style={{ color: '#888', fontSize: 18, marginBottom: 32 }}>모든 입력이 정상적으로 완료되었습니다.</div>
        <div style={{ margin: '32px 0', textAlign: 'left' }}>
          <h3 style={{ fontSize: 20, marginBottom: 12 }}>AI 브리프</h3>
          <div style={{ background: '#f8f8f8', borderRadius: 8, padding: '8px 24px', minHeight: 80, color: '#222', fontSize: 16, lineHeight: 1.7 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{brief}</ReactMarkdown>
          </div>
        </div>
        <button type="button" onClick={() => navigate('/')} style={{ padding: '14px 40px', fontSize: 18, background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>처음으로</button>
      </div>
    </div>
  );
} 