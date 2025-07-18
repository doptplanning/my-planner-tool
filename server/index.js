require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Client } = require('@notionhq/client');
const { OpenAI } = require('openai');
const pdf = require('html-pdf');
const pdfParse = require('pdf-parse');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

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

  const prompt = `\n너는 디옵트(D:OPT)의 공식 '작업의뢰서 작성 어시스턴트'야.\n\n클라이언트와 자연스럽고 친근한 대화를 나누며, 상세페이지 및 캠페인 기획에 필요한 모든 핵심 정보를 수집해줘.  \n단답형·성의 없는 대답에는 보충 질문을 반복해 충분한 내용을 얻고, 클라이언트가 제공한 이미지·파일은 반드시 분석 후 의견을 제시해.\n\n---\n\n🧠 [대화 규칙]\n1. 질문은 반드시 하나씩, 친근하고 부드러운 말투로 진행해.\n2. 대답이 부족하거나 애매하면 반드시 예시를 들어 구체적인 보충 질문을 해.\n3. 클라이언트가 이미지를 업로드하거나 링크를 제공하면, 이를 즉시 분석해 설명하고 관련 항목(촬영/디자인 레퍼런스 등)에 자동 연결해.\n4. 대화 흐름은 유연하게 이어가되, 수집 항목을 모두 빠짐없이 체크해야 해.\n5. 모든 정보가 충분히 모이면, ChatGPT 스타일로 구조화된 답변을 제공해.\n6. 누락된 항목이 있으면 먼저 확인 요청 후 보충해.\n\n---\n\n📋 [수집 항목]\n(아래 항목을 직접 나열하지 말고, 대화 흐름에 따라 자연스럽게 하나씩 질문해)\n- 상세페이지 사이즈, 노출 플랫폼, 제품명/모델명/구성, 타겟, 가격, 주요 특장점(최소 5개), 개발/판매 동기, 제품 스펙, 디자인/촬영 컨셉, 메인 컬러톤, 디자인/촬영 레퍼런스(파일/링크+설명)\n\n---\n\n📌 [브랜드별 톤앤매너 자동 적용]\n(명랑핫도그: 유쾌/컬러풀, 아무튼겨울: 감성/따뜻, 클라코리아: 실용/톤온톤 등)\n\n---\n\n🎯 [ChatGPT 스타일 응답 형식 규칙]\n\n1. **📋 구조화된 제목**: # 메인 제목, ## 섹션 제목, ### 소제목 사용\n2. **📊 테이블 활용**: 비교, 분석, 정리가 필요한 모든 내용은 테이블로 표현\n3. **📝 체계적 리스트**: \n   - 순서가 중요한 경우: 1. 2. 3. 번호 리스트\n   - 일반 항목: • 불릿 포인트\n   - 하위 항목: - 대시 사용\n4. **💡 강조 표시**: 중요한 내용은 **볼드** 처리\n5. **🎨 섹션 구분**: 명확한 구분선과 이모지로 가독성 향상\n6. **📈 데이터 시각화**: 숫자, 비율, 통계는 테이블로 정리\n\n**📋 필수 테이블 형식 예시:**\n\n## 핵심 분석 결과\n| 항목 | 내용 | 중요도 | 근거 |\n|------|------|--------|------|\n| 타겟 고객 | 20-30대 여성 | ⭐⭐⭐⭐⭐ | 시장 조사 결과 |\n| 주요 메시지 | 브랜드 가치 전달 | ⭐⭐⭐⭐ | 소비자 설문 |\n\n## 세부 전략\n| 전략 | 세부 내용 | 예상 효과 | 투자 비용 |\n|------|------------|------------|-----------|\n| 디지털 마케팅 | SNS 광고 집중 | 높음 | 중간 |\n| 인플루언서 협업 | 10명 계약 | 높음 | 높음 |\n\n**📝 리스트 형식 예시:**\n1. **1단계**: 시장 분석 및 타겟 설정\n2. **2단계**: 메시지 개발 및 크리에이티브 제작\n3. **3단계**: 채널별 실행 및 성과 측정\n\n**💡 핵심 포인트:**\n• 모든 분석 결과는 테이블로 정리\n• 단계별 프로세스는 번호 리스트로 표현\n• 중요 키워드는 **볼드** 처리\n• 섹션별로 명확한 구분과 이모지 사용\n\n---\n\n👋 [첫 질문 예시]\n안녕하세요! 디옵트에서 상세페이지 기획을 도와드릴게요.  \n어떤 제품 또는 서비스를 알리고 싶으신가요?\n\n---\n\n[최종 출력 예시]\n# 상세페이지 기획 분석 결과\n\n## 📊 핵심 정보 요약\n| 항목 | 내용 | 중요도 |\n|------|------|--------|\n| 제품명 | 다이슨 슈퍼소닉 드라이기 | ⭐⭐⭐⭐⭐ |\n| 타겟 | 20-30대 여성 | ⭐⭐⭐⭐⭐ |\n| 가격대 | 50만원대 | ⭐⭐⭐⭐ |\n\n## 🎯 주요 특장점\n| 순위 | 특장점 | 설명 |\n|------|--------|------|\n| 1 | **강력한 모터** | 13만 RPM 고성능 모터 |\n| 2 | **손상 방지** | 지능형 온도 제어 |\n| 3 | **경량 디자인** | 560g 초경량 |\n\n## 📈 마케팅 전략\n1. **1단계**: 프리미엄 브랜드 포지셔닝\n2. **2단계**: 소셜미디어 인플루언서 협업\n3. **3단계**: 고객 후기 및 UGC 활용\n\n• 각 플랫폼별 맞춤 전략 수립\n• 성과 측정 지표 설정\n`;

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

