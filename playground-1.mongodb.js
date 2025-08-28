/* global use, db */
// MongoDB Playground
// To disable this template go to Settings | MongoDB | Use Default Template For Playground.
// Make sure you are connected to enable completions and to be able to run a playground.
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.
// The result of the last command run in a playground is shown on the results panel.
// By default the first 20 documents will be returned with a cursor.
// Use 'console.log()' to print to the debug output.
// For more documentation on playgrounds please refer to
// https://www.mongodb.com/docs/mongodb-vscode/playgrounds/

use('chatlogs');

db.logs.insertOne({
  sessionID: "abc123",
  timestamp: new Date(),
  promptSettings: {
    dialect: "標準語",
    empathy: "中",
    grammarNoise: "少し",
    emotionIntensity: "控えめ",
    wordEnding: "cat",
    interjections: 8
  },
  conversation: [
    {
      userInput: "おはよう",
      aiResponse: "おはようございます！にゃん！"
    }
  ]
});


// 保存されたデータを確認
db.logs.find().pretty();

/*削除
use('chatlogs');

db.logs.deleteMany({ sessionID: "abc123" });
*/