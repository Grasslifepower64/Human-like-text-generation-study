let selectedRating = null;
let lastAiResponse = '';
let endTimer = null;

if (!sessionStorage.getItem('sid')) {
  sessionStorage.setItem('sid', Math.random().toString(36).slice(2));
}
const customSessionID = sessionStorage.getItem('sid');

window.onload = () => {
  document.addEventListener('keydown', startApp);
  document.addEventListener('click', startApp);

  document.getElementById('send-btn').onclick = sendMessage;
  document.getElementById('end-btn').onclick = goFeedback;
  document.getElementById('send-feedback').onclick = sendFeedback;

  document.querySelectorAll('.scale-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedRating = btn.dataset.value;
    };
  });
};

function startApp() {
  document.removeEventListener('keydown', startApp);
  document.removeEventListener('click', startApp);

  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('consent-modal').style.display = 'flex';
}

function acceptConsent() {
  document.getElementById('consent-modal').style.display = 'none';
  document.getElementById('chat-screen').classList.remove('hidden');
}

function appendMessage(text, sender) {
  const box = document.getElementById('chat-box');
  const wrap = document.createElement('div');
  wrap.className = `message ${sender}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerText = text;
  wrap.appendChild(bubble);
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('user-input');
  if (!input.value) return;

  appendMessage(input.value, 'user');
  const msg = input.value;
  input.value = '';

  const res = await fetch('/chat', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ message: msg, customSessionID })
  });

  const data = await res.json();
  appendMessage(data.response, 'bot');
  lastAiResponse = data.response;

  resetEndTimer();
}

function resetEndTimer() {
  clearTimeout(endTimer);
  endTimer = setTimeout(goFeedback, 30000);
}

function goFeedback() {
  document.getElementById('feedback-section').scrollIntoView({ behavior: 'smooth' });
}

async function sendFeedback() {
  const gender = document.getElementById('gender-select').value;
  if (!selectedRating || !gender) {
    alert('評価と性別は必須です');
    return;
  }

  await fetch('/feedback', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      rating: selectedRating,
      gender,
      aiResponse: lastAiResponse,
      comment: document.getElementById('feedback-comment').value,
      customSessionID
    })
  });

  appendMessage('フィードバックありがとう！設定を表示します…', 'bot');
}
