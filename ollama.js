/*
const axios = require('axios');

async function queryOllama(prompt) {
  const response = await axios.post('http://localhost:11434/api/generate', {
    model: 'phi3',
    prompt: prompt,
    stream: false
  });

  const data = response.data;

  // 文字列かオブジェクトかを判定して返す
  if (typeof data === 'string') {
    return data;
  } else if (typeof data === 'object' && data.response) {
    return data.response;
  } else {
    return '（AI応答が取得できませんでした）';
  }
}

module.exports = { queryOllama };
*/


//改良版
require('dotenv').config(); // ← これをファイルの先頭に追加
const axios = require('axios');

/**
 * プロンプトに「作文依頼っぽい」キーワードが含まれているかを判定
 * 例：「作文」「説明」「文章」「書いて」「感想」「レポート」など
 */
function isEssayRequest(prompt) {
  const essayKeywords = /作文|説明|文章|書いて|感想|レポート|物語|紹介|要約|まとめ|解説/;
  return essayKeywords.test(prompt);
}

/**
 * Ollamaに問い合わせて応答を取得する関数
 * 通常の会話では max_tokens を制限（短く）
 * 作文依頼の場合は制限なし（長文OK）
 */
async function queryOllama(prompt) {
  const isEssay = isEssayRequest(prompt);
  const maxTokens = isEssay ? undefined : 10;

  // リクエストペイロードを構築（max_tokens は条件付きで追加）
  const payload = {
    model: 'llama3',
    prompt: prompt,
    stream: false,
    //...(maxTokens !== undefined && { max_tokens: maxTokens })
  };

  try {
    const response = await axios.post('http://localhost:11434/api/generate', payload);
    const data = response.data;

    // 応答の形式に応じて返す
    if (typeof data === 'string') {
      return data;
    } else if (typeof data === 'object' && data.response) {
      return data.response;
    } else {
      return '（AI応答が取得できませんでした）';
    }
  } catch (error) {
    console.error('Ollama APIエラー:', error.message);
    return '（Ollamaとの通信に失敗しました）';
  }
}

module.exports = { queryOllama };