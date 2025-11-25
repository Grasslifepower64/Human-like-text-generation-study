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

// JSON バックアップ用
const LOG_FILE = path.join(__dirname, 'logs', 'all_sessions.json');
const FEEDBACK_FILE = path.join(__dirname, 'logs', 'feedback.json');

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

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

// セッション初期化（同じ）
function initializeSession(req) {
  const incomingID = req.body.customSessionID;

  if (!req.session.customSessionMap) {
    req.session.customSessionMap = {};
  }

  if (!req.session.customSessionMap[incomingID]) {
    const newSettings = generateSettings();
    req.session.customSessionMap[incomingID] = {
      promptSettings: newSettings,
      conversation: []
    };

    // JSON バックアップ（任意）
    const allLogs = fs.existsSync(LOG_FILE)
      ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'))
      : [];

    allLogs.push({
      sessionID: incomingID,
      timestamp: new Date().toISOString(),
      promptSettings: newSettings,
      conversation: []
    });

    fs.writeFileSync(LOG_FILE, JSON.stringify(allLogs, null, 2));
  }
}

// チャット受信
app.post('/chat', async (req, res) => {
  const userInput = req.body.message;
  const customSessionID = req.body.customSessionID;

  initializeSession(req);
  const sessionData = req.session.customSessionMap[customSessionID];

  const recentHistory = sessionData.conversation.slice(-3)
    .map(turn => `ユーザー: ${turn.userInput}\nAI: ${turn.aiResponse}`)
    .join('\n');

  const promptWithHistory = recentHistory
    ? `${recentHistory}\nユーザー: ${userInput}\nAI:`
    : `ユーザー: ${userInput}\nAI:`;

  const { systemMessageContent, userMessageContent } =
    generatePrompt(promptWithHistory, sessionData.promptSettings);

  const aiResponse = await queryOpenAI(systemMessageContent, userMessageContent);

  sessionData.conversation.push({ userInput, aiResponse });

  // MongoDB に保存（sessions コレクション）
  try {
    const db = await connectDB();
    const sessions = db.collection("sessions");

    await sessions.updateOne(
      { sessionID: customSessionID },
      {
        $setOnInsert: {
          sessionID: customSessionID,
          promptSettings: sessionData.promptSettings,
          createdAt: new Date()
        },
        $push: {
          conversation: {
            userInput,
            aiResponse,
            timestamp: new Date()
          }
        }
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("❌ MongoDB save error:", err);
  }

  // JSON バックアップ（任意）
  if (fs.existsSync(LOG_FILE)) {
    const allLogs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    const sessionLog = allLogs.find(log => log.sessionID === customSessionID);
    if (sessionLog) {
      sessionLog.conversation.push({ userInput, aiResponse });
      fs.writeFileSync(LOG_FILE, JSON.stringify(allLogs, null, 2));
    }
  }

  res.json({ response: aiResponse });
});

// フィードバック受信（sessionID を受け取る）
app.post('/feedback', async (req, res) => {
  const { aiResponse, rating, comment, customSessionID } = req.body;

  const feedback = {
    timestamp: new Date().toISOString(),
    sessionID: customSessionID || null,
    aiResponse,
    rating,
    comment
  };

  try {
    const db = await connectDB();
    const feedbacks = db.collection("feedbacks");
    await feedbacks.insertOne(feedback);
  } catch (err) {
    console.error("❌ MongoDB feedback save error:", err);
  }

  // JSON バックアップ
  let fb = [];
  if (fs.existsSync(FEEDBACK_FILE)) {
    fb = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
  }
  fb.push(feedback);
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(fb, null, 2));

  res.json({ status: 'ok' });
});

// セッション設定を返す API
app.get('/session-settings', async (req, res) => {
  const sessionID = req.query.sessionID;
  if (!sessionID) return res.json({ error: 'no sessionID' });

  try {
    const db = await connectDB();
    const sessionDoc = await db.collection("sessions").findOne({ sessionID });
    if (!sessionDoc) {
      return res.json({ error: 'not found' });
    }
    return res.json(sessionDoc.promptSettings || {});
  } catch (err) {
    console.error("❌ session-settings error:", err);
    res.status(500).json({ error: 'internal' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
