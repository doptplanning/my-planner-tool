import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormData } from '../components/FormDataContext';

export default function PlanPage() {
  const { formData, setFormData } = useFormData();
  const navigate = useNavigate();
  const plan = formData.plan;
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (user.email) {
      const temp = localStorage.getItem(`temp_PlanPage_${user.email}`);
      if (temp) {
        if (window.confirm('임시 저장된 데이터가 있습니다. 불러오시겠습니까?')) {
          setFormData((prev: any) => ({ ...prev, plan: JSON.parse(temp) }));
        }
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, plan: e.target.value }));
  };

  const handleNext = () => {
    navigate('/usp');
  };

  const handleTempSave = () => {
    if (user.email) {
      localStorage.setItem(`temp_PlanPage_${user.email}`, JSON.stringify(formData.plan));
      alert('임시 저장되었습니다!');
    }
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#f7f7f7', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60 }}>
      <div style={{ width: '100%', maxWidth: 900, background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 36, marginTop: 32, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ marginBottom: 16, textAlign: 'left' }}>작업의뢰서 | 기획</h2>
          <button type="button" onClick={handleTempSave} style={{ padding: '8px 18px', fontSize: 15, background: '#eee', color: '#222', border: '1px solid #bbb', borderRadius: 6, cursor: 'pointer', fontWeight: 600, marginLeft: 16 }}>임시 저장</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <tbody>
            <tr>
              <td style={{ width: 140, background: '#f0f4fa', fontWeight: 700, fontSize: 18, border: '1px solid #ccc', padding: 18, textAlign: 'center', verticalAlign: 'top' }}>
                개발<br/>or<br/>판매 동기
              </td>
              <td style={{ border: '1px solid #ccc', padding: 24, verticalAlign: 'top' }}>
                <div style={{ color: '#e53935', fontWeight: 500, fontSize: 16, marginBottom: 8 }}>
                  소비자가 제품 구매를 통해 얻는 물리적 또는 심리적 이익 또는 혜택
                </div>
                <div style={{ color: '#aaa', fontSize: 15, marginBottom: 2 }}>
                  ex: 임신 중 & 출산 후 필수 케어템! 소중한 사람에게 ○○○임산부 세트로 몸의 부담을 덜고 편안한 하루를 선물하세요
                </div>
                <div style={{ color: '#aaa', fontSize: 15, marginBottom: 12 }}>
                  ex: 사이즈 고민을 하는 여성들을 위해 만들어진 쭉쭉 늘어나고 통기성 좋은 레깅스
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#222', fontWeight: 400, fontSize: 15 }}>→</span>
                  <textarea
                    value={plan}
                    onChange={handleChange}
                    placeholder="내용을 기재해주세요"
                    rows={3}
                    style={{ flex: 1, minWidth: 0, minHeight: 48, padding: '10px 12px', border: '1px solid #ccc', borderRadius: 4, fontSize: 15, color: '#222', background: '#fff', fontWeight: 400, resize: 'vertical', width: '100%' }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" onClick={() => navigate(-1)} style={{ flex: 1, padding: 14, fontSize: 17, background: '#eee', color: '#222', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>이전</button>
          <button type="button" onClick={handleNext} style={{ flex: 1, padding: 14, fontSize: 17, background: '#111', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>6개 중 3페이지</button>
        </div>
      </div>
    </div>
  );
} 