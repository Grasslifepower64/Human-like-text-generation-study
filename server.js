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

// セッション初期化
function init(req) {
  const id = req.body.customSessionID;
  if (!req.session.map) req.session.map = {};
  if (!req.session.map[id]) {
    req.session.map[id] = {
      settings: generateSettings(),
      conversation: []
    };
  }
}

// チャット
app.post('/chat', async (req, res) => {
  init(req);
  const s = req.session.map[req.body.customSessionID];
  const { systemMessageContent, userMessageContent } =
    generatePrompt(req.body.message, s.settings);
  const ai = await queryOpenAI(systemMessageContent, userMessageContent);

  s.conversation.push({ user: req.body.message, ai });

  const db = await connectDB();
  await db.collection("sessions").updateOne(
    { sessionID: req.body.customSessionID },
    { $setOnInsert: { sessionID: req.body.customSessionID, promptSettings: s.settings },
      $push: { conversation: { user: req.body.message, ai, at: new Date() } } },
    { upsert: true }
  );

  res.json({ response: ai });
});

// フィードバック
app.post('/feedback', async (req, res) => {
  const db = await connectDB();
  await db.collection("feedbacks").insertOne({
    ...req.body,
    createdAt: new Date()
  });
  res.json({ status: "ok" });
});

// 設定取得
app.get('/session-settings', async (req, res) => {
  const db = await connectDB();
  const s = await db.collection("sessions").findOne({ sessionID: req.query.sessionID });
  res.json(s?.promptSettings || {});
});

app.listen(PORT, () => console.log("🚀 Server running"));