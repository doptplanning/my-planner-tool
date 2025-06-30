require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Client } = require('@notionhq/client');
const { OpenAI } = require('openai');
const pdf = require('html-pdf');
const fetch = require('node-fetch');

const app = express();
app.use(cors({
  origin: 'https://my-planner-tool.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// DB 연결
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// User 모델
const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'client' }
}));

// Training 모델 추가
const Training = mongoose.model('Training', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notionToken: String,
  databaseId: String,
  pageIds: [String],
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  result: String,
  aiRaw: String,
  createdAt: { type: Date, default: Date.now }
}));

// JWT 미들웨어
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

// 사용자 목록 (관리자만)
app.get('/api/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '권한 없음' });
  const users = await User.find({}, '-password');
  res.json(users);
});

// 권한 변경 (관리자만)
app.patch('/api/users/:id/role', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '권한 없음' });
  const { role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { role });
  res.json({ success: true });
});

// 노션 연결 및 페이지 가져오기
app.post('/api/notion/connect', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '권한 없음' });
  
  const { notionToken, databaseId, search = '', page = 1, pageSize = 20 } = req.body;
  
  try {
    const notion = new Client({ auth: notionToken });
    // 데이터베이스의 title 컬럼명 감지
    const dbMeta = await notion.databases.retrieve({ database_id: databaseId });
    const titleKey = Object.entries(dbMeta.properties).find(
      ([, prop]) => prop.type === 'title'
    )?.[0];
    console.log('감지된 Notion 제목 컬럼명(titleKey):', titleKey);

    if (!titleKey) {
      return res.status(400).json({ error: '이 데이터베이스에는 제목(Title) 컬럼이 없습니다. Notion에서 제목 역할의 컬럼을 반드시 포함시켜 주세요.' });
    }

    // Notion API filter: 제목에 검색어 포함 (본문까지 검색할 경우 filter는 사용하지 않고 전체를 가져옴)
    let filter = undefined;
    let allResults = [];
    let hasMore = true;
    let start_cursor = undefined;
    while (hasMore) {
      const response = await notion.databases.query({
        database_id: databaseId,
        // filter는 사용하지 않음 (본문까지 검색 위해 전체 조회)
        start_cursor,
        page_size: 100
      });
      allResults = allResults.concat(response.results);
      hasMore = response.has_more;
      start_cursor = response.next_cursor;
    }
    // 검색어가 있으면 제목/컬럼/본문까지 검사
    let matchedResults = allResults;
    if (search && search.trim() !== '') {
      matchedResults = [];
      for (const pageObj of allResults) {
        let isMatch = false;
        // 제목 컬럼 검사
        if (titleKey && pageObj.properties[titleKey] && pageObj.properties[titleKey].title && pageObj.properties[titleKey].title.length > 0) {
          const titleText = pageObj.properties[titleKey].title.map(text => text.plain_text).join(' ');
          if (titleText.toLowerCase().includes(search.toLowerCase())) isMatch = true;
        }
        // (필요시 다른 컬럼도 검사 가능)
        // 본문(블록) 검사
        if (!isMatch) {
          const blocks = await notion.blocks.children.list({ block_id: pageObj.id });
          for (const block of blocks.results) {
            if (
              (block.type === 'paragraph' || block.type === 'heading_1' || block.type === 'heading_2') &&
              block[block.type].rich_text &&
              block[block.type].rich_text.some(text => text.plain_text && text.plain_text.toLowerCase().includes(search.toLowerCase()))
            ) {
              isMatch = true;
              break;
            }
          }
        }
        if (isMatch) matchedResults.push(pageObj);
      }
    }
    // 전체 개수
    const total = matchedResults.length;
    // 현재 페이지에 해당하는 20개만 추출
    const pagedResults = matchedResults.slice((page - 1) * pageSize, page * pageSize);
    const pages = [];
    for (const pageObj of pagedResults) {
      try {
        // 페이지 내용 가져오기
        const pageContent = await notion.pages.retrieve({ page_id: pageObj.id });
        const blocks = await notion.blocks.children.list({ block_id: pageObj.id });
        let content = '';
        for (const block of blocks.results) {
          if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
            content += block.paragraph.rich_text.map(text => text.plain_text).join(' ') + '\n';
          } else if (block.type === 'heading_1' && block.heading_1.rich_text.length > 0) {
            content += block.heading_1.rich_text.map(text => text.plain_text).join(' ') + '\n';
          } else if (block.type === 'heading_2' && block.heading_2.rich_text.length > 0) {
            content += block.heading_2.rich_text.map(text => text.plain_text).join(' ') + '\n';
          } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item.rich_text.length > 0) {
            content += '• ' + block.bulleted_list_item.rich_text.map(text => text.plain_text).join(' ') + '\n';
          } else if (block.type === 'numbered_list_item' && block.numbered_list_item.rich_text.length > 0) {
            content += block.numbered_list_item.rich_text.map(text => text.plain_text).join(' ') + '\n';
          }
        }
        // 페이지 제목 추출 (type이 'title'인 컬럼 자동 감지)
        let title = '제목 없음';
        if (titleKey && pageObj.properties[titleKey] && pageObj.properties[titleKey].title && pageObj.properties[titleKey].title.length > 0) {
          title = pageObj.properties[titleKey].title.map(text => text.plain_text).join(' ');
        }
        pages.push({
          id: pageObj.id,
          title: title,
          content: content.trim(),
          lastEdited: pageObj.last_edited_time
        });
      } catch (error) {
        console.error(`페이지 ${pageObj.id} 처리 중 오류:`, error);
      }
    }
    res.json({ pages, total });
  } catch (error) {
    console.error('노션 연결 오류:', error);
    res.status(500).json({ error: '노션 연결에 실패했습니다.' });
  }
});

