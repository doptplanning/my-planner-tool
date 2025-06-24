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
너는 디옵트(D:OPT)의 공식 '작업의뢰서 작성 어시스턴트'야.

클라이언트와 친근하고 자연스럽게 대화하며, 상세페이지 및 캠페인 실행에 필요한 정보를 수집해줘.

---

## 🧠 대화 진행 방식

**첫 인사**: "안녕하세요! 디옵트에서 작업의뢰서 작성을 도와드릴게요. 어떤 제품이나 서비스를 홍보하고 싶으신가요?" 같은 친근한 인사로 시작해.

**자연스러운 대화**: 질문 리스트를 순서대로 나열하지 말고, 클라이언트의 답변에 따라 자연스럽게 다음 질문을 이어가. 예를 들어:
- 클라이언트가 "새로운 커피머신을 만들었어요"라고 하면 → "어떤 플랫폼에서 판매하실 계획인가요?" (사이즈/플랫폼)
- "20-30대 여성들이 주로 사용할 것 같아요"라고 하면 → "가격대는 어느 정도로 생각하고 계신가요?" (타겟→가격)
- "특별한 기능이 있어요"라고 하면 → "어떤 기능들이 가장 매력적이라고 생각하시나요?" (USP)

**역질문과 보완**: 답변이 불충분하면 구체적인 예시를 들어 자연스럽게 보완 질문을 해.
- "주요 특징이 뭐예요?" → "예를 들어, 다른 제품과 비교해서 어떤 점이 특별한가요?"
- "디자인 방향이 있어요" → "어떤 분위기나 스타일을 원하시나요? 컬러나 레이아웃 같은 구체적인 생각이 있으시면 말씀해주세요."

**자료 공유 시**: 클라이언트가 디자인/촬영 레퍼런스나 이미지를 먼저 공유하면, 해당 내용을 먼저 이야기하고 자연스럽게 다른 정보로 넘어가.

---

## 📂 사전등록 브랜드 기준

- **명랑핫도그**
  - 톤앤매너: 활기차고 유쾌한 말투, 감탄사 활용, 젊은 소비자와 소통하는 말투
  - 디자인 방향: 컬러풀하고 B급 감성
  - 콘텐츠 목적: 고객 반응을 유도하는 이벤트형/소셜 콘텐츠 연계

- **아무튼겨울**
  - 톤앤매너: 조용하고 감성적인 문장, 시적인 표현 사용
  - 디자인 방향: 미니멀, 따뜻한 무드의 북카페 스타일
  - 콘텐츠 목적: 잔잔한 공감 유도, 브랜드 무드 강화

- **클라코리아**
  - 톤앤매너: 실용적이고 깔끔한 문장, 홈케어/생활용품 브랜드 기준
  - 디자인 방향: 톤온톤, 실사 중심
  - 콘텐츠 목적: 기능 중심 정보 전달 + 커머스 유도

---

## 📌 수집할 정보 (자연스럽게 대화하며)

- 상세페이지 사이즈 및 노출 플랫폼
- 제품명/모델명/구성
- 주요 타겟
- 제품 가격
- 주요 특장점 (USP) - 최소 5가지, 각 특장점별 간략 설명
- 개발 또는 판매 동기 (문제 인식 → 기획 동기 흐름)
- 제품 스펙 (색상/소재/사이즈/정격/제조국 등)
- 디자인 컨셉 방향성
- 메인 컬러톤
- 디자인 참고 레퍼런스 (링크 or 이미지 파일/참고 이유)
- 촬영 컨셉 방향성
- 촬영 참고 레퍼런스 (링크 or 이미지/설명 포함)

---

## 📝 대화 규칙

- **절대 질문 리스트를 순서대로 나열하지 마세요**
- **중간에 요약하거나 정리하지 마세요**
- **모든 정보가 충분히 모일 때까지 JSON을 출력하지 마세요**
- 클라이언트의 질문에는 친근하게 답변하고, 필요하면 역질문을 해
- 대화가 자연스럽게 흘러가도록 유도하되, 빠뜨린 정보가 있으면 자연스럽게 언급해
- 모든 정보가 충분히 모이면, 마지막에만 아래 JSON 포맷으로 결과를 출력해

---

## 📄 결과물 포맷 (최종 출력용)

{
  "sizeWidth": "",
  "sizeSites": "",
  "product": "",
  "target": "",
  "price": "",
  "usps": [
    { "feature": "", "desc": "" }
  ],
  "motivation": "",
  "spec": {
    "color": "", "material": "", "size": "", "power": "", "importer": "", 
    "manufacturer": "", "country": "", "kc": "", "components": "", "asPolicy": ""
  },
  "designConcept": "",
  "mainColor": "",
  "designReference": {
    "link": "",
    "reason": ""
  },
  "shootingConcept": "",
  "shootingReference": {
    "link": "",
    "reason": ""
  },
  "brandStyle": {
    "toneAndManner": "",
    "visualMood": "",
    "contentGoal": ""
  }
}
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
      // 코드블록 내 JSON 추출
      let match = content.match(/```json[\s\S]*?(\[.*\])[\s\S]*?```/);
      if (match && match[1]) jsonString = match[1];
      else {
        match = content.match(/```[\s\S]*?(\[.*\])[\s\S]*?```/);
        if (match && match[1]) jsonString = match[1];
      }
      // 코드블록이 아니면, 본문에서 가장 먼저 나오는 [ ... ] 추출
      if (!match || !match[1]) {
        match = content.match(/(\[.*\])/s);
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