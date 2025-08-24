require('dotenv').config(); // ← 環境変数読み込み
const { Configuration, OpenAIApi } = require('openai');

/**
 * プロンプトに「作文依頼っぽい」キーワードが含まれているかを判定
 */
function isEssayRequest(prompt) {
  const essayKeywords = /作文|説明|文章|書いて|感想|レポート|物語|紹介|要約|まとめ|解説/;
  return essayKeywords.test(prompt);
}

// OpenAI APIの初期化
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * OpenAIに問い合わせて応答を取得する関数
 * 通常の会話では max_tokens を制限（短く）
 * 作文依頼の場合は制限なし（長文OK）
 */
async function queryOpenAI(prompt) {
  const isEssay = isEssayRequest(prompt);
  const maxTokens = isEssay ? 1000 : 50;

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'あなたは親切で賢いアシスタントです。' },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
    });

    const message = response.data.choices[0].message.content;
    return message;
  } catch (error) {
    console.error('OpenAI APIエラー:', error.message);
    return '（OpenAIとの通信に失敗しました）';
  }
}

module.exports = { queryOpenAI };