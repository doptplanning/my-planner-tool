import { useNavigate } from 'react-router-dom';
import { useFormData } from '../components/FormDataContext';
import { useEffect } from 'react';

export default function UspPage() {
  const { formData, setFormData } = useFormData();
  const navigate = useNavigate();
  const usps = formData.usp;
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (user.email) {
      const temp = localStorage.getItem(`temp_UspPage_${user.email}`);
      if (temp) {
        if (window.confirm('임시 저장된 데이터가 있습니다. 불러오시겠습니까?')) {
          setFormData((prev: any) => ({ ...prev, usp: JSON.parse(temp) }));
        }
      }
    }
  }, []);

  const handleChange = (idx: number, key: 'function' | 'desc', value: string) => {
    setFormData(prev => ({
      ...prev,
      usp: prev.usp.map((row, i) => i === idx ? { ...row, [key]: value } : row)
    }));
  };

  const handleNext = () => {
    navigate('/design');
  };

  const handleTempSave = () => {
    if (user.email) {
      localStorage.setItem(`temp_UspPage_${user.email}`, JSON.stringify(formData.usp));
      alert('임시 저장되었습니다!');
    }
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f7f7f7', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60 }}>
      <div style={{ width: '100%', maxWidth: 1000, background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 36, marginTop: 32, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ marginBottom: 16, textAlign: 'left' }}>작업의뢰서 | 기획</h2>
          <button type="button" onClick={handleTempSave} style={{ padding: '8px 18px', fontSize: 15, background: '#eee', color: '#222', border: '1px solid #bbb', borderRadius: 6, cursor: 'pointer', fontWeight: 600, marginLeft: 16 }}>임시 저장</button>
        </div>
        <div style={{ color: '#e53935', fontWeight: 500, marginBottom: 16, fontSize: 15 }}>
          제품의 주요(or 고유) 특징 및 장점을 중요도 <b>우선순위로</b> 자세하게 작성 해 주세요 (최소 5개)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 15 }}>
          <thead>
            <tr>
              <th style={{ background: '#f8eecb', border: '1px solid #ccc', width: 60, padding: 10 }}>No.</th>
              <th style={{ background: '#f8eecb', border: '1px solid #ccc', width: 180, padding: 10 }}>기능</th>
              <th style={{ background: '#f8eecb', border: '1px solid #ccc', padding: 10 }}>설명</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td rowSpan={2} style={{ background: '#f6f6f6', border: '1px solid #ccc', color: '#888', textAlign: 'center', fontWeight: 500, verticalAlign: 'middle', width: 60 }}>예시</td>
              <td style={{ background: '#f6f6f6', border: '1px solid #ccc', color: '#222', fontWeight: 700, padding: 8, width: 180 }}>착용감+편안함</td>
              <td style={{ background: '#f6f6f6', border: '1px solid #ccc', color: '#222', fontWeight: 400, padding: 8 }}>
                핵심 기술력으로 부위별 압박 설계 손목부터 종아리까지, 각자의 근육 위치에 따라<br/>
                압박 강도 조절 필요한 곳에만 꼭 맞게 작용하여 불필요한 압박 없이 편안한 착용
              </td>
            </tr>
            <tr>
              <td style={{ background: '#f6f6f6', border: '1px solid #ccc', color: '#222', fontWeight: 700, padding: 8 }}>기능성</td>
              <td style={{ background: '#f6f6f6', border: '1px solid #ccc', color: '#222', fontWeight: 400, padding: 8 }}>
                3단계 압박 밴드 통통 붓고 저린 종아리,손목에도 부담 없이 점진적으로 나뉜 압박 구조로<br/>
                장시간 착용 가능 임신 중 일상 생활, 육아 활동 등 일상 생활에 무리 없는 착용감
              </td>
            </tr>
            {usps.map((row, i) => (
              <tr key={i}>
                <td style={{ border: '1px solid #ccc', textAlign: 'center', fontWeight: 600 }}>{i + 1}</td>
                <td style={{ border: '1px solid #ccc', padding: 0 }}>
                  <input
                    type="text"
                    value={row.function}
                    onChange={e => handleChange(i, 'function', e.target.value)}
                    placeholder="기능 입력"
                    style={{ width: '100%', padding: 6, borderRadius: 0, border: '1px solid #ccc', fontSize: 15, boxSizing: 'border-box' }}
                  />
                </td>
                <td style={{ border: '1px solid #ccc', padding: 0 }}>
                  <textarea
                    value={row.desc}
                    onChange={e => handleChange(i, 'desc', e.target.value)}
                    placeholder="설명 입력"
                    rows={2}
                    style={{ width: '100%', minHeight: 36, padding: 6, borderRadius: 0, border: '1px solid #ccc', fontSize: 15, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ border: 'none', textAlign: 'center', padding: 12 }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, usp: [...prev.usp, { function: '', desc: '' }] }))}
                  style={{ padding: '8px 32px', fontSize: 15, background: '#fff', color: '#111', border: '1px solid #bbb', borderRadius: 6, fontWeight: 500, cursor: 'pointer', marginTop: 6, marginRight: 8 }}
                >
                  + 추가하기
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, usp: prev.usp.length > 5 ? prev.usp.slice(0, -1) : prev.usp }))}
                  style={{ padding: '8px 32px', fontSize: 15, background: usps.length > 5 ? '#fff' : '#f3f3f3', color: usps.length > 5 ? '#d32f2f' : '#bbb', border: '1px solid #bbb', borderRadius: 6, fontWeight: 500, cursor: usps.length > 5 ? 'pointer' : 'not-allowed', marginTop: 6 }}
                  disabled={usps.length <= 5}
                >
                  - 삭제하기
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" onClick={() => navigate(-1)} style={{ flex: 1, padding: 14, fontSize: 17, background: '#eee', color: '#222', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>이전</button>
          <button type="button" onClick={handleNext} style={{ flex: 1, padding: 14, fontSize: 17, background: '#111', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>6개 중 4페이지</button>
        </div>
      </div>
    </div>
  );
} 