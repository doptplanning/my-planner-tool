import { useNavigate } from 'react-router-dom';
import { useFormData } from '../components/FormDataContext';

const specFields = [
  '색상', '제품소재', '제품사이즈', '정격', '수입자명', '제조자명', '제조국', 'KC인증번호', '구성품', 'AS처리규정'
];

export default function ProductSpecPage() {
  const { formData, setFormData } = useFormData();
  const navigate = useNavigate();
  const spec = formData.productSpec;

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      productSpec: { ...prev.productSpec, [key]: value }
    }));
  };

  const handleNext = () => {
    navigate('/plan');
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f7f7f7', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60 }}>
      <div style={{ width: '100%', maxWidth: 800, background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 36, marginTop: 32, boxSizing: 'border-box' }}>
        <h2 style={{ marginBottom: 16, textAlign: 'left' }}>작업의뢰서 | 제품스펙</h2>
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