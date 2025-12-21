if (!sessionStorage.getItem('customSessionID')) {
  sessionStorage.setItem('customSessionID', Math.random().toString(36).slice(2));
}
const customSessionID = sessionStorage.getItem('customSessionID');

let selectedScore = null;
let conversationEnded = false;

// ===== 起動 =====
window.onload = () => {
  document.addEventListener("keydown", startApp);
  document.addEventListener("click", startApp);

  document.getElementById("send-btn").onclick = sendMessage;
  document.getElementById("end-btn").onclick = endConversation;
  document.getElementById("send-feedback").onclick = sendFeedback;

  document.querySelectorAll(".scale-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".scale-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedScore = btn.dataset.value;
    };
  });
};

// ===== スタート =====
function startApp() {
  document.removeEventListener("keydown", startApp);
  document.removeEventListener("click", startApp);
  document.getElementById("start-screen").style.display = "none";

  if (!localStorage.getItem("consentGiven")) {
    document.getElementById("consent-modal").style.display = "flex";
  } else {
    document.getElementById("chat-screen").classList.remove("hidden");
    appendMessage("こんにちは！自由に話しかけてください。", "bot");
  }
}

function acceptConsent() {
  localStorage.setItem("consentGiven", "true");
  document.getElementById("consent-modal").style.display = "none";
  document.getElementById("chat-screen").classList.remove("hidden");
  appendMessage("こんにちは！自由に話しかけてください。", "bot");
}

// ===== メッセージ =====
function appendMessage(text, sender) {
  const box = document.getElementById("chat-box");
  const wrap = document.createElement("div");
  wrap.className = `message ${sender}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerText = text;
  wrap.appendChild(bubble);
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

// ===== 会話 =====
async function sendMessage() {
  if (conversationEnded) return;

  const input = document.getElementById("user-input");
  const text = input.value.trim();
  if (!text) return;

  appendMessage(text, "user");
  input.value = "";

  const res = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text, customSessionID })
  });

  const data = await res.json();
  appendMessage(data.response, "bot");
}

// ===== 終了 =====
function endConversation() {
  conversationEnded = true;
  document.getElementById("user-input").disabled = true;
  document.getElementById("send-btn").disabled = true;

  document.getElementById("feedback-section").scrollIntoView({ behavior: "smooth" });
}

// ===== フィードバック =====
async function sendFeedback() {
  if (!selectedScore) return alert("評価を選択してください");
  const gender = document.getElementById("gender-select").value;
  if (!gender) return alert("性別を選択してください");

  const btn = document.getElementById("send-feedback");
  btn.innerText = "送信中…";
  btn.disabled = true;

  await fetch("/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionID: customSessionID,
      score: selectedScore,
      gender,
      comment: document.getElementById("feedback-comment").value
    })
  });

  btn.innerText = "送信済み ✓";

  document.getElementById("chat-box").scrollTop = 0;

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.style.visibility = "visible";

    // 3秒後に消去
    setTimeout(() => {
     toast.style.visibility = "hidden";
    }, 3000);
  }

  // 実行例
  showToast("ご協力ありがとうございました！！これで調査は終わりとなります");

  setTimeout(() => {
    appendMessage("✨ ご協力ありがとうございました！ ✨", "bot");
    showSettings();
  }, 3000);
}

async function showSettings() {
  const res = await fetch(`/session-settings?sessionID=${customSessionID}`);
  const s = await res.json();
  appendMessage(
    `あなたが話したAIの設定は\n方言:${s.dialect}\n文法ミス:${s.grammarNoise}\n語尾:${s.wordEnding}\n感動詞:${s.interjections}\nでした～`,
    "bot"
  );
}