const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pdf = require('html-pdf');

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
너는 DOPT의 공식 작업의뢰서 작성 어시스턴트야.

아래 작업의뢰서 항목/예시/가이드라인을 반드시 참고해서, 
클라이언트와 자유롭게 대화하며 필요한 정보를 수집해.
클라이언트가 여러 정보를 한 번에 입력하거나, 순서를 바꿔도 
각 항목에 맞게 자동으로 분류/정리하고, 부족한 정보만 추가로 질문해.

대화가 끝나면 아래 JSON 배열 포맷에 맞춰 지금까지의 Q&A(질문/답변)와 각 항목별 AI 추천/의견(aiComment)을 정리해서 출력해.

**아무런 설명, 인사, 코드블록 없이 반드시 아래 JSON만 반환하세요.**

[Q&A+추천의견 결과물 예시]
[
  { "question": "제품명/모델명/구성은?", "answer": "○○○보풀제거기 / XES1098 / 본품, C타입 충전선, 청소솔, 해파필터", "aiComment": "구성품을 더 구체적으로 적어주세요" },
  { "question": "주요 타겟은?", "answer": "2030 MZ세대, 남성층 등", "aiComment": "연령대 외에 성별도 알려주시면 좋아요" }
]

[작업의뢰서 항목/예시/가이드라인]
1. 상세페이지 사이즈 및 노출 플랫폼 (예: 가로 860픽셀, 네이버 스마트스토어, 쿠팡 등)
2. 제품명/모델명/구성 (예: ○○○보풀제거기 / XES1098 / 본품, C타입 충전선, 청소솔, 해파필터)
3. 주요 타겟 (예: 2030 MZ세대, 남성층 등)
4. 제품 가격 (예: 39,000원)
5. 주요 특장점(USP) (최소 5개, 예시: 착용감+편안함, 기능성 등)
6. 개발 또는 판매 동기 (예: 소비자가 제품 구매를 통해 얻는 이익)
7. 제품스펙 (색상, 소재, 사이즈, 정격, 제조국 등)
8. 디자인 컨셉 방향성 (예: 과학적이고 전문적인 느낌, 실사와 그래픽 위주 등)
9. 메인 컬러톤 (예: 화이트톤, 블루톤 등)
10. 디자인 참고 레퍼런스 (링크/이미지, 이유)
11. 촬영 컨셉 방향성
12. 촬영 참고 레퍼런스 (링크/이미지, 이유)
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
    // 응답에서 JSON 파싱 시도 (코드블록, 자연어 혼합 등 모두 처리)
    let aiResult = {};
    try {
      const content = data.choices?.[0]?.message?.content || '';
      let jsonString = content;
      let match = content.match(/```json[\s\S]*?(\[?[\s\S]*\]?)[\s\S]*?```/);
      if (match && match[1]) jsonString = match[1];
      else {
        match = content.match(/```[\s\S]*?(\[?[\s\S]*\]?)[\s\S]*?```/);
        if (match && match[1]) jsonString = match[1];
      }
      if (!match || !match[1]) {
        match = content.match(/(\[?[\s\S]*\]?)/);
        if (match && match[1]) jsonString = match[1];
      }
      aiResult = JSON.parse(jsonString);
    } catch (e) {
      aiResult = { error: 'AI 응답 파싱 실패', raw: data.choices?.[0]?.message?.content || '' };
    }
    res.json(aiResult);
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

// JWT 인증 미들웨어
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// 사용자 목록 (관리자만)
app.get('/api/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '권한 없음' });
  const users = await User.find({}, '-password');
  res.json(users);
});

app.post('/api/generate-pdf', async (req, res) => {
  const data = req.body;
  // 간단한 HTML 템플릿 예시 (실제 디자인/포맷은 추후 개선)
  const html = `
    <html><head><meta charset='utf-8'></head><body>
    <h1>작업의뢰서</h1>
    <pre style="font-size:15px;">${JSON.stringify(data, null, 2)}</pre>
    </body></html>
  `;
  pdf.create(html).toStream((err, stream) => {
    if (err) return res.status(500).send('PDF 생성 실패');
    res.setHeader('Content-Type', 'application/pdf');
    stream.pipe(res);
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`)); 