const connectDB = require('./db');

async function appendConversation(sessionID, newMessage) {
  const db = await connectDB();
  const collection = db.collection("logs");

  await collection.updateOne(
    { sessionID: sessionID },
    { $push: { conversation: newMessage } }
  );

  console.log("会話を追加しました！");
}

// 追加する会話
const newMessage = {
  userInput: "今日の予定は？",
  aiResponse: "にゃん！今日はリラックスして過ごすのがいいかもしれませんねぇ！"
};

appendConversation("od452624yj", newMessage);