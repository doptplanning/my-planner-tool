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

  // summary가 배열(messages)이면 string으로 합침
  let summaryText = '';
  if (Array.isArray(summary)) {
    summaryText = summary.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`).join('\n');
  } else {
    summaryText = summary;
  }

  const userMessages = [
    { type: 'text', text: summaryText },
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

- 사용자가 자유롭게 질문/답변/역질문할 수 있도록 대화해.
- 대화가 시작되면 AI가 먼저 자연스럽게 첫 질문(예: 어떤 제품인가요?)을 해라.
- 절대 순차적으로 질문만 하지 말고, 사용자가 궁금한 점을 물어보면 반드시 답변해줘.
- 필요한 경우에만 추가 질문이나 추천/보완 의견을 제안해.
- 모든 정보가 충분히 모일 때까지 대화를 이어가고, 마지막에만 Q&A 표(JSON 배열)로 정리해서 반환해.
- **아무런 설명, 인사, 코드블록 없이 반드시 아래 JSON 배열만 반환해.**

[예시 대화]
AI: 안녕하세요! 어떤 제품에 대해 작업의뢰서를 작성해드릴까요?
사용자: 다이슨 청소기야.
AI: 다이슨 청소기군요! 주요 타겟이나 사용 목적을 알려주실 수 있나요?
사용자: 2030 MZ세대야.
AI: 네, 주요 타겟은 2030 MZ세대로 정리할게요. 혹시 제품의 가격도 알려주실 수 있나요?
...
(이런 식으로, 사용자가 질문하면 반드시 답변하고, 부족한 정보만 추가로 질문)

[Q&A+추천의견 결과물 예시]
[
  { "question": "제품명/모델명/구성은?", "answer": "○○○보풀제거기 / XES1098 / 본품, C타입 충전선, 청소솔, 해파필터", "aiComment": "구성품을 더 구체적으로 적어주세요" },
  { "question": "주요 타겟은?", "answer": "2030 MZ세대, 남성층 등", "aiComment": "연령대 외에 성별도 알려주시면 좋아요" }
]
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
      console.log('AI raw:', data.choices?.[0]?.message?.content || '');
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