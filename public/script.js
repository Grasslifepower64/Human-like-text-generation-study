if (!sessionStorage.getItem('customSessionID')) {
  sessionStorage.setItem('customSessionID', Math.random().toString(36).slice(2));
}
const customSessionID = sessionStorage.getItem('customSessionID');

let lastAiResponse = '';
let endTimer = null;

window.onload = () => {
  document.addEventListener('keydown', startApp);
  document.addEventListener('click', startApp);

  document.getElementById('send-btn').onclick = sendMessage;
  document.getElementById('end-btn').onclick = endConversation;
  document.getElementById('send-feedback').onclick = sendFeedback;

  document.querySelectorAll('.scale-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
  });
};

function startApp() {
  document.removeEventListener('keydown', startApp);
  document.removeEventListener('click', startApp);

  document.getElementById('start-screen').style.display = 'none';

  if (!localStorage.getItem('consentGiven')) {
    document.getElementById('consent-modal').style.display = 'flex';
  } else {
    showChat();
  }
}

function acceptConsent() {
  localStorage.setItem('consentGiven', 'yes');
  document.getElementById('consent-modal').style.display = 'none';
  showChat();
}

function showChat() {
  document.getElementById('chat-screen').classList.remove('hidden');
  appendMessage('やあ。今日は少しお話ししよう。気軽に話してね。', 'bot');
}

function appendMessage(text, who) {
  const box = document.getElementById('chat-box');
  const wrap = document.createElement('div');
  wrap.className = `message ${who}`;
  const bub = document.createElement('div');
  bub.className = 'bubble';
  bub.innerText = text;
  wrap.appendChild(bub);
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('user-input');
  if (!input.value) return;

  appendMessage(input.value, 'user');
  const text = input.value;
  input.value = '';

  const res = await fetch('/chat', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ message: text, customSessionID })
  });
  const data = await res.json();
  appendMessage(data.response, 'bot');
  lastAiResponse = data.response;

  resetEndTimer();
}

function resetEndTimer() {
  clearTimeout(endTimer);
  endTimer = setTimeout(() => {
    document.getElementById('feedback-section').scrollIntoView({behavior:'smooth'});
  }, 30000);
}

function endConversation() {
  clearTimeout(endTimer);
  document.getElementById('feedback-section').scrollIntoView({behavior:'smooth'});
}

async function sendFeedback() {
  const btn = document.getElementById('send-feedback');
  if (btn.disabled) return;

  const scoreBtn = document.querySelector('.scale-btn.selected');
  const gender = document.getElementById('gender-select').value;

  if (!scoreBtn || !gender) {
    alert('評価と性別を選択してください');
    return;
  }

  btn.disabled = true;
  btn.innerText = '送信中…';

  await fetch('/feedback', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      customSessionID,
      score: scoreBtn.dataset.value,
      gender,
      comment: document.getElementById('feedback-comment').value,
      aiResponse: lastAiResponse
    })
  });

  appendMessage('ありがとう。実はこのAIは…', 'bot');

  setTimeout(showSettings, 600);
}

async function showSettings() {
  const res = await fetch(`/session-settings?sessionID=${customSessionID}`);
  const s = await res.json();

  appendMessage(
    `方言:${s.dialect}\n共感:${s.empathy}\n文法:${s.grammarNoise}\n感情:${s.emotionIntensity}\n語尾:${s.wordEnding}`,
    'bot'
  );
}
