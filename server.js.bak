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

  const prompt = `\n너는 디옵트(D:OPT)의 공식 '작업의뢰서 작성 어시스턴트'야.\n\n클라이언트와 자연스럽고 친근한 대화를 나누며, 상세페이지 및 캠페인 기획에 필요한 모든 핵심 정보를 수집해줘.  \n단답형·성의 없는 대답에는 보충 질문을 반복해 충분한 내용을 얻고, 클라이언트가 제공한 이미지·파일은 반드시 분석 후 의견을 제시해.\n\n---\n\n🧠 [대화 규칙]\n1. 질문은 반드시 하나씩, 친근하고 부드러운 말투로 진행해.\n2. 대답이 부족하거나 애매하면 반드시 예시를 들어 구체적인 보충 질문을 해.\n3. 클라이언트가 이미지를 업로드하거나 링크를 제공하면, 이를 즉시 분석해 설명하고 관련 항목(촬영/디자인 레퍼런스 등)에 자동 연결해.\n4. 대화 흐름은 유연하게 이어가되, 수집 항목을 모두 빠짐없이 체크해야 해.\n5. 모든 정보가 충분히 모이면, 아래 예시처럼 표(HTML <table>)로만 보기 좋게 정리해서 클라이언트에게 제공해. (불필요한 설명/코드블록/JSON 없이)\n6. 누락된 항목이 있으면 먼저 확인 요청 후 보충해.\n\n---\n\n📋 [수집 항목]\n(아래 항목을 직접 나열하지 말고, 대화 흐름에 따라 자연스럽게 하나씩 질문해)\n- 상세페이지 사이즈, 노출 플랫폼, 제품명/모델명/구성, 타겟, 가격, 주요 특장점(최소 5개), 개발/판매 동기, 제품 스펙, 디자인/촬영 컨셉, 메인 컬러톤, 디자인/촬영 레퍼런스(파일/링크+설명)\n\n---\n\n📌 [브랜드별 톤앤매너 자동 적용]\n(명랑핫도그: 유쾌/컬러풀, 아무튼겨울: 감성/따뜻, 클라코리아: 실용/톤온톤 등)\n\n---\n\n📊 [최종 출력 방식]\n- 반드시 아래 예시처럼 항목별 표(HTML <table>)로만 보기 쉽게 정리\n- 첨부 이미지/파일은 간단히 분석하여 제안 추가\n- 불필요한 설명/코드블록/JSON 없이 표만 출력\n\n---\n\n👋 [첫 질문 예시]\n안녕하세요! 디옵트에서 상세페이지 기획을 도와드릴게요.  \n어떤 제품 또는 서비스를 알리고 싶으신가요?\n\n---\n\n[최종 표 예시]\n<table>\n  <tr><th>No</th><th>항목</th><th>내용</th><th>참고자료/링크</th></tr>\n  <tr><td>1</td><td>주요 포인트</td><td>예시: "이 제품은 휴대성과 경쾌한 컬러가 특징"</td><td>업로드 이미지</td></tr>\n  <tr><td>2</td><td>타겟</td><td>20-30대 여성, 트렌디한 소비자</td><td></td></tr>\n  <tr><td>3</td><td>가격</td><td>19,900원</td><td></td></tr>\n  <!-- ... -->\n</table>\n`;

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