// 노션 학습페이지용 AI 대화 API (이미지 지원 + 웹 검색)
app.post('/api/notion/ai-chat', auth, async (req, res) => {
  const { message, images, enableWebSearch = false } = req.body;
  try {
    // 최근 학습된 aiRaw 불러오기
    const lastTraining = await Training.findOne({ userId: req.user.id, status: 'completed' }).sort({ createdAt: -1 });
    const context = lastTraining?.aiRaw || lastTraining?.result || '';
    
    let webSearchResults = '';
    if (enableWebSearch && message) {
      try {
        // 웹 검색 수행
        const searchResponse = await fetch(`${req.protocol}://${req.get('host')}/api/web-search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.authorization
          },
          body: JSON.stringify({ 
            query: message, 
            searchType: 'general' 
          })
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.results && searchData.results.length > 0) {
            webSearchResults = '\n\n[웹 검색 결과]\n' + searchData.results.map((result, index) => 
              `${index + 1}. ${result.title}\n   ${result.snippet}\n   출처: ${result.source} (${result.date})`
            ).join('\n\n');
          }
        }
      } catch (searchError) {
        console.error('웹 검색 오류:', searchError);
        // 웹 검색 실패해도 계속 진행
      }
    }

    if (!context && !webSearchResults) {
      return res.status(400).json({ error: '학습된 데이터가 없습니다. 먼저 노션 학습을 진행하거나 웹 검색을 활성화해 주세요.' });
    }

    // 텍스트+이미지 메시지 구성 (프롬프트 개선)
    const userMessages = [
      { type: 'text', text: `${context ? `아래는 노션에서 학습한 내용입니다. 이 내용을 참고해서 사용자의 질문에 답변해줘.\n\n[학습 내용]\n${context}` : ''}${webSearchResults ? `\n\n${webSearchResults}` : ''}

**🎯 ChatGPT 스타일 응답 형식 규칙:**

1. **📋 구조화된 제목**: # 메인 제목, ## 섹션 제목, ### 소제목 사용
2. **📊 테이블 활용**: 비교, 분석, 정리가 필요한 모든 내용은 테이블로 표현
3. **📝 체계적 리스트**: 
   - 순서가 중요한 경우: 1. 2. 3. 번호 리스트
   - 일반 항목: • 불릿 포인트
   - 하위 항목: - 대시 사용
4. **💡 강조 표시**: 중요한 내용은 **볼드** 처리
5. **🎨 섹션 구분**: 명확한 구분선과 이모지로 가독성 향상
6. **📈 데이터 시각화**: 숫자, 비율, 통계는 테이블로 정리
7. **🔍 웹 검색 정보**: 최신 정보와 시장 동향을 포함한 종합 분석

**📋 필수 테이블 형식 예시:**

## 핵심 분석 결과
| 항목 | 내용 | 중요도 | 근거 |
|------|------|--------|------|
| 타겟 고객 | 20-30대 여성 | ⭐⭐⭐⭐⭐ | 시장 조사 결과 |
| 주요 메시지 | 브랜드 가치 전달 | ⭐⭐⭐⭐ | 소비자 설문 |

## 세부 전략
| 전략 | 세부 내용 | 예상 효과 | 투자 비용 |
|------|------------|------------|-----------|
| 디지털 마케팅 | SNS 광고 집중 | 높음 | 중간 |
| 인플루언서 협업 | 10명 계약 | 높음 | 높음 |

**📝 리스트 형식 예시:**
1. **1단계**: 시장 분석 및 타겟 설정
2. **2단계**: 메시지 개발 및 크리에이티브 제작
3. **3단계**: 채널별 실행 및 성과 측정

**💡 핵심 포인트:**
• 모든 분석 결과는 테이블로 정리
• 단계별 프로세스는 번호 리스트로 표현
• 중요 키워드는 **볼드** 처리
• 섹션별로 명확한 구분과 이모지 사용

[사용자 질문]
${message}` }
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
          { role: 'system', content: '너는 노션에서 학습한 내용과 웹 검색 결과를 바탕으로 전문적이고 최신 정보를 포함한 답변을 제공하는 AI 어시스턴트야.' },
          { role: 'user', content: userMessages }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || '';
    res.json({ answer, webSearchEnabled: enableWebSearch });
  } catch (error) {
    console.error('AI 대화 오류:', error);
    res.status(500).json({ error: 'AI 대화 생성에 실패했습니다.' });
  }
});

// 웹 검색 API
app.post('/api/web-search', auth, async (req, res) => {
  const { query, searchType = 'general' } = req.body;
  
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: '검색어를 입력해주세요.' });
  }

  try {
    let searchResults = [];
    
    // 검색 타입에 따른 다른 검색 전략
    if (searchType === 'market') {
      // 시장 조사 관련 검색
      searchResults = await performMarketResearch(query);
    } else if (searchType === 'competitor') {
      // 경쟁사 분석 검색
      searchResults = await performCompetitorAnalysis(query);
    } else if (searchType === 'trend') {
      // 트렌드 분석 검색
      searchResults = await performTrendAnalysis(query);
    } else {
      // 일반 검색
      searchResults = await performGeneralSearch(query);
    }

    res.json({ 
      results: searchResults,
      query: query,
      searchType: searchType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('웹 검색 오류:', error);
    res.status(500).json({ error: '웹 검색에 실패했습니다.' });
  }
});

// 일반 검색 함수
async function performGeneralSearch(query) {
  const searchTerms = [
    `${query} 시장 현황`,
    `${query} 트렌드 2024`,
    `${query} 소비자 분석`,
    `${query} 마케팅 전략`
  ];

  const results = [];
  
  for (const term of searchTerms) {
    try {
      // Google 검색 시뮬레이션 (실제로는 검색 API 사용 권장)
      const mockResults = await simulateWebSearch(term);
      results.push(...mockResults);
    } catch (error) {
      console.error(`검색어 "${term}" 처리 중 오류:`, error);
    }
  }

  return results.slice(0, 10); // 상위 10개 결과만 반환
}

// 시장 조사 검색 함수
async function performMarketResearch(query) {
  const searchTerms = [
    `${query} 시장 규모`,
    `${query} 시장 성장률`,
    `${query} 시장 점유율`,
    `${query} 시장 동향`,
    `${query} 소비자 선호도`
  ];

  const results = [];
  
  for (const term of searchTerms) {
    try {
      const mockResults = await simulateWebSearch(term);
      results.push(...mockResults);
    } catch (error) {
      console.error(`시장 조사 검색어 "${term}" 처리 중 오류:`, error);
    }
  }

  return results.slice(0, 8);
}

// 경쟁사 분석 검색 함수
async function performCompetitorAnalysis(query) {
  const searchTerms = [
    `${query} 경쟁사`,
    `${query} 브랜드 비교`,
    `${query} 시장 경쟁`,
    `${query} 경쟁 우위`,
    `${query} 차별화 전략`
  ];

  const results = [];
  
  for (const term of searchTerms) {
    try {
      const mockResults = await simulateWebSearch(term);
      results.push(...mockResults);
    } catch (error) {
      console.error(`경쟁사 분석 검색어 "${term}" 처리 중 오류:`, error);
    }
  }

  return results.slice(0, 8);
}

// 트렌드 분석 검색 함수
async function performTrendAnalysis(query) {
  const searchTerms = [
    `${query} 2024 트렌드`,
    `${query} 소비 트렌드`,
    `${query} 마케팅 트렌드`,
    `${query} 디자인 트렌드`,
    `${query} 소셜미디어 트렌드`
  ];

  const results = [];
  
  for (const term of searchTerms) {
    try {
      const mockResults = await simulateWebSearch(term);
      results.push(...mockResults);
    } catch (error) {
      console.error(`트렌드 분석 검색어 "${term}" 처리 중 오류:`, error);
    }
  }

  return results.slice(0, 8);
}

// 웹 검색 시뮬레이션 함수 (실제 구현에서는 검색 API 사용)
async function simulateWebSearch(query) {
  // 실제 구현에서는 Google Custom Search API, Bing Search API 등을 사용
  // 여기서는 시뮬레이션된 결과를 반환
  const mockData = {
    '다이슨 드라이기': [
      {
        title: '다이슨 드라이기 시장 현황 및 트렌드 분석',
        snippet: '2024년 다이슨 드라이기 시장은 프리미엄 가전 시장에서 지속적인 성장세를 보이고 있습니다. 특히 20-30대 여성을 중심으로 한 고급 헤어케어 제품 수요가 증가하고 있습니다.',
        url: 'https://example.com/dyson-market-analysis',
        source: '마케팅 리서치 리포트',
        date: '2024-01-15'
      },
      {
        title: '다이슨 vs 경쟁사 비교 분석',
        snippet: '다이슨 드라이기는 강력한 바람세기와 머리결 손상 방지 기능으로 경쟁사 대비 우위를 점하고 있습니다. 특히 곱슬머리 사용자들 사이에서 높은 만족도를 보이고 있습니다.',
        url: 'https://example.com/dyson-competitor-analysis',
        source: '소비자 리뷰 분석',
        date: '2024-01-10'
      }
    ],
    '헤어케어': [
      {
        title: '2024 헤어케어 시장 트렌드',
        snippet: '헤어케어 시장은 개인화와 프리미엄화 트렌드가 강화되고 있습니다. 특히 AI 기술을 활용한 맞춤형 헤어케어 솔루션이 주목받고 있습니다.',
        url: 'https://example.com/haircare-trends-2024',
        source: '시장 조사 보고서',
        date: '2024-01-20'
      }
    ],
    '곱슬머리': [
      {
        title: '곱슬머리 케어 제품 시장 동향',
        snippet: '곱슬머리 전용 제품 시장이 빠르게 성장하고 있습니다. 자연스러운 볼륨과 손상 방지에 중점을 둔 제품들이 인기를 끌고 있습니다.',
        url: 'https://example.com/curly-hair-market',
        source: '뷰티 마케팅 리포트',
        date: '2024-01-12'
      }
    ],
    'B2B': [
      {
        title: 'B2B 운영 관리 플랫폼 플러그(Pluuug) 분석',
        snippet: '플러그는 B2B 기업의 영업부터 정산까지 전사 운영을 관리하는 종합 플랫폼입니다. 6,000+ 기업이 이용하며, 문의 수집부터 영업 관리, 견적서, 계약 관리, 정산 관리, 리소스 관리까지 원스톱 솔루션을 제공합니다.',
        url: 'https://www.pluuug.com/',
        source: '플러그 공식 웹사이트',
        date: '2024-01-25'
      },
      {
        title: 'B2B 영업 프로세스 최적화 전략',
        snippet: 'B2B 영업에서는 신속한 문의 응대와 체계적인 고객 관리가 핵심입니다. 플러그의 사례를 보면 문의 확인 즉시, 안내 메일 3분 만에 발송으로 고객 신뢰도를 높이고 수주 성공률을 향상시킬 수 있습니다.',
        url: 'https://www.pluuug.com/',
        source: 'B2B 영업 분석 리포트',
        date: '2024-01-25'
      }
    ],
    '플러그': [
      {
        title: '플러그(Pluuug) B2B 운영 관리 솔루션',
        snippet: '플러그는 문의 수집 폼, 영업/고객 관리, 견적서, 계약 관리, 정산 관리, 리소스 관리, 대시보드 등 7가지 핵심 기능을 제공합니다. AWS 인프라 기반의 안전한 보안과 6,000+ 기업의 신뢰를 받고 있습니다.',
        url: 'https://www.pluuug.com/',
        source: '플러그 공식 웹사이트',
        date: '2024-01-25'
      },
      {
        title: 'B2B 기업 운영 효율성 향상 사례',
        snippet: '디자인/영상 스튜디오, IT/솔루션 개발사, 마케팅/행사 대행, 교육/컨설팅 등 다양한 B2B 산업에서 플러그를 활용하여 효율적인 전사 운영 체계를 구축하고 있습니다.',
        url: 'https://www.pluuug.com/',
        source: 'B2B 운영 최적화 리포트',
        date: '2024-01-25'
      }
    ],
    '영업': [
      {
        title: 'B2B 영업 프로세스 자동화 전략',
        snippet: 'B2B 영업에서는 문의 수집부터 계약 체결까지의 프로세스 자동화가 중요합니다. 플러그의 사례를 보면 견적서 요청부터 발송까지 5분 만에 처리하여 고객 첫인상을 개선하고 있습니다.',
        url: 'https://www.pluuug.com/',
        source: 'B2B 영업 자동화 분석',
        date: '2024-01-25'
      }
    ],
    '정산': [
      {
        title: 'B2B 정산 관리 및 미수금 관리 전략',
        snippet: 'B2B 기업의 수익성 향상을 위해서는 미수금과 지출 관리가 핵심입니다. 홈택스 연동 세금계산서, 입출금내역 기반 정산 확인, 계약별 지출 관리로 계약 마진을 극대화할 수 있습니다.',
        url: 'https://www.pluuug.com/',
        source: 'B2B 정산 관리 가이드',
        date: '2024-01-25'
      }
    ],
    '견적서': [
      {
        title: 'B2B 견적서 작성 및 브랜딩 전략',
        snippet: '완성도 있는 견적서는 고객에게 좋은 첫인상을 줍니다. 견적서의 브랜딩과 빠른 발송이 중요하며, 플러그의 사례를 보면 견적서 요청부터 발송까지 단 5분 만에 처리하고 있습니다.',
        url: 'https://www.pluuug.com/',
        source: 'B2B 견적서 작성 가이드',
        date: '2024-01-25'
      }
    ]
  };

  // 쿼리와 가장 유사한 키워드 찾기
  const bestMatch = Object.keys(mockData).find(key => 
    query.toLowerCase().includes(key.toLowerCase()) || 
    key.toLowerCase().includes(key.toLowerCase())
  );

  return bestMatch ? mockData[bestMatch] : [
    {
      title: `${query} 관련 최신 정보`,
      snippet: `${query}에 대한 최신 시장 동향과 소비자 반응을 분석한 결과입니다.`,
      url: 'https://example.com/search-results',
      source: '종합 분석 리포트',
      date: new Date().toISOString().split('T')[0]
    }
  ];
}

// PDF 파일 업로드 및 파싱 API
app.post('/api/upload-pdf', auth, async (req, res) => {
  try {
    const { pdfBase64, fileName } = req.body;
    
    if (!pdfBase64) {
      return res.status(400).json({ error: 'PDF 파일이 제공되지 않았습니다.' });
    }

    // Base64를 Buffer로 변환
    const pdfBuffer = Buffer.from(pdfBase64.split(',')[1], 'base64');
    
    // PDF 파싱
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;
    
    res.json({
      success: true,
      text: pdfText,
      pages: pdfData.numpages,
      info: pdfData.info
    });
  } catch (error) {
    console.error('PDF 파싱 오류:', error);
    res.status(500).json({ error: 'PDF 파싱에 실패했습니다.' });
  }
});

// 파일 분석 API - 이미지/PDF 분석 및 상세페이지 추천
app.post('/api/analyze-files', auth, async (req, res) => {
  const { images, pdfContent, productInfo } = req.body;
  
  try {
    let analysisResult = {
      productAnalysis: {},
      shootingRecommendation: {},
      detailPageRecommendation: {},
      designReferences: []
    };

    // 이미지 분석 (GPT-4 Vision 사용)
    if (images && images.length > 0) {
      const imageAnalysis = await analyzeImages(images, productInfo);
      analysisResult.productAnalysis = imageAnalysis.productAnalysis;
      analysisResult.shootingRecommendation = imageAnalysis.shootingRecommendation;
    }

    // PDF 내용 분석
    if (pdfContent) {
      const pdfAnalysis = await analyzePDFContent(pdfContent, productInfo);
      analysisResult.productAnalysis = { ...analysisResult.productAnalysis, ...pdfAnalysis.productAnalysis };
      analysisResult.detailPageRecommendation = pdfAnalysis.detailPageRecommendation;
    }

    // 상세페이지 디자인 추천 검색
    const designRecommendations = await searchDesignReferences(analysisResult.productAnalysis);
    analysisResult.designReferences = designRecommendations;

    res.json({
      success: true,
      analysis: analysisResult
    });
  } catch (error) {
    console.error('파일 분석 오류:', error);
    res.status(500).json({ error: '파일 분석에 실패했습니다.' });
  }
});

// 이미지 분석 함수
async function analyzeImages(images, productInfo) {
  const userMessages = [
    {
      type: 'text',
      text: `다음 이미지들을 분석하여 제품 정보, 촬영 컷수 추천, 상세페이지 섹션 수 추천을 해주세요.

**분석 요청사항:**
1. **제품 분석**: 제품 종류, 주요 특징, 타겟 고객층, 가격대 추정
2. **촬영 컷수 추천**: 상세페이지에 필요한 촬영 컷수와 각 컷의 목적
3. **상세페이지 섹션 추천**: 효과적인 상세페이지 구성 섹션과 개수

**제품 정보**: ${productInfo || '제공되지 않음'}

**분석 결과는 다음 형식으로 제공해주세요:**

## 📊 제품 분석 결과
| 항목 | 내용 | 근거 |
|------|------|------|
| 제품 종류 | [제품명] | 이미지 분석 결과 |
| 주요 특징 | [특징1, 특징2, 특징3] | 시각적 특징 |
| 타겟 고객 | [고객층] | 제품 특성 기반 |
| 가격대 | [가격대] | 품질 및 브랜드 분석 |

## 📸 촬영 컷수 추천
| 컷 번호 | 촬영 목적 | 중요도 | 설명 |
|---------|-----------|--------|------|
| 1 | 메인 컷 | ⭐⭐⭐⭐⭐ | 제품 전체 모습 |
| 2 | 디테일 컷 | ⭐⭐⭐⭐ | 주요 기능/특징 |
| 3 | 사용 컷 | ⭐⭐⭐⭐ | 실제 사용 모습 |
| 4 | 비교 컷 | ⭐⭐⭐ | 경쟁사 대비 장점 |
| 5 | 패키지 컷 | ⭐⭐⭐ | 포장 및 구성품 |

## 📋 상세페이지 섹션 추천
| 섹션 | 목적 | 콘텐츠 | 중요도 |
|------|------|--------|--------|
| 1. 헤더 | 첫인상 | 메인 이미지 + 핵심 메시지 | ⭐⭐⭐⭐⭐ |
| 2. 제품 소개 | 기본 정보 | 제품명, 특징, 스펙 | ⭐⭐⭐⭐⭐ |
| 3. 주요 기능 | 차별화 | 핵심 기능 3-5개 | ⭐⭐⭐⭐⭐ |
| 4. 사용법 | 이해도 | 단계별 사용법 | ⭐⭐⭐⭐ |
| 5. 비교표 | 신뢰도 | 경쟁사 대비 장점 | ⭐⭐⭐⭐ |
| 6. 고객 후기 | 신뢰도 | 실제 사용자 후기 | ⭐⭐⭐⭐ |
| 7. 구매 안내 | 전환 | 가격, 배송, AS 정보 | ⭐⭐⭐⭐⭐ |

**추가 권장사항:**
- 촬영 각도: 정면, 측면, 상단, 디테일
- 배경: 깔끔한 화이트, 라이프스타일
- 조명: 자연광 또는 스튜디오 조명
- 해상도: 최소 1920x1080px 권장`
    }
  ];

  // 이미지들을 userMessages에 추가
  images.forEach((imageBase64) => {
    userMessages.push({
      type: 'image_url',
      image_url: { url: imageBase64 }
    });
  });

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
          content: '당신은 제품 이미지 분석 전문가입니다. 이미지를 분석하여 제품 정보, 촬영 컷수, 상세페이지 구성에 대한 전문적인 조언을 제공합니다.'
        },
        {
          role: 'user',
          content: userMessages
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })
  });

  const data = await response.json();
  const analysis = data.choices?.[0]?.message?.content || '';

  return {
    productAnalysis: analysis,
    shootingRecommendation: analysis
  };
}

// PDF 내용 분석 함수
async function analyzePDFContent(pdfContent, productInfo) {
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
          content: '당신은 PDF 문서 분석 전문가입니다. 제품 브리프나 스펙서를 분석하여 상세페이지 구성에 필요한 정보를 추출합니다.'
        },
        {
          role: 'user',
          content: `다음 PDF 내용을 분석하여 상세페이지 구성에 필요한 정보를 추출해주세요:

**PDF 내용:**
${pdfContent}

**제품 정보**: ${productInfo || '제공되지 않음'}

**분석 요청사항:**
1. 제품의 주요 특징과 장점
2. 타겟 고객층 분석
3. 상세페이지에 포함해야 할 핵심 정보
4. 마케팅 포인트와 차별화 요소

**분석 결과는 다음 형식으로 제공해주세요:**

## 📋 PDF 분석 결과
| 항목 | 내용 | 출처 |
|------|------|------|
| 제품명 | [제품명] | PDF 내용 |
| 주요 특징 | [특징1, 특징2, 특징3] | 스펙서 분석 |
| 타겟 고객 | [고객층] | 마케팅 정보 |
| 핵심 메시지 | [메시지] | 브리프 분석 |

## 🎯 상세페이지 구성 제안
| 섹션 | 콘텐츠 | 중요도 |
|------|--------|--------|
| 1. 헤더 | [핵심 메시지] | ⭐⭐⭐⭐⭐ |
| 2. 제품 소개 | [기본 정보] | ⭐⭐⭐⭐⭐ |
| 3. 주요 기능 | [핵심 기능] | ⭐⭐⭐⭐⭐ |
| 4. 사용법 | [사용 방법] | ⭐⭐⭐⭐ |
| 5. 비교표 | [경쟁사 대비] | ⭐⭐⭐⭐ |
| 6. 고객 후기 | [신뢰도] | ⭐⭐⭐⭐ |
| 7. 구매 안내 | [전환 유도] | ⭐⭐⭐⭐⭐ |

**추가 권장사항:**
- 강조할 핵심 포인트
- 고객이 궁금해할 내용
- 경쟁사와의 차별화 요소`
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    })
  });

  const data = await response.json();
  const analysis = data.choices?.[0]?.message?.content || '';

  return {
    productAnalysis: analysis,
    detailPageRecommendation: analysis
  };
}

// 상세페이지 디자인 추천 검색 함수
async function searchDesignReferences(productAnalysis) {
  // 제품 분석 결과에서 키워드 추출
  const keywords = extractKeywords(productAnalysis);
  
  // 웹 검색을 통해 디자인 레퍼런스 찾기
  const searchResults = await performGeneralSearch(`${keywords.join(' ')} 상세페이지 디자인 레퍼런스`);
  
  // 샘플 디자인 레퍼런스 이미지 (실제로는 CDN이나 이미지 서버에서 제공)
  const sampleDesigns = {
    minimal: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'
    ],
    lifestyle: [
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop'
    ],
    luxury: [
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop'
    ],
    creative: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop'
    ]
  };
  
  // 디자인 추천 결과 구성
  const designRecommendations = [
    {
      title: '모던 미니멀 스타일',
      description: '깔끔하고 심플한 디자인으로 제품에 집중',
      examples: searchResults.slice(0, 2),
      sampleImages: sampleDesigns.minimal,
      style: 'minimal',
      colorScheme: ['#ffffff', '#f8f9fa', '#212529'],
      typography: 'Sans-serif',
      layout: 'Grid-based',
      features: ['깔끔한 레이아웃', '제품 중심 디자인', '여백 활용', '단순한 색상 팔레트'],
      bestFor: '기술 제품, 프리미엄 브랜드, 깔끔한 이미지가 필요한 제품'
    },
    {
      title: '컬러풀 라이프스타일',
      description: '활기찬 색상과 라이프스타일 이미지 활용',
      examples: searchResults.slice(2, 4),
      sampleImages: sampleDesigns.lifestyle,
      style: 'lifestyle',
      colorScheme: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#feca57'],
      typography: 'Modern',
      layout: 'Story-based',
      features: ['다채로운 색상', '라이프스타일 이미지', '감성적 어필', '스토리텔링'],
      bestFor: '패션, 뷰티, 라이프스타일 제품, 젊은 타겟'
    },
    {
      title: '프리미엄 럭셔리',
      description: '고급스러운 느낌의 프리미엄 디자인',
      examples: searchResults.slice(4, 6),
      sampleImages: sampleDesigns.luxury,
      style: 'luxury',
      colorScheme: ['#2c3e50', '#34495e', '#ecf0f1', '#bdc3c7'],
      typography: 'Serif',
      layout: 'Full-width',
      features: ['고급스러운 색상', '세련된 타이포그래피', '넓은 레이아웃', '프리미엄 느낌'],
      bestFor: '고급 브랜드, 럭셔리 제품, 프리미엄 서비스'
    },
    {
      title: '플레이풀 크리에이티브',
      description: '재미있고 창의적인 디자인으로 주목도 향상',
      examples: searchResults.slice(6, 8),
      sampleImages: sampleDesigns.creative,
      style: 'creative',
      colorScheme: ['#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3'],
      typography: 'Display',
      layout: 'Asymmetric',
      features: ['창의적인 레이아웃', '다양한 그래픽 요소', '인터랙티브 요소', '높은 주목도'],
      bestFor: '창의적 제품, 엔터테인먼트, 젊은 브랜드'
    }
  ];

  return designRecommendations;
}

// 키워드 추출 함수
function extractKeywords(text) {
  const commonKeywords = ['제품', '기능', '특징', '디자인', '스타일', '컬러', '타겟', '고객'];
  const extracted = [];
  
  commonKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      extracted.push(keyword);
    }
  });
  
  return extracted.length > 0 ? extracted : ['상세페이지', '디자인', '제품'];
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on ${PORT}`)); 