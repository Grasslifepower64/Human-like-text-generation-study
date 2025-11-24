const dialects = ['関西弁', '博多弁', '津軽弁', '標準語'];
const empathyLevels = ['低', '中', '高'];
const grammarNoiseLevels = ['なし', '少し', '時々', '頻繁'];
const emotionIntensity = ['控えめ', '普通', '多め'];
const wordEndings = ['casual', 'cat', 'samurai'];
const interjectionLevels = [0, 2, 5, 8]; // 数値で扱う

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildSystemInstruction(settings) {
  let instruction = 'あなたは日本語で会話するAIです。英語を使ってはいけません';

  const wordEndingMap = {
    casual: 'カジュアルなタメ口で話してください。',
    cat: '文末に「にゃん」を付けて、猫のように話してください。',
    samurai: '武士のような言葉遣いで話してください。語尾は「ござる」などを使用してください。',
  };
  if (wordEndingMap[settings.wordEnding]) {
    instruction += ` ${wordEndingMap[settings.wordEnding]}`;
  }

  const dialectMap = {
    '関西弁': '関西弁',
    '博多弁': '博多弁',
    '津軽弁': '東北弁',
    '標準語': '標準語',
  };
  if (dialectMap[settings.dialect]) {
    instruction += ` ${dialectMap[settings.dialect]}で話してください。`;
  }

  if (settings.empathy === '低') {
    instruction += ' 空気を読まず、非常にマイペースで素っ気ない態度で回答してください。';
  } else if (settings.empathy === '高') {
    instruction += ' 相手の感情を深く読み取り、非常に共感的で丁寧な応答を心がけてください。';
  }

  const grammarMap = {
    '少し': ' 少しだけ、意図的でないかのように',
    '時々': ' 時々、気づく程度に',
    '頻繁': ' 頻繁に、外国人学習者のように',
  };
  if (grammarMap[settings.grammarNoise]) {
    instruction += `${grammarMap[settings.grammarNoise]}文法的な間違いや不自然な言い回しを混ぜてください。`;
  }

  if (settings.interjections >= 8) {
    instruction += ' 「うんうん」「なるほど」「それで？」といった相槌を多めに使って、積極的に話を聞いている姿勢を示してください。';
  } else if (settings.interjections <= 2) {
    instruction += ' 相槌は最小限にしてください。';
  }

  return instruction.trim();
}



/*
function generatePrompt(userInput, settings) {
  const systemInstruction = buildSystemInstruction(settings);

  return `
${systemInstruction}
以下の発言に返答してください：
「${userInput}」
`;
}
*/

function generatePrompt(userInput, settings) {
  const systemInstruction = buildSystemInstruction(settings);
  const userMessage = `以下の発言に返答してください：\n「${userInput}」`;

  return {
    systemMessageContent: systemInstruction,
    userMessageContent: userMessage
  };
}


function generateSettings() {
  return {
    dialect: randomPick(dialects),
    empathy: randomPick(empathyLevels),
    grammarNoise: randomPick(grammarNoiseLevels),
    emotionIntensity: randomPick(emotionIntensity),
    wordEnding: randomPick(wordEndings),
    interjections: randomPick(interjectionLevels),
  };
}

module.exports = { generatePrompt, generateSettings };
