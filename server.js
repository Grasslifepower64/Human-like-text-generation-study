require('dotenv').config(); // ← ファイルの先頭に追加
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const { generatePrompt, generateSettings } = require('./promptGenerator');
//const { queryOllama } = require('./ollama');

const { queryOpenAI } = require('./openai');


const app = express();
const PORT = process.env.PORT || 3000;
const LOG_FILE = path.join(__dirname, 'logs', 'all_sessions.json');

const logDir = path.join(__dirname, 'logs');
const logFile = path.join(logDir, 'all_sessions.txt');

// フォルダがなければ作成
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// ファイルがなければ作成（追記モードで開くと自動生成される）
const stream = fs.createWriteStream(logFile, { flags: 'a' });



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


/*
// セッション初期化とログ初期化
function initializeSession(req) {
  if (!req.session.sessionID) {
    req.session.sessionID = Math.random().toString(36).substring(2);
    req.session.promptSettings = generateSettings();
    req.session.conversation = [];

    if (!fs.existsSync(LOG_FILE)) {
      fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2));
    }

    const allLogs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    allLogs.push({
      sessionID: req.session.sessionID,
      timestamp: new Date().toISOString(),
      promptSettings: req.session.promptSettings,
      conversation: []
    });
    fs.writeFileSync(LOG_FILE, JSON.stringify(allLogs, null, 2));
  }
}
*/

function initializeSession(req) {
  const incomingID = req.body.customSessionID;

  // セッション内に customSessionMap を持たせる
  if (!req.session.customSessionMap) {
    req.session.customSessionMap = {};
  }

  // この customSessionID に対する設定がまだなければ作成
  if (!req.session.customSessionMap[incomingID]) {
    const newSettings = generateSettings();
    req.session.customSessionMap[incomingID] = {
      promptSettings: newSettings,
      conversation: []
    };

    // ログ保存もここで
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















/*
// 会話をログに追記
function appendConversation(req, userInput, aiResponse) {
  const allLogs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  const sessionLog = allLogs.find(log => log.sessionID === req.session.sessionID);
  if (sessionLog) {
    sessionLog.conversation.push({ userInput, aiResponse });
    fs.writeFileSync(LOG_FILE, JSON.stringify(allLogs, null, 2));
  }
}
*/

/*

app.post('/chat', async (req, res) => {
  const userInput = req.body.message;
  initializeSession(req);

  // 直近3ターンの履歴を取得
  const recentHistory = req.session.conversation.slice(-3)
    .map(turn => `ユーザー: ${turn.userInput}\nAI: ${turn.aiResponse}`)
    .join('\n');

  // プロンプト生成（履歴＋今回の入力）
  const promptWithHistory = recentHistory
    ? `${recentHistory}\nユーザー: ${userInput}\nAI:`
    : `ユーザー: ${userInput}\nAI:`;

  // プロンプト生成関数に履歴付きプロンプトを渡す
  const prompt = generatePrompt(promptWithHistory, req.session.promptSettings);
  const aiResponse = await queryOllama(prompt);

  req.session.conversation.push({ userInput, aiResponse });
  appendConversation(req, userInput, aiResponse);

  res.json({ response: aiResponse });
});
*/


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

  /*
  const prompt = generatePrompt(promptWithHistory, sessionData.promptSettings);
  const aiResponse = await queryOllama(prompt);
  */
  const { systemMessageContent, userMessageContent } = generatePrompt(promptWithHistory, sessionData.promptSettings);
  const aiResponse = await queryOpenAI(systemMessageContent, userMessageContent);

  sessionData.conversation.push({ userInput, aiResponse });

  // ログにも追記
  const allLogs = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  const sessionLog = allLogs.find(log => log.sessionID === customSessionID);
  if (sessionLog) {
    sessionLog.conversation.push({ userInput, aiResponse });
    fs.writeFileSync(LOG_FILE, JSON.stringify(allLogs, null, 2));
  }

  res.json({ response: aiResponse });
});










/*
//ローカル用
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
*/
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



// フィードバック

const FEEDBACK_FILE = path.join(__dirname, 'logs', 'feedback.json');

app.post('/feedback', (req, res) => {
  initializeSession(req);

  const { aiResponse, rating, comment } = req.body;
  const feedback = {
    timestamp: new Date().toISOString(),
    sessionID: req.session.sessionID,
    aiResponse,
    rating,
    comment
  };

  // フィードバック保存
  let feedbacks = [];
  if (fs.existsSync(FEEDBACK_FILE)) {
    feedbacks = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
  }
  feedbacks.push(feedback);
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2));

  res.json({ status: 'ok' });
});
