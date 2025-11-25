// タブごとに一意なセッションIDを生成（sessionStorage）
if (!sessionStorage.getItem('customSessionID')) {
  sessionStorage.setItem('customSessionID', Math.random().toString(36).substring(2));
}
const customSessionID = sessionStorage.getItem('customSessionID');

let lastAiResponse = '';
let endTimer = null;

// DOM ready
window.onload = function () {
  document.addEventListener("keydown", startApp);
  document.addEventListener("click", startApp);

  // ボタンイベント
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('send-feedback').addEventListener('click', sendFeedback);

  document.getElementById('thumbs-up').addEventListener('click', () => toggleThumb('up'));
  document.getElementById('thumbs-down').addEventListener('click', () => toggleThumb('down'));
};

// スタート
function startApp(e) {
  // enter/tap のみ最初に受ける
  document.removeEventListener("keydown", startApp);
  document.removeEventListener("click", startApp);

  document.getElementById("start-screen").style.display = "none";

  const consentGiven = localStorage.getItem("consentGiven");
  if (!consentGiven) {
    document.getElementById("consent-modal").style.display = "flex";
  } else {
    showChatScreen();
  }
}

function acceptConsent() {
  localStorage.setItem("consentGiven", "true");
  document.getElementById("consent-modal").style.display = "none";
  showChatScreen();
}

function showChatScreen() {
  document.getElementById("chat-screen").classList.remove('hidden');
}

// メッセージを吹き出しで追加（sender: "user" or "bot"）
function appendMessage(text, sender = "bot") {
  const chatBox = document.getElementById("chat-box");

  const wrapper = document.createElement("div");
  wrapper.classList.add("message", sender);

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.innerText = text;

  wrapper.appendChild(bubble);
  chatBox.appendChild(wrapper);

  // 自動スクロール
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 送信（Enter or button）
document.getElementById("user-input")?.addEventListener("keydown", function (e) {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const inputEl = document.getElementById('user-input');
  const text = (inputEl.value || '').trim();
  if (!text) return;

  appendMessage(text, "user");
  inputEl.value = '';

  // AI に投げる
  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, customSessionID })
    });
    const data = await res.json();
    appendMessage(data.response, "bot");
    lastAiResponse = data.response;

    // 会話終了判定用タイマーをリセット（ここで再起動）
    resetEndTimer();
  } catch (err) {
    appendMessage('エラーが発生しました。', "bot");
    console.error(err);
  }
}

// 会話終了（無操作）判定用タイマー
function resetEndTimer() {
  if (endTimer) clearTimeout(endTimer);
  // 7秒の無操作で「会話終了」扱い → 自動でフィードバック欄へスクロール
  endTimer = setTimeout(() => {
    scrollToFeedback();
  }, 7000);
}

function scrollToFeedback() {
  const fb = document.getElementById("feedback-section");
  fb.scrollIntoView({ behavior: "smooth", block: "center" });
}

// thumbs toggle
function toggleThumb(side) {
  const up = document.getElementById('thumbs-up');
  const down = document.getElementById('thumbs-down');
  if (side === 'up') {
    up.classList.toggle('selected');
    down.classList.remove('selected');
  } else {
    down.classList.toggle('selected');
    up.classList.remove('selected');
  }
}

// フィードバック送信
async function sendFeedback() {
  const thumbsUp = document.getElementById('thumbs-up').classList.contains('selected');
  const thumbsDown = document.getElementById('thumbs-down').classList.contains('selected');
  let rating = null;
  if (thumbsUp) rating = 'up';
  if (thumbsDown) rating = 'down';

  if (!rating) {
    alert('👍か👎を選択してください');
    return;
  }

  const comment = document.getElementById('feedback-comment').value || '';

  try {
    const res = await fetch('/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aiResponse: lastAiResponse,
        rating,
        comment,
        customSessionID
      })
    });

    const result = await res.json();
    if (result.status === 'ok') {
      // 送信完了案内
      appendMessage('フィードバックありがとう！設定を表示します…', 'bot');

      // 送信後の「AIの本当の個性」表示
      setTimeout(showAiProfile, 600);
    } else {
      appendMessage('フィードバックの送信に失敗しました。', 'bot');
    }
  } catch (err) {
    console.error(err);
    appendMessage('ネットワークエラーで送信できませんでした。', 'bot');
  }

  // クリアUI
  document.getElementById('feedback-comment').value = '';
  document.getElementById('thumbs-up').classList.remove('selected');
  document.getElementById('thumbs-down').classList.remove('selected');
}

// サーバーからセッションの promptSettings を取得して表示
async function showAiProfile() {
  try {
    const res = await fetch('/session-settings?sessionID=' + encodeURIComponent(customSessionID));
    const settings = await res.json();

    if (settings.error) {
      appendMessage('設定情報が見つかりませんでした。', 'bot');
      return;
    }

    // 見栄え良く表示
    const lines = [
      `この会話のAIの設定はこちら：`,
      `・方言: ${settings.dialect}`,
      `・共感度: ${settings.empathy}`,
      `・文法ノイズ: ${settings.grammarNoise}`,
      `・感情強度: ${settings.emotionIntensity}`,
      `・語尾: ${settings.wordEnding}`,
      `・相槌レベル: ${settings.interjections}`
    ];

    appendMessage(lines.join('\n'), 'bot');
  } catch (err) {
    console.error(err);
    appendMessage('設定情報の取得に失敗しました。', 'bot');
  }
}
