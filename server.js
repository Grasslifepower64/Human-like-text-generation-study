require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const { generatePrompt, generateSettings } = require('./promptGenerator');
const { queryOpenAI } = require('./openai');
const { connectDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

app.use(bodyParser.json());
app.use(express.static('public'));

function initSession(req, id) {
  if (!req.session.map) req.session.map = {};
  if (!req.session.map[id]) {
    req.session.map[id] = {
      settings: generateSettings(),
      conversation: []
    };
  }
}

app.post('/chat', async (req, res) => {
  const { message, customSessionID } = req.body;
  initSession(req, customSessionID);

  const s = req.session.map[customSessionID];
  const { systemMessageContent, userMessageContent } =
    generatePrompt(message, s.settings);

  const aiResponse = await queryOpenAI(systemMessageContent, userMessageContent);
  s.conversation.push({ message, aiResponse });

  const db = await connectDB();
  await db.collection('sessions').updateOne(
    { sessionID: customSessionID },
    {
      $setOnInsert: { sessionID: customSessionID, promptSettings: s.settings },
      $push: { conversation: { message, aiResponse, time: new Date() } }
    },
    { upsert: true }
  );

  res.json({ response: aiResponse });
});

app.post('/feedback', async (req, res) => {
  const db = await connectDB();
  await db.collection('feedbacks').insertOne({
    ...req.body,
    createdAt: new Date()
  });
  res.json({ status: 'ok' });
});

app.get('/session-settings', async (req, res) => {
  const db = await connectDB();
  const doc = await db.collection('sessions')
    .findOne({ sessionID: req.query.sessionID });
  res.json(doc?.promptSettings || {});
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});