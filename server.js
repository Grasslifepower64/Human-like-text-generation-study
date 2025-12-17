require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const { generatePrompt, generateSettings } = require('./promptGenerator');
const { queryOpenAI } = require('./openai');
const { connectDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// =====================
// ログ保存先
// =====================
const LOG_DIR = path.join(__dirname, 'logs');
const SESSION_LOG = path.join(LOG_DIR, 'all_sessions.json');
const FEEDBACK_LOG = path.join(LOG_DIR, 'feedback.json');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

// =====================
// middleware
// =====================
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60 * 60 * 1000 }
}));

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =====================
// セッション初期化
// =====================
function initializeSession(req) {
  const sessionID = req.body.customSessionID;

  if (!req.session.customSessionMap) {
    req.session.customSessionMap = {};
  }

  if (!req.session.customSessionMap[sessionID]) {
    const settings = generateSettings();

    req.session.customSessionMap[sessionID] = {
      promptSettings: settings,
      conversation: []
    };

    const logs = fs.existsSync(SESSION_LOG)
      ? JSON.parse(fs.readFileSync(SESSION_LOG, 'utf8'))
      : [];

    logs.push({
      sessionID,
      createdAt: new Date(),
      promptSettings: settings,
      conversation: []
    });

    fs.writeFileSync(SESSION_LOG, JSON.stringify(logs, null, 2));
  }
}

// =====================
// チャットAPI
// =====================
app.post('/chat', async (req, res) => {
  const { message, customSessionID } = req.body;

  initializeSession(req);
  const sessionData = req.session.customSessionMap[customSessionID];

  const history = sessionData.conversation.slice(-3)
    .map(t => `ユーザー: ${t.userInput}\nAI: ${t.aiResponse}`)
    .join('\n');

  const prompt = history
    ? `${history}\nユーザー: ${message}\nAI:`
    : `ユーザー: ${message}\nAI:`;

  const { systemMessageContent, userMessageContent } =
    generatePrompt(prompt, sessionData.promptSettings);

  const aiResponse = await queryOpenAI(systemMessageContent, userMessageContent);

  sessionData.conversation.push({ userInput: message, aiResponse });

  // MongoDB保存
  try {
    const db = await connectDB();
    await db.collection('sessions').updateOne(
      { sessionID: customSessionID },
      {
        $setOnInsert: {
          sessionID: customSessionID,
          promptSettings: sessionData.promptSettings,
          createdAt: new Date()
        },
        $push: {
          conversation: {
            userInput: message,
            aiResponse,
            timestamp: new Date()
          }
        }
      },
      { upsert: true }
    );
  } catch (e) {
    console.error('❌ MongoDB chat save error:', e);
  }

  res.json({ response: aiResponse });
});

// =====================
// フィードバックAPI（★統合版）
// =====================
app.post('/feedback', async (req, res) => {
  const { customSessionID, rating, gender, comment, aiResponse } = req.body;

  if (!rating || !gender) {
    return res.status(400).json({ error: 'rating and gender required' });
  }

  const feedback = {
    sessionID: customSessionID,
    score: Number(rating),
    gender,
    comment: comment || '',
    aiResponse,
    createdAt: new Date()
  };

  // MongoDB
  try {
    const db = await connectDB();
    await db.collection('feedbacks').insertOne(feedback);
  } catch (e) {
    console.error('❌ MongoDB feedback error:', e);
  }

  // JSONバックアップ
  const fb = fs.existsSync(FEEDBACK_LOG)
    ? JSON.parse(fs.readFileSync(FEEDBACK_LOG, 'utf8'))
    : [];

  fb.push(feedback);
  fs.writeFileSync(FEEDBACK_LOG, JSON.stringify(fb, null, 2));

  res.json({ status: 'ok' });
});

// =====================
// AI設定取得
// =====================
app.get('/session-settings', async (req, res) => {
  const { sessionID } = req.query;
  if (!sessionID) return res.json({ error: 'no sessionID' });

  try {
    const db = await connectDB();
    const doc = await db.collection('sessions').findOne({ sessionID });
    if (!doc) return res.json({ error: 'not found' });
    res.json(doc.promptSettings);
  } catch (e) {
    console.error('❌ session-settings error:', e);
    res.status(500).json({ error: 'internal' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});