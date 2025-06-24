const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors({
  origin: 'https://my-planner-tool.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // .env 파일에 저장

// DB 연결
mongoose.connect(process.env.MONGO_URI, {});

// User 모델
const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'client' }
}));

app.post('/api/gpt-brief', async (req, res) => {
  const { summary, images } = req.body;

  const userMessages = [
    { type: 'text', text: summary },
  ];

  if (images && images.length > 0) {
    images.forEach((imageBase64) => {
      userMessages.push({
        type: 'image_url',
        image_url: {
          url: imageBase64,
        },
      });
    });
  }

  const prompt = `
당신은 최고의 광고 에이전시의 전문 크리에이티브 디렉터입니다.
아래에 제공된 [사용자 입력 정보]와 [첨부 이미지]를 바탕으로, 소비자의 구매를 즉각적으로 유도할 수 있는 매우 구체적이고 전문적인 **상세페이지 스토리보드**를 작성해주세요.

### 작성 가이드라인
- **결과물 형식**: 아래의 두 파트(캠페인 개요, 상세페이지 스토리보드)로 나누어 작성해주세요.
- **스토리보드**: 마크다운 표 형식으로, 'SECTION', '카피 (COPY)', '이미지 (VISUAL)' 세 개의 컬럼으로 구성해주세요.
- **이미지 제안**: 사용자가 첨부한 이미지를 어떤 섹션에서 어떻게 활용할지 구체적으로 제안해주세요. 만약 적절한 이미지가 없다면, 어떤 느낌의 이미지가 필요한지 상세하게 묘사해주세요.
- **어조와 스타일**: 제품과 타겟 고객에 맞는 일관된 목소리(Tone of Voice)를 유지해주세요.

---

### 파트 1: 캠페인 개요
- **캠페인 목표**: 
- **타겟 고객**:
- **핵심 메시지 (Key Selling Proposition)**:
- **기대 효과**:

### 파트 2: 상세페이지 스토리보드
| SECTION | 카피 (COPY) | 이미지 (VISUAL) |
|---|---|---|
| **오프닝 (고객의 문제 제기)** | 예: "아무리 관리해도 푸석한 머릿결, 혹시 트리트먼트 유목민이신가요?" | 예: 여러 종류의 트리트먼트 앞에서 고민하는 여성의 뒷모습. (첨부 이미지 1번 활용 제안) |
| **(섹션 제목)** | (카피 제안) | (이미지 컨셉 제안) |

---

### [사용자 입력 정보]
${summary}
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: prompt,
          },
          {
            role: 'user',
            content: userMessages,
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });
    const data = await response.json();
    if (data.error) {
        console.error('OpenAI API Error:', data.error);
    }
    res.json({ brief: data.choices?.[0]?.message?.content || '' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ brief: 'OpenAI API 호출 실패', error: e.toString() });
  }
});

// 회원가입
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ error: '이미 가입된 이메일' });
  const hash = await bcrypt.hash(password, 10);
  await User.create({ email, password: hash });
  res.json({ success: true });
});

// 로그인
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: '이메일 또는 비밀번호 오류' });
  }
  const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, email: user.email, role: user.role });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`)); 