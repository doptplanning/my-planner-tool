import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormData } from '../components/FormDataContext';

export default function ShootingPage() {
  const { formData, setFormData } = useFormData();
  const navigate = useNavigate();
  const [previews, setPreviews] = React.useState<string[]>([]);
  const concept = formData.shooting.concept;
  const reference = formData.shooting.reference;
  const images = formData.shooting.images;
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    setPreviews(images.map(img => (img instanceof File ? URL.createObjectURL(img) : img)));
    return () => { previews.forEach(url => URL.revokeObjectURL(url)); };
  }, [images.length]);

  useEffect(() => {
    if (user.email) {
      const temp = localStorage.getItem(`temp_ShootingPage_${user.email}`);
      if (temp) {
        if (window.confirm('임시 저장된 데이터가 있습니다. 불러오시겠습니까?')) {
          setFormData((prev: any) => ({ ...prev, shooting: JSON.parse(temp) }));
        }
      }
    }
  }, []);

  const handleTempSave = () => {
    if (user.email) {
      localStorage.setItem(`temp_ShootingPage_${user.email}`, JSON.stringify(formData.shooting));
      alert('임시 저장되었습니다!');
    }
  };

  // 입력값 변경 핸들러
  const handleConceptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, shooting: { ...prev.shooting, concept: e.target.value } }));
  };
  const handleReferenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, shooting: { ...prev.shooting, reference: e.target.value } }));
  };
  // 이미지 업로드 핸들러
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    setFormData(prev => ({ ...prev, shooting: { ...prev.shooting, images: [...prev.shooting.images, ...arr] } }));
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };
  const handleRemove = (idx: number) => {
    setFormData(prev => ({ ...prev, shooting: { ...prev.shooting, images: prev.shooting.images.filter((_, i) => i !== idx) } }));
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f7f7f7', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60 }}>
      <div style={{ width: '100%', maxWidth: 950, background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 36, marginTop: 32, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ marginBottom: 16, textAlign: 'left' }}>작업의뢰서 | 촬영</h2>
          <button type="button" onClick={handleTempSave} style={{ padding: '8px 18px', fontSize: 15, background: '#eee', color: '#222', border: '1px solid #bbb', borderRadius: 6, cursor: 'pointer', fontWeight: 600, marginLeft: 16 }}>임시 저장</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 15 }}>
          <tbody>
            <tr>
              <td style={{ width: 120, background: '#f0f4fa', fontWeight: 700, fontSize: 17, border: '1px solid #222', padding: 16, textAlign: 'center', whiteSpace: 'pre-line', verticalAlign: 'top' }}>{`연출컷\n촬영\n컨셉\n방향`.replace(/\\n/g, '\n')}</td>
              <td style={{ border: '1px solid #222', padding: 18, verticalAlign: 'top' }}>
                <div style={{ color: '#e53935', fontWeight: 500, fontSize: 15, marginBottom: 4 }}>내용을 기재해주세요</div>
                <div style={{ color: '#bbb', fontSize: 15, marginBottom: 2 }}>ex) 젊은 타겟층을 위한 제품으로 선명하고 채도 높은 컬러 배경지 활용.<br/>ex) 주 소비층이 자기 관리에 관심이 있어 운동 소품을 활용한 연출.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span style={{ color: '#222', fontWeight: 400, fontSize: 15 }}>→</span>
                  <textarea
                    value={concept}
                    onChange={handleConceptChange}
                    placeholder="내용을 기재해주세요"
                    rows={2}
                    style={{ flex: 1, minWidth: 0, minHeight: 36, padding: '10px 12px', border: '1px solid #ccc', borderRadius: 4, fontSize: 15, color: '#222', background: '#fff', fontWeight: 400, resize: 'vertical', width: '100%' }}
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ width: 120, background: '#f0f4fa', fontWeight: 700, fontSize: 17, border: '1px solid #222', padding: 16, textAlign: 'center', whiteSpace: 'pre-line', verticalAlign: 'top' }}>{`촬영\n참고\n레퍼런스`.replace(/\\n/g, '\n')}</td>
              <td style={{ border: '1px solid #222', padding: 18, verticalAlign: 'top' }}>
                <div style={{ color: '#e53935', fontWeight: 500, fontSize: 15, marginBottom: 4 }}>선정 이유를 기재해주세요</div>
                <div style={{ color: '#bbb', fontSize: 15, marginBottom: 2 }}>ex) 제품에 제형이 잘 보이게 연출된 부분이 좋아요<br/>ex) 색감, 분위기, 컨셉이 마음에들어요<br/>ex) 전체적인 컬러사용이 패키지와 어우러져서 좋아요</div>
                <div style={{ color: '#aaa', fontSize: 14, marginBottom: 6 }}>
                  **레퍼런스 내에서 어떤 부분 참고하면 좋을지 명확하게 작성 부탁드립니다. 자세하게 작성해주실수록 빠른 소통이 가능합니다.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span style={{ color: '#222', fontWeight: 400, fontSize: 15 }}>→</span>
                  <textarea
                    value={reference}
                    onChange={handleReferenceChange}
                    placeholder="내용을 기재해주세요"
                    rows={2}
                    style={{ flex: 1, minWidth: 0, minHeight: 36, padding: '10px 12px', border: '1px solid #ccc', borderRadius: 4, fontSize: 15, color: '#222', background: '#fff', fontWeight: 400, resize: 'vertical', width: '100%' }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ color: '#e53935', fontWeight: 500, marginBottom: 8 }}>* 마음에 드는 촬영컨셉 사진을 첨부해주세요.</div>
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          style={{ border: '2px dashed #bbb', borderRadius: 8, background: '#fafafa', padding: 24, textAlign: 'center', cursor: 'pointer', marginBottom: 24 }}
          onClick={() => document.getElementById('shooting-image-upload')?.click()}
        >
          <input
            id="shooting-image-upload"
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
                <img src={url} alt={`shooting-upload-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
    </div>
  );
} 