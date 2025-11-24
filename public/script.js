// タブごとに一意なセッションIDを生成
if (!sessionStorage.getItem('customSessionID')) {
  sessionStorage.setItem('customSessionID', Math.random().toString(36).substring(2));
}
const customSessionID = sessionStorage.getItem('customSessionID');



window.onload = function () {
  // タイトル画面にキー/タップイベントを追加
  document.addEventListener("keydown", startApp);
  document.addEventListener("click", startApp);
};

function startApp() {
  // イベントを解除（連打防止）
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
  document.getElementById("chat-screen").style.display = "block";
}


function addMessage(text, sender) {
  const chatBox = document.getElementById("chat-box");

  const msg = document.createElement("div");
  msg.classList.add("message", sender);

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.innerText = text;

  msg.appendChild(bubble);
  chatBox.appendChild(msg);

  // 自動スクロール
  chatBox.scrollTop = chatBox.scrollHeight;
}


document.getElementById("user-input").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
});



// ...existing code...

let lastAiResponse = '';

function sendMessage() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");

  input.value = "";

  fetchBotResponse(text);
}


// ...existing code...

// フィードバック送信
document.getElementById('send-feedback').onclick = async function() {
  const comment = document.getElementById('feedback-comment').value;
  const thumbsUp = document.getElementById('thumbs-up').classList.contains('selected');
  const thumbsDown = document.getElementById('thumbs-down').classList.contains('selected');
  let rating = null;
  if (thumbsUp) rating = 'up';
  if (thumbsDown) rating = 'down';

  if (!rating) {
    alert('👍か👎を選択してください');
    return;
  }

  await fetch('/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aiResponse: lastAiResponse,
      rating,
      comment
    })
  });

  document.getElementById('feedback-comment').value = '';
  document.getElementById('thumbs-up').classList.remove('selected');
  document.getElementById('thumbs-down').classList.remove('selected');
  alert('フィードバックを送信しました');
};

// 👍/👎ボタンの選択状態切替
document.getElementById('thumbs-up').onclick = function() {
  this.classList.add('selected');
  document.getElementById('thumbs-down').classList.remove('selected');
};
document.getElementById('thumbs-down').onclick = function() {
  this.classList.add('selected');
  document.getElementById('thumbs-up').classList.remove('selected');
};