// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const { generatePrompt, generateSettings } = require('./promptGenerator');
const { queryOpenAI } = require('./openai');
const { connectDB } = require('./db'); // ← 修正済み

const app = express();
const PORT = process.env.PORT || 3000;

// JSON バックアップ用（任意）
const LOG_FILE = path.join(__dirname, 'logs', 'all_sessions.json');
const FEEDBACK_FILE = path.join(__dirname, 'logs', 'feedback.json');

// フォルダ作成
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// セッション
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

// -------------------------------
// セッション初期化
// -------------------------------
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

// -------------------------------
// チャット API
// -------------------------------
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

  // -------------------------
  // ✅ MongoDB 保存
  // -------------------------
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

  // JSON バックアップ
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

// -------------------------------
// フィードバック保存
// -------------------------------
app.post('/feedback', async (req, res) => {
  const { aiResponse, rating, comment } = req.body;

  const feedback = {
    timestamp: new Date().toISOString(),
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

// -------------------------------

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
