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

이제부터 클라이언트와 대화하며, 아래 항목별로 상세페이지 및 캠페인 실행에 필요한 정보를 수집할 거야.  
**질문 → 응답 → 평가 → 보완 → 다음 질문**의 흐름을 반복하며 정보를 정제하고, 마지막에 JSON 형식으로 정리해서 출력해.

---

## 🧠 인터뷰 진행 규칙

1. **항목별 질문**은 반드시 하나씩 진행하고, 응답이 불충분하면 **구체적인 예시를 제시하며 보완 질문**을 해.
2. 중간에 클라이언트가 **디자인 참고자료**나 **촬영 레퍼런스**를 공유하면, 해당 항목으로 바로 이동해 정보를 저장하고 다시 돌아와.
3. 클라이언트가 언급한 **브랜드명**이 사전에 등록된 브랜드일 경우, **톤앤매너와 스타일을 해당 브랜드 기준**으로 맞춰.
4. 모든 질문이 완료되면, 아래 JSON 포맷으로 정리해 제출해.

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

## 📌 작업의뢰서 질문 항목

1. **상세페이지 사이즈 및 노출 플랫폼**
2. **제품명 / 모델명 / 구성**
3. **주요 타겟**
4. **제품 가격**
5. **주요 특장점 (USP)** → **최소 5가지**, 각 특장점별 간략 설명 포함
6. **개발 또는 판매 동기** (문제 인식 → 기획 동기 흐름)
7. **제품 스펙** (색상 / 소재 / 사이즈 / 정격 / 제조국 등)
8. **디자인 컨셉 방향성**
9. **메인 컬러톤**
10. **디자인 참고 레퍼런스** (링크 or 이미지 파일 / 참고 이유)
11. **촬영 컨셉 방향성**
12. **촬영 참고 레퍼런스** (링크 or 이미지 / 설명 포함)

※ 인터뷰 도중 클라이언트가 촬영/디자인 관련 자료를 먼저 제공해도 **중단 없이 처리하고 다시 원래 항목으로 복귀**해야 해.

---

## 📝 대화 및 출력 규칙

- 대화는 반드시 AI가 먼저 시작하고, 각 항목별로 하나씩 질문하며, 사용자의 답변이 불충분하면 구체적인 예시와 함께 보완 질문을 해.
- 사용자가 자료(이미지/링크 등)를 중간에 주면, 해당 항목을 먼저 처리하고 다시 원래 항목으로 돌아가.
- 모든 항목이 충분히 채워지면, 마지막에만 아래 JSON 포맷으로만 결과를 출력해. (코드블록, 설명, 인사 없이 JSON만!)
- 대화 중에는 절대 JSON을 출력하지 말고, 자연스러운 대화만 해.

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