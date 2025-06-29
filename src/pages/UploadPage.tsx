import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormData } from '../components/FormDataContext';
import AIChatBox from '../components/AIChat/AIChatBox';

export default function UploadPage() {
  const { formData, setFormData } = useFormData();
  const navigate = useNavigate();
  const form = formData.upload;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  useEffect(() => {
    if (user.email) {
      const temp = localStorage.getItem(`temp_UploadPage_${user.email}`);
      if (temp) {
        if (window.confirm('임시 저장된 데이터가 있습니다. 불러오시겠습니까?')) {
          setFormData(prev => ({
            ...prev,
            upload: { ...prev.upload, ...JSON.parse(temp) }
          }));
        }
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      upload: { ...prev.upload, [e.target.name]: e.target.value }
    }));
  };

  const handleNext = () => {
    navigate('/product-spec');
  };

  const handleTempSave = () => {
    if (user.email) {
      localStorage.setItem(`temp_UploadPage_${user.email}`, JSON.stringify(form));
      alert('임시 저장되었습니다!');
    }
  };

  // AI 대화 결과로 폼 자동 채우기
  const handleAIResult = (data: any) => {
    // data.brief 등에서 필요한 정보를 추출해 폼에 반영 (예시)
    // 실제로는 AI 응답 포맷에 맞게 파싱 필요
    if (data && typeof data === 'object') {
      setFormData(prev => ({
        ...prev,
        upload: {
          ...prev.upload,
          // 예시: AI가 아래 필드명을 맞춰서 반환한다고 가정
          sizeWidth: data.sizeWidth || prev.upload.sizeWidth,
          sizeSites: data.sizeSites || prev.upload.sizeSites,
          product: data.product || prev.upload.product,
          target: data.target || prev.upload.target,
          price: data.price || prev.upload.price,
        }
      }));
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: 'calc(100vh - 60px)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      background: '#fff',
      zIndex: 10,
      paddingTop: 60,
    }}>
      <div style={{ width: '100%', maxWidth: 600, background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 36, boxSizing: 'border-box', marginTop: 32, color: '#222' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ marginBottom: 32, textAlign: 'left' }}>작업의뢰서 | 기본양식</h2>
          <button type="button" onClick={handleTempSave} style={{ padding: '8px 18px', fontSize: 15, background: '#eee', color: '#222', border: '1px solid #bbb', borderRadius: 6, cursor: 'pointer', fontWeight: 600, marginLeft: 16 }}>임시 저장</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); handleNext(); }}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>상세페이지 사이즈 및 노출 사이트</label>
            <div style={{ border: '1px solid #ccc', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #ccc', color: '#e53935', fontWeight: 500, fontSize: 15 }}>
                예시) 가로 860픽셀<span style={{ color: '#e53935' }}>*</span>
              </div>
              <div style={{ padding: '10px 12px', background: '#fff8f8', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #ccc' }}>
                <span style={{ color: '#222', fontWeight: 400, fontSize: 14 }}>→</span>
                <textarea
                  name="sizeWidth"
                  value={form.sizeWidth || ''}
                  onChange={handleChange}
                  placeholder="내용을 기재해주세요"
                  rows={1}
                  style={{ flex: 1, minWidth: 0, minHeight: 36, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 15, color: '#222', background: '#fff', fontWeight: 400, resize: 'vertical' }}
                />
              </div>
              <div style={{ padding: '10px 12px', color: '#e53935', fontWeight: 500, fontSize: 15 }}>
                예시) 네이버 스마트 스토어, 와디즈, 카카오 선물하기, 쿠팡, 올리브영, GS홈쇼핑 등
              </div>
              <div style={{ padding: '10px 12px', background: '#fff8f8', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #ccc' }}>
                <span style={{ color: '#222', fontWeight: 400, fontSize: 14 }}>→</span>
                <textarea
                  name="sizeSites"
                  value={form.sizeSites || ''}
                  onChange={handleChange}
                  placeholder="내용을 기재해주세요"
                  rows={1}
                  style={{ flex: 1, minWidth: 0, minHeight: 36, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 15, color: '#222', background: '#fff', fontWeight: 400, resize: 'vertical' }}
                />
              </div>
              <div style={{ padding: '10px 12px', background: '#ffeaea', color: '#e53935', fontWeight: 500, fontSize: 14 }}>
                <span style={{ fontWeight: 600 }}>* 미 기재시 스마트스토어 모바일 최적화 사이즈인 가로 860픽셀</span>로 진행되며,<br/>
                <span style={{ fontWeight: 600 }}>디자인 진행 후 사이트 변경 요청시</span> 리디자인 진행되어야 하는 부분으로 <span style={{ fontWeight: 700, color: '#d32f2f' }}>추가금액이 발생</span>됩니다.
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontWeight: 600 }}>제품명/모델명/구성</label>
            <div style={{ border: '1px solid #ccc', borderRadius: 6, overflow: 'hidden', marginBottom: 8, marginTop: 8 }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #ccc', color: '#e53935', fontWeight: 500, fontSize: 15 }}>
                예시) ○○○보풀제거기 / XES1098 / 본품, C타입 충전선, 청소솔, 헤파필터
              </div>
              <div style={{ padding: '10px 12px', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 8, borderBottom: 'none' }}>
                <span style={{ color: '#222', fontWeight: 400, fontSize: 14 }}>→</span>
                <textarea
                  name="product"
                  value={form.product || ''}
                  onChange={handleChange}
                  placeholder="내용을 기재해주세요"
                  rows={1}
                  style={{ flex: 1, minWidth: 0, minHeight: 36, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 15, color: '#222', background: '#fff', fontWeight: 400, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontWeight: 600 }}>주요 타겟</label>
            <div style={{ border: '1px solid #ccc', borderRadius: 6, overflow: 'hidden', marginBottom: 8, marginTop: 8 }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #ccc', color: '#e53935', fontWeight: 500, fontSize: 15 }}>
                예시) 2030 MZ세대, 전연령층, 2030 남성층 등
              </div>
              <div style={{ padding: '10px 12px', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 8, borderBottom: 'none' }}>
                <span style={{ color: '#222', fontWeight: 400, fontSize: 14 }}>→</span>
                <textarea
                  name="target"
                  value={form.target || ''}
                  onChange={handleChange}
                  placeholder="내용을 기재해주세요"
                  rows={1}
                  style={{ flex: 1, minWidth: 0, minHeight: 36, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 15, color: '#222', background: '#fff', fontWeight: 400, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 32 }}>
            <label style={{ fontWeight: 600 }}>제품 가격</label>
            <div style={{ border: '1px solid #ccc', borderRadius: 6, overflow: 'hidden', marginBottom: 8, marginTop: 8 }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #ccc', color: '#e53935', fontWeight: 500, fontSize: 15 }}>
                예시) 상세페이지 기재 필요 시 → 내용을 기재해주세요
              </div>
              <div style={{ padding: '10px 12px', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 8, borderBottom: 'none' }}>
                <span style={{ color: '#222', fontWeight: 400, fontSize: 14 }}>→</span>
                <textarea
                  name="price"
                  value={form.price || ''}
                  onChange={handleChange}
                  placeholder="내용을 기재해주세요"
                  rows={1}
                  style={{ flex: 1, minWidth: 0, minHeight: 36, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: 15, color: '#222', background: '#fff', fontWeight: 400, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
          <button type="submit" style={{ width: '100%', padding: 14, fontSize: 17, background: '#111', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
            6개 중 1페이지
          </button>
        </form>
      </div>
      {/* AI 대화창 우측에 배치 */}
      <div style={{ marginLeft: 32, marginTop: 32 }}>
        <AIChatBox onAIResult={handleAIResult} />
      </div>
    </div>
  );
} 