// AI 모델 학습
app.post('/api/notion/train', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '권한 없음' });
  
  const { pageIds, notionToken, databaseId } = req.body;
  
  try {
    const training = await Training.create({
      userId: req.user.id,
      notionToken,
      databaseId,
      pageIds,
      status: 'processing'
    });
    const notion = new Client({ auth: notionToken });
    let allContent = '';
    for (const pageId of pageIds) {
      try {
        const blocks = await notion.blocks.children.list({ block_id: pageId });
        for (const block of blocks.results) {
          if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
            allContent += block.paragraph.rich_text.map(text => text.plain_text).join(' ') + '\n';
          } else if (block.type === 'heading_1' && block.heading_1.rich_text.length > 0) {
            allContent += '# ' + block.heading_1.rich_text.map(text => text.plain_text).join(' ') + '\n';
          } else if (block.type === 'heading_2' && block.heading_2.rich_text.length > 0) {
            allContent += '## ' + block.heading_2.rich_text.map(text => text.plain_text).join(' ') + '\n';
          } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item.rich_text.length > 0) {
            allContent += '• ' + block.bulleted_list_item.rich_text.map(text => text.plain_text).join(' ') + '\n';
          } else if (block.type === 'numbered_list_item' && block.numbered_list_item.rich_text.length > 0) {
            allContent += block.numbered_list_item.rich_text.map(text => text.plain_text).join(' ') + '\n';
          }
        }
      } catch (error) {
        console.error(`페이지 ${pageId} 처리 중 오류:`, error);
      }
    }
    // OpenAI를 사용한 학습 (요약)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '당신은 노션 데이터를 분석하고 학습하는 AI 어시스턴트입니다. 주어진 내용을 바탕으로 핵심 정보를 추출하고 요약해주세요.'
          },
          {
            role: 'user',
            content: `다음 노션 데이터를 분석하고 핵심 정보를 요약해주세요:\n\n${allContent.substring(0, 4000)}`
          }
        ],
        max_tokens: 1000
      })
    });
    const data = await response.json();
    const aiRaw = data.choices?.[0]?.message?.content || '';
    const result = aiRaw;
    await Training.findByIdAndUpdate(training._id, {
      status: 'completed',
      result: result,
      aiRaw: aiRaw
    });
    res.json({ 
      success: true, 
      message: 'AI 모델 학습이 완료되었습니다.',
      result: result,
      aiRaw: aiRaw
    });
  } catch (error) {
    console.error('AI 학습 오류:', error);
    if (req.body.pageIds) {
      await Training.findOneAndUpdate(
        { userId: req.user.id, pageIds: req.body.pageIds },
        { status: 'failed' }
      );
    }
    res.status(500).json({ error: 'AI 학습에 실패했습니다.' });
  }
});

