require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const { generatePrompt, generateSettings } = require('./promptGenerator');
const { queryOpenAI } = require('./openai');
const { connectDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true
}));

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// ===== セッション初期化 =====
function init(req) {
  const id = req.body.customSessionID;
  if (!req.session.map) req.session.map = {};
  if (!req.session.map[id]) {
    req.session.map[id] = {
      settings: generateSettings(),
      conversation: [] // ← 会話履歴
    };
  }
}

// ===== チャット =====
app.post('/chat', async (req, res) => {
  init(req);
  const s = req.session.map[req.body.customSessionID];

  // システムプロンプト生成
  const { systemMessageContent } =
    generatePrompt("", s.settings);

  // ===== 直近3往復だけ使う =====
  const recentHistory = s.conversation.slice(-6);

  const messages = [
    { role: 'system', content: systemMessageContent },
    ...recentHistory.flatMap(turn => ([
      { role: 'user', content: turn.user },
      { role: 'assistant', content: turn.ai }
    ])),
    { role: 'user', content: req.body.message }
  ];

  const ai = await queryOpenAI(messages, 150);

  // 保存
  s.conversation.push({
    user: req.body.message,
    ai,
    at: new Date()
  });

  const db = await connectDB();
  await db.collection("sessions").updateOne(
    { sessionID: req.body.customSessionID },
    {
      $setOnInsert: {
        sessionID: req.body.customSessionID,
        promptSettings: s.settings
      },
      $push: {
        conversation: {
          user: req.body.message,
          ai,
          at: new Date()
        }
      }
    },
    { upsert: true }
  );

  res.json({ response: ai });
});

// ===== フィードバック =====
app.post('/feedback', async (req, res) => {
  const { sessionID, score, gender, comment } = req.body;
  if (!sessionID || !score || !gender) {
    return res.status(400).json({ error: "invalid" });
  }

  const db = await connectDB();
  await db.collection("sessions").updateOne(
    { sessionID },
    {
      $set: {
        feedback: {
          score: Number(score),
          gender,
          comment: comment || "",
          createdAt: new Date()
        }
      }
    }
  );

  res.json({ status: "ok" });
});

// ===== 設定取得 =====
app.get('/session-settings', async (req, res) => {
  const db = await connectDB();
  const s = await db.collection("sessions").findOne(
    { sessionID: req.query.sessionID },
    { projection: { promptSettings: 1 } }
  );
  res.json(s?.promptSettings || {});
});

app.listen(PORT, () => console.log("🚀 Server running"));