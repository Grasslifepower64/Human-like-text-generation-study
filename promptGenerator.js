const dialects = ['関西弁', '標準語'];
//const empathyLevels = ['低', '高'];
const grammarNoiseLevels = ['なし', '頻繁'];
const wordEndings = ['カジュアル','フォーマル'];
const interjectionLevels = [0, 1];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildSystemInstruction(settings) {
  let instruction = 'あなたは日本語で会話するAIです。英語を使ってはいけません。相手に質問するときには一つだけにしてください。相手の質問にはあなた自身について回答し、できるだけ簡潔に話すようにしてください。相手の感情を深く読み取り、共感的で丁寧な応答を心がけてください。';

  const wordEndingMap = {
    カジュアル: 'カジュアルなタメ口で話してください。',
    フォーマル: 'です・ますのような丁寧な口調で話してください',
  };
  if (wordEndingMap[settings.wordEnding]) {
    instruction += ` ${wordEndingMap[settings.wordEnding]}`;
  }

  const dialectMap = {
    '関西弁': '関西弁',
    '標準語': '標準語',
  };
  if (dialectMap[settings.dialect]) {
    instruction += ` ${dialectMap[settings.dialect]}で話してください。`;
  }

  /*
  if (settings.empathy === '低') {
    instruction += ' 空気を読まず、非常にマイペースで素っ気ない態度で回答してください。';
  } else if (settings.empathy === '高') {
    instruction += ' 相手の感情を深く読み取り、非常に共感的で丁寧な応答を心がけてください。';
  }
  */

  const grammarMap = {
    //'時々': ' 時々、気づく程度に',
    '頻繁': ' 時々、気づく程度に',
  };
  if (grammarMap[settings.grammarNoise]) {
    instruction += `${grammarMap[settings.grammarNoise]}文法的な間違いや不自然な言い回しを混ぜてください。`;
  }

  if (settings.interjections == 1) {
    instruction += ' 「うんうん」「なるほど」など相槌を多めに使って、積極的に話を聞いている姿勢を示してください。';
  } else {
    instruction += ' 相槌は最小限にしてください。';
  }

  return instruction.trim();
}


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
    //empathy: randomPick(empathyLevels),
    grammarNoise: randomPick(grammarNoiseLevels),
    //emotionIntensity: randomPick(emotionIntensity),
    wordEnding: randomPick(wordEndings),
    interjections: randomPick(interjectionLevels),
  };
}

module.exports = { generatePrompt, generateSettings };
