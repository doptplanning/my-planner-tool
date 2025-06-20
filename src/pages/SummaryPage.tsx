import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormData } from '../components/FormDataContext';

const specFields = [
  '색상', '제품소재', '제품사이즈', '정격', '수입자명', '제조자명', '제조국', 'KC인증번호', '구성품', 'AS처리규정'
];
const designFields = [
  '디자인 컨셉 방향',
  '메인 컬러'
];

export default function SummaryPage() {
  const navigate = useNavigate();
  const { formData } = useFormData();

  // 썸네일용 URL 상태
  const [designImageUrls, setDesignImageUrls] = useState<string[]>([]);
  const [designColorImageUrls, setDesignColorImageUrls] = useState<string[]>([]);
  const [shootingImageUrls, setShootingImageUrls] = useState<string[]>([]);

  useEffect(() => {
    function getImageUrl(img: string | File): string | undefined {
      if (typeof img === 'string') return img;
      if (img instanceof File) return URL.createObjectURL(img);
      return undefined;
    }
    setDesignImageUrls(formData.design.images.map(getImageUrl).filter(Boolean) as string[]);
    setDesignColorImageUrls(formData.design.imagesColor.map(getImageUrl).filter(Boolean) as string[]);
    setShootingImageUrls(formData.shooting.images.map(getImageUrl).filter(Boolean) as string[]);
    // cleanup: revoke object URLs
    return () => {
      designImageUrls.forEach(url => url.startsWith('blob:') && URL.revokeObjectURL(url));
      designColorImageUrls.forEach(url => url.startsWith('blob:') && URL.revokeObjectURL(url));
      shootingImageUrls.forEach(url => url.startsWith('blob:') && URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line
  }, [formData]);

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f7f7f7', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60 }}>
      <div style={{ width: '100%', maxWidth: 950, background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 36, marginTop: 32, boxSizing: 'border-box' }}>
        <h2 style={{ marginBottom: 24, textAlign: 'left' }}>입력 내용 요약</h2>
        {/* 1. 기본 정보 */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>1. 기본 정보 (UploadPage)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8f8f8', borderRadius: 8 }}>
            <tbody>
              {Object.entries(formData.upload).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ background: '#e6eef6', width: 140, fontWeight: 600, border: '1px solid #ccc', padding: 10 }}>{k}</td>
                  <td style={{ border: '1px solid #ccc', padding: 10 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* 업로드 파일 썸네일 */}
          {Array.isArray((formData.upload as any)?.images) && (formData.upload as any).images.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <b>업로드 파일:</b>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {(formData.upload as any).images.map((img: any, i: number) =>
                  typeof img === 'string' ? (
                    <img key={i} src={img} alt='' style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #ccc' }} />
                  ) : (
                    <span key={i} style={{ width: 60, height: 60, display: 'inline-block', background: '#eee', borderRadius: 6, border: '1px solid #ccc', textAlign: 'center', lineHeight: '60px', color: '#888' }}>파일</span>
                  )
                )}
              </div>
            </div>
          )}
        </div>
        {/* 2. 제품스펙 */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>2. 제품스펙 (ProductSpecPage)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8f8f8', borderRadius: 8 }}>
            <tbody>
              {specFields.map(field => (
                <tr key={field}>
                  <td style={{ background: '#e6eef6', width: 140, fontWeight: 600, border: '1px solid #ccc', padding: 10 }}>{field}</td>
                  <td style={{ border: '1px solid #ccc', padding: 10 }}>{formData.productSpec[field] || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 3. 기획 */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>3. 기획 (PlanPage)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8f8f8', borderRadius: 8 }}>
            <tbody>
              <tr>
                <td style={{ background: '#f0f4fa', width: 140, fontWeight: 600, border: '1px solid #ccc', padding: 10 }}>개발 or 판매 동기</td>
                <td style={{ border: '1px solid #ccc', padding: 10 }}>{formData.plan}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* 4. 주요 특장점 */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>4. 주요 특장점 (UspPage)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8f8f8', borderRadius: 8 }}>
            <thead>
              <tr>
                <th style={{ background: '#f8eecb', border: '1px solid #ccc', width: 60, padding: 10 }}>No.</th>
                <th style={{ background: '#f8eecb', border: '1px solid #ccc', width: 180, padding: 10 }}>기능</th>
                <th style={{ background: '#f8eecb', border: '1px solid #ccc', padding: 10 }}>설명</th>
              </tr>
            </thead>
            <tbody>
              {formData.usp.map((row, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #ccc', textAlign: 'center', fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>{row.function}</td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 5. 디자인 */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>5. 디자인 (DesignPage)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8f8f8', borderRadius: 8, marginBottom: 12 }}>
            <tbody>
              {designFields.map((label, idx) => (
                <tr key={label}>
                  <td style={{ background: '#f0f4fa', width: 140, fontWeight: 600, border: '1px solid #ccc', padding: 10 }}>{label}</td>
                  <td style={{ border: '1px solid #ccc', padding: 10 }}>{formData.design.values[idx]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginBottom: 8 }}><b>이미지:</b> {designImageUrls.length === 0 ? '없음' : designImageUrls.map((url, i) => <img key={i} src={url} alt='' style={{ width: 60, height: 60, objectFit: 'cover', marginRight: 6 }} />)}</div>
          <div style={{ marginBottom: 8 }}><b>컬러 이미지:</b> {designColorImageUrls.length === 0 ? '없음' : designColorImageUrls.map((url, i) => <img key={i} src={url} alt='' style={{ width: 60, height: 60, objectFit: 'cover', marginRight: 6 }} />)}</div>
          <div><b>링크:</b> {formData.design.referenceLinks.map((l, i) => <span key={i}>{l} </span>)}</div>
        </div>
        {/* 6. 촬영 */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>6. 촬영 (ShootingPage)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8f8f8', borderRadius: 8, marginBottom: 12 }}>
            <tbody>
              <tr>
                <td style={{ background: '#f0f4fa', width: 140, fontWeight: 600, border: '1px solid #ccc', padding: 10 }}>연출컷 촬영 컨셉 방향</td>
                <td style={{ border: '1px solid #ccc', padding: 10 }}>{formData.shooting.concept}</td>
              </tr>
              <tr>
                <td style={{ background: '#f0f4fa', width: 140, fontWeight: 600, border: '1px solid #ccc', padding: 10 }}>촬영 참고 레퍼런스</td>
                <td style={{ border: '1px solid #ccc', padding: 10 }}>{formData.shooting.reference}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginBottom: 8 }}><b>이미지:</b> {shootingImageUrls.length === 0 ? '없음' : shootingImageUrls.map((url, i) => <img key={i} src={url} alt='' style={{ width: 60, height: 60, objectFit: 'cover', marginRight: 6 }} />)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" onClick={() => navigate(-1)} style={{ flex: 1, padding: 14, fontSize: 17, background: '#eee', color: '#222', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>이전</button>
          <button type="button" onClick={() => navigate('/complete', { state: { finalFormData: formData } })} style={{ flex: 1, padding: 14, fontSize: 17, background: '#111', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>제출 완료</button>
        </div>
      </div>
    </div>
  );
} 