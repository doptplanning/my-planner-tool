require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Client } = require('@notionhq/client');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

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

    // Notion API filter: 제목에 검색어 포함
    let filter = undefined;
    if (search && search.trim() !== '') {
      filter = {
        property: titleKey,
        title: { contains: search }
      };
    }

    // 페이지네이션: Notion은 100개씩만 반환하므로, 전체 결과를 모두 모은다
    let hasMore = true;
    let start_cursor = undefined;
    let allResults = [];
    while (hasMore) {
      const response = await notion.databases.query({
        database_id: databaseId,
        filter,
        start_cursor,
        page_size: 100
      });
      allResults = allResults.concat(response.results);
      hasMore = response.has_more;
      start_cursor = response.next_cursor;
    }
    // 전체 개수
    const total = allResults.length;
    // 현재 페이지에 해당하는 20개만 추출
    const pagedResults = allResults.slice((page - 1) * pageSize, page * pageSize);
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
    // 학습 기록 생성
    const training = await Training.create({
      userId: req.user.id,
      notionToken,
      databaseId,
      pageIds,
      status: 'processing'
    });
    
    const notion = new Client({ auth: notionToken });
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    let allContent = '';
    
    // 선택된 페이지들의 내용 수집
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
    
    // OpenAI를 사용한 학습 (Fine-tuning 대신 임시로 요약 생성)
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "당신은 노션 데이터를 분석하고 학습하는 AI 어시스턴트입니다. 주어진 내용을 바탕으로 핵심 정보를 추출하고 요약해주세요."
        },
        {
          role: "user",
          content: `다음 노션 데이터를 분석하고 핵심 정보를 요약해주세요:\n\n${allContent.substring(0, 4000)}`
        }
      ],
      max_tokens: 1000
    });
    
    const result = completion.choices[0].message.content;
    
    // 학습 결과 저장
    await Training.findByIdAndUpdate(training._id, {
      status: 'completed',
      result: result
    });
    
    res.json({ 
      success: true, 
      message: 'AI 모델 학습이 완료되었습니다.',
      result: result
    });
    
  } catch (error) {
    console.error('AI 학습 오류:', error);
    
    // 오류 발생 시 상태 업데이트
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on ${PORT}`)); 