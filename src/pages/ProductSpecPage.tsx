import { useNavigate } from 'react-router-dom';
import { useFormData } from '../components/FormDataContext';
import { useEffect } from 'react';

const specFields = [
  '색상', '제품소재', '제품사이즈', '정격', '수입자명', '제조자명', '제조국', 'KC인증번호', '구성품', 'AS처리규정'
];

export default function ProductSpecPage() {
  const { formData, setFormData } = useFormData();
  const navigate = useNavigate();
  const spec = formData.productSpec;
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (user.email) {
      const temp = localStorage.getItem(`temp_ProductSpecPage_${user.email}`);
      if (temp) {
        if (window.confirm('임시 저장된 데이터가 있습니다. 불러오시겠습니까?')) {
          setFormData((prev: any) => ({ ...prev, productSpec: JSON.parse(temp) }));
        }
      }
    }
  }, []);

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      productSpec: { ...prev.productSpec, [key]: value }
    }));
  };

  const handleNext = () => {
    navigate('/plan');
  };

  const handleTempSave = () => {
    if (user.email) {
      localStorage.setItem(`temp_ProductSpecPage_${user.email}`, JSON.stringify(formData.productSpec));
      alert('임시 저장되었습니다!');
    }
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f7f7f7', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60 }}>
      <div style={{ width: '100%', maxWidth: 950, background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 36, marginTop: 32, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ marginBottom: 24, textAlign: 'left' }}>작업의뢰서 | 제품스펙</h2>
          <button type="button" onClick={handleTempSave} style={{ padding: '8px 18px', fontSize: 15, background: '#eee', color: '#222', border: '1px solid #bbb', borderRadius: 6, cursor: 'pointer', fontWeight: 600, marginLeft: 16 }}>임시 저장</button>
        </div>
        <div style={{ color: '#e53935', fontWeight: 500, marginBottom: 16, fontSize: 15 }}>
          1) 반영되어야 할 제품 스펙 기재 부탁드립니다. 해당 되시는 부분이나 별도 추가할 사항이 있으시면 추가 바랍니다.<br/>
          2) 제품의 경우, 스펙 외 사용 상 주의사항도 필요한 경우가 있습니다. 추가 바랍니다.
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <tbody>
            {specFields.map(field => (
              <tr key={field}>
                <td style={{ background: '#e6eef6', width: 140, fontWeight: 600, border: '1px solid #ccc', padding: 10 }}>{field}</td>
                <td style={{ border: '1px solid #ccc', padding: 10 }}>
                  <input
                    type="text"
                    value={spec[field] || ''}
                    onChange={e => handleChange(field, e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', fontSize: 15 }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" onClick={() => navigate(-1)} style={{ flex: 1, padding: 14, fontSize: 17, background: '#eee', color: '#222', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>이전</button>
          <button type="button" onClick={handleNext} style={{ flex: 1, padding: 14, fontSize: 17, background: '#111', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>6개 중 2페이지</button>
        </div>
      </div>
    </div>
  );
} 