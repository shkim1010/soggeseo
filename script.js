const lockscreen = document.getElementById("lockscreen");
const chatScreen = document.getElementById("chatScreen");
const slideText = document.getElementById("slideText");
const messages = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

let chatActive = false;

// 실시간 시계
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  document.getElementById("clock").textContent = `${h}:${m}`;
}
setInterval(updateClock, 1000);
updateClock();

// 슬라이드 텍스트 클릭 시 대화창 열기
slideText.addEventListener("click", () => {
  if (!chatActive) {
    chatActive = true;
    chatScreen.classList.add("active");
    slideText.setAttribute("aria-pressed", "true");
  }
});

// 메시지 추가 함수
function appendMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.textContent = text;
  messages.appendChild(msg);
  messages.scrollTop = messages.scrollHeight;
}

// 향수 태그 추가 함수
function displayScentTags(text) {
  // 기존 태그 제거
  const existingTags = document.querySelector(".scent-tags");
  if (existingTags) existingTags.remove();

  // 탑, 미들, 베이스 노트 추출 정규식
  const topMatch = text.match(/탑(?: 노트)?:?\s*([가-힣]+)/);
  const middleMatch = text.match(/미들(?: 노트)?:?\s*([가-힣]+)/);
  const baseMatch = text.match(/베이스(?: 노트)?:?\s*([가-힣]+)/);

  const container = document.createElement("div");
  container.className = "scent-tags";

  if (topMatch) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = `탑 노트: ${topMatch[1]}`;
    container.appendChild(tag);
  }
  if (middleMatch) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = `미들 노트: ${middleMatch[1]}`;
    container.appendChild(tag);
  }
  if (baseMatch) {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = `베이스 노트: ${baseMatch[1]}`;
    container.appendChild(tag);
  }

  messages.appendChild(container);
  messages.scrollTop = messages.scrollHeight;
}

// 메시지 전송 함수 (API 호출 포함)
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage("user", text);
  userInput.value = "";

  appendMessage("ai", "추천을 준비하는 중입니다... 잠시만 기다려 주세요.");

  try {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ song: text }),
    });

    const data = await response.json();

    if (data.reply) {
      // 마지막 AI 메시지 덮어쓰기
      const lastAiMsg = document.querySelector(".message.ai:last-child");
      if (lastAiMsg) lastAiMsg.textContent = data.reply;
      else appendMessage("ai", data.reply);

      displayScentTags(data.reply);
    } else {
      appendMessage("ai", "추천을 받는데 실패했어요. 다시 시도해주세요.");
    }
  } catch (err) {
    appendMessage("ai", "서버 오류가 발생했어요.");
  }
}

// 엔터키 입력 시 전송
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

// 버튼 클릭 시 전송
sendBtn.addEventListener("click", sendMessage);