// 학습 히스토리 조회
app.get('/api/notion/training-history', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '권한 없음' });
  
  try {
    const trainings = await Training.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({ trainings });
  } catch (error) {
    console.error('학습 히스토리 조회 오류:', error);
    res.status(500).json({ error: '히스토리 조회에 실패했습니다.' });
  }
});

// OpenAI 채팅 API (기존)
app.post('/api/openai/chat', auth, async (req, res) => {
  const { message } = req.body;
  
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "당신은 전문적인 워크 요청서 작성 도우미입니다. 클라이언트가 더 전문적이고 상세한 워크 요청서를 작성할 수 있도록 도와주세요."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500
    });
    
    res.json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('OpenAI API 오류:', error);
    res.status(500).json({ error: 'AI 응답 생성에 실패했습니다.' });
  }
});

// 브리프 자동 생성 API (server.js와 동일하게)
app.post('/api/gpt-brief', async (req, res) => {
  const { summary, images, messages } = req.body;

  // summary가 배열(messages)이면 string으로 합침
  let summaryText = '';
  if (Array.isArray(messages)) {
    summaryText = messages.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`).join('\n');
  } else if (Array.isArray(summary)) {
    summaryText = summary.map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`).join('\n');
  } else {
    summaryText = summary || '';
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
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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
    let aiResult = {};
    try {
      const content = data.choices?.[0]?.message?.content || '';
      let jsonString = content;
      let match = content.match(/```json[\s\S]*?(\[.*\])[\s\S]*?```/);
      if (match && match[1]) jsonString = match[1];
      else {
        match = content.match(/```[\s\S]*?(\[.*\])[\s\S]*?```/);
        if (match && match[1]) jsonString = match[1];
      }
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

// PDF 생성 API
app.post('/api/generate-pdf', async (req, res) => {
  const data = req.body;
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

// 노션 학습페이지용 AI 대화 API (이미지 지원)
app.post('/api/notion/ai-chat', auth, async (req, res) => {
  const { message, images } = req.body;
  try {
    // 최근 학습된 aiRaw 불러오기
    const lastTraining = await Training.findOne({ userId: req.user.id, status: 'completed' }).sort({ createdAt: -1 });
    const context = lastTraining?.aiRaw || lastTraining?.result || '';
    if (!context) {
      return res.status(400).json({ error: '학습된 데이터가 없습니다. 먼저 노션 학습을 진행해 주세요.' });
    }
    // 텍스트+이미지 메시지 구성
    const userMessages = [
      { type: 'text', text: `아래는 노션에서 학습한 내용입니다. 이 내용을 참고해서 사용자의 질문에 답변해줘.\n\n[학습 내용]\n${context}\n\n[사용자 질문]\n${message}` }
    ];
    if (images && Array.isArray(images)) {
      images.forEach((imageBase64) => {
        userMessages.push({
          type: 'image_url',
          image_url: { url: imageBase64 }
        });
      });
    }
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: '너는 노션에서 학습한 내용을 바탕으로 전문적으로 답변하는 AI 어시스턴트야.' },
          { role: 'user', content: userMessages }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || '';
    res.json({ answer });
  } catch (error) {
    console.error('AI 대화 오류:', error);
    res.status(500).json({ error: 'AI 대화 생성에 실패했습니다.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on ${PORT}`)); 