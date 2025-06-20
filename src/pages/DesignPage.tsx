import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormData } from '../components/FormDataContext';

const FIELDS = [
  {
    label: '디자인\n컨셉\n방향',
    guide: '원하는 방향을 기재해주세요/ 미기재시 패키지 컬러에 맞춰 임의로 디자인 진행될 수 있습니다.',
    examples: [
      'ex) 과학적이고 전문적인 느낌 강조, 실사와 그래픽 위주의 디자인 선호, 아이코니나 일러스트 느낌 배제, 러블리한 컨셉 제외',
      'ex) 여름 컨셉에 맞추고 싶어요. 화이트톤과 블루를 적절히 사용하고 싶고, 제품 패키지의 캐릭터를 활용하고 싶습니다.'
    ]
  },
  {
    label: '메인\n컬러',
    guide: '원하는 방향을 기재해주세요/ 미기재시 패키지 컬러에 맞춰 임의로 디자인 진행될 수 있습니다.',
    examples: [
      'ex) 화이트+옐로우(색감대비포인트위해 선정한 컬러이며, 추천해주셔도 좋습니다.',
      'ex) 블루베리나 보라색 포인트는 조금 식상한것 같아서 대비컬러로 진행 요청'
    ]
  }
];

export default function DesignPage() {
  const { formData, setFormData } = useFormData();
  const navigate = useNavigate();
  const [previews, setPreviews] = useState<string[]>([]);
  const [previewsColor, setPreviewsColor] = useState<string[]>([]);
  const values = formData.design.values;
  const images = formData.design.images;
  const imagesColor = formData.design.imagesColor;
  const referenceLinks = formData.design.referenceLinks;
  const [referenceEditMode, setReferenceEditMode] = useState(referenceLinks.map(() => true));
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setPreviews(images.map(img => (img instanceof File ? URL.createObjectURL(img) : img)));
    setPreviewsColor(imagesColor.map(img => (img instanceof File ? URL.createObjectURL(img) : img)));
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
      previewsColor.forEach(url => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line
  }, [images.length, imagesColor.length]);

  useEffect(() => {
    if (user.email) {
      const temp = localStorage.getItem(`temp_DesignPage_${user.email}`);
      if (temp) {
        if (window.confirm('임시 저장된 데이터가 있습니다. 불러오시겠습니까?')) {
          setFormData((prev: any) => ({ ...prev, design: JSON.parse(temp) }));
        }
      }
    }
  }, []);

  const handleTempSave = () => {
    if (user.email) {
      localStorage.setItem(`temp_DesignPage_${user.email}`, JSON.stringify(formData.design));
      alert('임시 저장되었습니다!');
    }
  };

  // 파일 업로드 핸들러
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    setFormData(prev => ({
      ...prev,
      design: { ...prev.design, images: [...prev.design.images, ...arr] }
    }));
  };
  // 드래그&드롭
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };
  const handleRemove = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      design: { ...prev.design, images: prev.design.images.filter((_, i) => i !== idx) }
    }));
  };

  const handleFilesColor = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    setFormData(prev => ({
      ...prev,
      design: { ...prev.design, imagesColor: [...prev.design.imagesColor, ...arr] }
    }));
  };
  const handleDropColor = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFilesColor(e.dataTransfer.files);
  };
  const handleRemoveColor = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      design: { ...prev.design, imagesColor: prev.design.imagesColor.filter((_, i) => i !== idx) }
    }));
  };

  // 링크 행 추가/삭제 핸들러
  const addReferenceLink = () => {
    setFormData(prev => ({
      ...prev,
      design: { ...prev.design, referenceLinks: [...prev.design.referenceLinks, ''] }
    }));
    setReferenceEditMode(modes => [...modes, true]);
  };
  const removeReferenceLink = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      design: { ...prev.design, referenceLinks: prev.design.referenceLinks.filter((_, i) => i !== idx) }
    }));
    setReferenceEditMode(modes => modes.filter((_, i) => i !== idx));
  };

  // 각 입력값 변경 핸들러
  const handleValueChange = (idx: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      design: { ...prev.design, values: prev.design.values.map((v, i) => i === idx ? value : v) }
    }));
  };
  const handleReferenceLinksChange = (idx: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      design: { ...prev.design, referenceLinks: prev.design.referenceLinks.map((v, i) => i === idx ? value : v) }
    }));
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f7f7f7', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60 }}>
      <div style={{ width: '100%', maxWidth: 950, background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 36, marginTop: 32, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ marginBottom: 16, textAlign: 'left' }}>작업의뢰서 | 디자인</h2>
          <button type="button" onClick={handleTempSave} style={{ padding: '8px 18px', fontSize: 15, background: '#eee', color: '#222', border: '1px solid #bbb', borderRadius: 6, cursor: 'pointer', fontWeight: 600, marginLeft: 16 }}>임시 저장</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 15 }}>
          <tbody>
            {/* 디자인 컨셉 방향 행 */}
            <tr>
              <td style={{ width: 120, background: '#f0f4fa', fontWeight: 700, fontSize: 17, border: '1px solid #ccc', padding: 16, textAlign: 'center', whiteSpace: 'pre-line', verticalAlign: 'top' }}>{FIELDS[0].label}</td>
              <td style={{ border: '1px solid #ccc', padding: 18, verticalAlign: 'top' }}>
                <div style={{ color: '#e53935', fontWeight: 500, fontSize: 15, marginBottom: 6 }}>{FIELDS[0].guide}</div>
                {FIELDS[0].examples.map((ex, i) => (
                  <div key={i} style={{ color: '#aaa', fontSize: 15, marginBottom: 2 }}>{ex}</div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span style={{ color: '#222', fontWeight: 400, fontSize: 15 }}>→</span>
                  <textarea
                    value={values[0]}
                    onChange={e => handleValueChange(0, e.target.value)}
                    placeholder="내용을 기재해주세요"
                    rows={2}
                    style={{ flex: 1, minWidth: 0, minHeight: 36, padding: '10px 12px', border: '1px solid #ccc', borderRadius: 4, fontSize: 15, color: '#222', background: '#fff', fontWeight: 400, resize: 'vertical', width: '100%' }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        {/* 이미지 업로드 영역: 디자인 컨셉 방향 아래, 메인 컬러 위 */}
        <div style={{ margin: '24px 0' }}>
          <div style={{ color: '#e53935', fontWeight: 500, marginBottom: 8 }}>* 마음에 드는 디자인요소가 있으시다면 사진을 첨부해주세요.</div>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            style={{ border: '2px dashed #bbb', borderRadius: 8, background: '#fafafa', padding: 24, textAlign: 'center', cursor: 'pointer', marginBottom: 12 }}
            onClick={() => document.getElementById('design-image-upload')?.click()}
          >
            <input
              id="design-image-upload"
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
            <div style={{ color: '#888', fontSize: 15, marginBottom: 4 }}>이미지 파일을 끌어다 놓거나 클릭하여 업로드</div>
            <div style={{ color: '#bbb', fontSize: 13, marginBottom: previews.length > 0 ? 16 : 0 }}>(여러 장 첨부 가능)</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {previews.map((url, i) => (
                <div key={i} style={{ position: 'relative', width: 120, height: 120, border: '1px solid #ccc', borderRadius: 8, overflow: 'hidden', background: '#fff', marginBottom: 0 }}>
                  <img src={url} alt={`design-upload-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleRemove(i); }}
                    style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: 24, height: 24, fontWeight: 700, color: '#d32f2f', cursor: 'pointer', fontSize: 18, lineHeight: '24px', textAlign: 'center', padding: 0 }}
                    title="삭제"
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 15 }}>
          <tbody>
            {/* 메인 컬러 행 */}
            <tr>
              <td style={{ width: 120, background: '#f0f4fa', fontWeight: 700, fontSize: 17, border: '1px solid #ccc', padding: 16, textAlign: 'center', whiteSpace: 'pre-line', verticalAlign: 'top' }}>{FIELDS[1].label}</td>
              <td style={{ border: '1px solid #ccc', padding: 18, verticalAlign: 'top' }}>
                <div style={{ color: '#e53935', fontWeight: 500, fontSize: 15, marginBottom: 6 }}>{FIELDS[1].guide}</div>
                {FIELDS[1].examples.map((ex, i) => (
                  <div key={i} style={{ color: '#aaa', fontSize: 15, marginBottom: 2 }}>{ex}</div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span style={{ color: '#222', fontWeight: 400, fontSize: 15 }}>→</span>
                  <textarea
                    value={values[1]}
                    onChange={e => handleValueChange(1, e.target.value)}
                    placeholder="내용을 기재해주세요"
                    rows={2}
                    style={{ flex: 1, minWidth: 0, minHeight: 36, padding: '10px 12px', border: '1px solid #ccc', borderRadius: 4, fontSize: 15, color: '#222', background: '#fff', fontWeight: 400, resize: 'vertical', width: '100%' }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        {/* 메인컬러 행 밑 파일업로드 */}
        <div style={{ margin: '24px 0' }}>
          <div style={{ color: '#e53935', fontWeight: 500, marginBottom: 8 }}>*원하시는 컬러의 요소가 있으시다면 사진을 첨부해주세요.</div>
          <div
            onDrop={handleDropColor}
            onDragOver={e => e.preventDefault()}
            style={{ border: '2px dashed #bbb', borderRadius: 8, background: '#fafafa', padding: 24, textAlign: 'center', cursor: 'pointer', marginBottom: 12 }}
            onClick={() => document.getElementById('color-image-upload')?.click()}
          >
            <input
              id="color-image-upload"
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFilesColor(e.target.files)}
            />
            <div style={{ color: '#888', fontSize: 15, marginBottom: 4 }}>이미지 파일을 끌어다 놓거나 클릭하여 업로드</div>
            <div style={{ color: '#bbb', fontSize: 13, marginBottom: previewsColor.length > 0 ? 16 : 0 }}>(여러 장 첨부 가능)</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {previewsColor.map((url, i) => (
                <div key={i} style={{ position: 'relative', width: 120, height: 120, border: '1px solid #ccc', borderRadius: 8, overflow: 'hidden', background: '#fff', marginBottom: 0 }}>
                  <img src={url} alt={`color-upload-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleRemoveColor(i); }}
                    style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: 24, height: 24, fontWeight: 700, color: '#d32f2f', cursor: 'pointer', fontSize: 18, lineHeight: '24px', textAlign: 'center', padding: 0 }}
                    title="삭제"
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* 디자인 참고 레퍼런스 테이블 - 위치 이동 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 15 }}>
          <tbody>
            {referenceLinks.map((link, idx) => (
              <tr key={idx}>
                {idx === 0 && (
                  <td rowSpan={referenceLinks.length + 2} style={{ width: 120, background: '#f0f4fa', fontWeight: 700, fontSize: 17, border: '1px solid #222', padding: 16, textAlign: 'center', whiteSpace: 'pre-line', verticalAlign: 'top' }}>
                    디자인<br/>참고<br/>레퍼런스
                  </td>
                )}
                <td style={{ border: '1px solid #222', padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {referenceEditMode[idx] ? (
                      <input
                        type="text"
                        placeholder="링크를 입력하세요"
                        value={link}
                        onChange={e => handleReferenceLinksChange(idx, e.target.value)}
                        onBlur={() => {
                          if (/^https?:\/\//.test(link.trim())) {
                            setReferenceEditMode(modes => modes.map((m, i) => i === idx ? false : m));
                          }
                        }}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid #bbb', borderRadius: 4, fontSize: 15 }}
                        autoFocus
                      />
                    ) : (
                      <>
                        <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: '#0099bb', textDecoration: 'underline', wordBreak: 'break-all', flex: 1 }}>{link}</a>
                        <button type="button" onClick={() => setReferenceEditMode(modes => modes.map((m, i) => i === idx ? true : m))} style={{ fontSize: 14, padding: '2px 10px', border: '1px solid #bbb', borderRadius: 4, background: '#fff', color: '#222', cursor: 'pointer' }}>수정</button>
                      </>
                    )}
                    {referenceLinks.length >= 4 && (
                      <button type="button" onClick={() => removeReferenceLink(idx)} style={{ fontSize: 14, padding: '2px 10px', border: '1px solid #bbb', borderRadius: 4, background: '#fff', color: '#d32f2f', cursor: 'pointer' }}>삭제</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {/* 추가하기 버튼 */}
            <tr>
              <td style={{ border: 'none', padding: '10px 0 0 0', textAlign: 'left' }}>
                <button type="button" onClick={addReferenceLink} style={{ fontSize: 15, padding: '6px 18px', border: '1px solid #0099bb', borderRadius: 4, background: '#fff', color: '#0099bb', fontWeight: 600, cursor: 'pointer' }}>+ 추가하기</button>
              </td>
            </tr>
            {/* 안내문구/예시/입력란 행 */}
            <tr>
              <td style={{ border: '1px solid #222', padding: 18, verticalAlign: 'top', background: '#fff8f8' }}>
                <div style={{ color: '#e53935', fontWeight: 500, fontSize: 15, marginBottom: 4 }}>선정 이유를 기재해주세요</div>
                <div style={{ color: '#bbb', fontSize: 15, marginBottom: 2 }}>ex) 전체적으로 제품의 포인트 컬러를 살려 짙한 톤의 컬러가 들어간 부분이 마음에 들어요.<br/>ex) 레이아웃이나 디자인 요소가 마음에 들어요<br/>ex) 셀링 포인트에 대한 설명이 간결하고 마음에 들어요</div>
                <div style={{ color: '#aaa', fontSize: 14, marginBottom: 6 }}>
                  **레퍼런스 내에서 어떤 부분 참고하면 좋을지 명확하게 작성 부탁드립니다. 자세하게 작성해주실수록 빠른 소통이 가능합니다.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span style={{ color: '#222', fontWeight: 400, fontSize: 15 }}>→</span>
                  <textarea
                    placeholder="내용을 기재해주세요"
                    rows={2}
                    style={{ flex: 1, minWidth: 0, minHeight: 36, padding: '10px 12px', border: '1px solid #ccc', borderRadius: 4, fontSize: 15, color: '#222', background: '#fff', fontWeight: 400, resize: 'vertical', width: '100%' }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" onClick={() => navigate(-1)} style={{ flex: 1, padding: 14, fontSize: 17, background: '#eee', color: '#222', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>이전</button>
          <button type="button" onClick={() => navigate('/shooting')} style={{ flex: 1, padding: 14, fontSize: 17, background: '#111', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>6개 중 5페이지</button>
        </div>
      </div>
    </div>
  );
} 