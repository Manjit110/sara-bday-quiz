const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const screenEl = document.getElementById("screen");

let player = JSON.parse(localStorage.getItem("sara_quiz_player") || "null");
let gameState = null;
let players = [];
let countdownTimer = null;

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])
  );
}

async function refreshGameState() {
  const { data } = await supabase.from("game_state").select("*").eq("id", 1).single();
  gameState = data;
}

async function refreshPlayers() {
  const { data } = await supabase
    .from("players")
    .select("*")
    .order("joined_at", { ascending: true });
  players = data || [];
}

function subscribeRealtime() {
  supabase
    .channel("public:game_state:player")
    .on("postgres_changes", { event: "*", schema: "public", table: "game_state" }, (payload) => {
      gameState = payload.new;
      render();
    })
    .subscribe();

  supabase
    .channel("public:players:player")
    .on("postgres_changes", { event: "*", schema: "public", table: "players" }, async () => {
      await refreshPlayers();
      render();
    })
    .subscribe();
}

function renderJoin() {
  screenEl.innerHTML = `
    <h1>&#127874; Who Knows Sara?</h1>
    <p class="subtitle">Enter your name to join the birthday quiz!</p>
    <input id="nameInput" type="text" placeholder="Your name" maxlength="24" autocomplete="off" />
    <div><button class="btn-primary" id="joinBtn">Join the Party &#127800;</button></div>
  `;
  const input = document.getElementById("nameInput");
  const btn = document.getElementById("joinBtn");

  const doJoin = async () => {
    const name = input.value.trim();
    if (!name) {
      input.focus();
      return;
    }
    btn.disabled = true;
    const { data, error } = await supabase.from("players").insert({ name }).select().single();
    if (error) {
      alert("Could not join: " + error.message);
      btn.disabled = false;
      return;
    }
    player = { id: data.id, name: data.name };
    localStorage.setItem("sara_quiz_player", JSON.stringify(player));
    await refreshPlayers();
    render();
  };

  btn.addEventListener("click", doJoin);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doJoin();
  });
  input.focus();
}

function renderWaiting() {
  const chips = players
    .map((p) => `<span class="chip ${p.id === player.id ? "you" : ""}">${escapeHtml(p.name)}</span>`)
    .join("");
  screenEl.innerHTML = `
    <h1>&#127804; You're in!</h1>
    <p class="subtitle">Waiting for everyone to join...</p>
    <div class="spinner"></div>
    <div class="player-list">${chips}</div>
    <p class="status-msg">${players.length} friend${players.length === 1 ? "" : "s"} joined so far</p>
  `;
}

async function renderActive() {
  const qIndex = gameState.current_question;
  const q = QUESTIONS[qIndex];
  if (!q) {
    screenEl.innerHTML = "Loading next question...";
    return;
  }

  const { data: existing } = await supabase
    .from("answers")
    .select("selected_option")
    .eq("player_id", player.id)
    .eq("question_index", qIndex)
    .maybeSingle();

  const total = QUESTIONS.length;
  const startedAt = new Date(gameState.question_started_at).getTime();
  const colClass = q.options.length <= 2 ? "two-col-single" : "";
  const circumference = 226;

  screenEl.innerHTML = `
    <div class="progress">Question ${qIndex + 1} / ${total}</div>
    <div class="timer-ring">
      <svg width="84" height="84">
        <circle class="bg" cx="42" cy="42" r="36"></circle>
        <circle class="fg" id="ringFg" cx="42" cy="42" r="36" stroke-dasharray="${circumference}" stroke-dashoffset="0"></circle>
      </svg>
      <div class="timer-num" id="timerNum">15</div>
    </div>
    <div class="question-text">${escapeHtml(q.question)}</div>
    <div class="options ${colClass}" id="optionsWrap">
      ${q.options
        .map((opt) => `<button class="opt-btn" data-opt="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`)
        .join("")}
    </div>
    <div class="status-msg" id="statusMsg"></div>
  `;

  const ring = document.getElementById("ringFg");
  const timerNum = document.getElementById("timerNum");
  const statusMsg = document.getElementById("statusMsg");

  function paintTimer(remainingMs) {
    const remainingSec = Math.max(0, remainingMs / 1000);
    timerNum.textContent = Math.ceil(remainingSec);
    const frac = Math.max(0, Math.min(1, remainingSec / QUESTION_SECONDS));
    ring.setAttribute("stroke-dashoffset", String(circumference * (1 - frac)));
  }

  function lockOptions(selected) {
    document.querySelectorAll(".opt-btn").forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset.opt === selected) btn.classList.add("selected");
    });
  }

  if (existing) {
    lockOptions(existing.selected_option);
    statusMsg.textContent = "Answer locked in! Waiting for the next question...";
  } else {
    document.querySelectorAll(".opt-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        submitAnswer(qIndex, btn.dataset.opt, q.correctAnswer, startedAt)
      );
    });
  }

  if (countdownTimer) clearInterval(countdownTimer);
  const tick = () => {
    const remainingMs = startedAt + QUESTION_SECONDS * 1000 - Date.now();
    paintTimer(remainingMs);
    if (remainingMs <= 0) {
      clearInterval(countdownTimer);
      if (!existing) {
        document.querySelectorAll(".opt-btn").forEach((btn) => (btn.disabled = true));
        statusMsg.textContent = "Time's up! Waiting for the next question...";
      }
    }
  };
  tick();
  countdownTimer = setInterval(tick, 200);
}

async function submitAnswer(qIndex, selected, correctAnswer, startedAt) {
  document.querySelectorAll(".opt-btn").forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.opt === selected) btn.classList.add("selected");
  });
  const statusMsg = document.getElementById("statusMsg");
  if (statusMsg) statusMsg.textContent = "Answer locked in! Waiting for the next question...";

  const answerTimeMs = Math.max(0, Math.min(QUESTION_SECONDS * 1000, Date.now() - startedAt));
  const { error } = await supabase.from("answers").insert({
    player_id: player.id,
    question_index: qIndex,
    selected_option: selected,
    is_correct: selected === correctAnswer,
    answer_time_ms: answerTimeMs,
  });
  if (error) console.error("submitAnswer error:", error);
}

function spawnConfetti() {
  const emojis = ["🌸", "🌼", "🌷", "🎉", "✨", "👑"];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement("div");
    el.className = "confetti";
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = Math.random() * 100 + "vw";
    el.style.animationDuration = 3 + Math.random() * 3 + "s";
    el.style.animationDelay = Math.random() * 2 + "s";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 8000);
  }
}

let confettiSpawned = false;
async function renderFinished() {
  const { data } = await supabase.from("players").select("*").order("score", { ascending: false });
  const ranked = data || [];
  const winner = ranked[0];

  if (!confettiSpawned) {
    spawnConfetti();
    confettiSpawned = true;
  }

  const medal = (i) => (i === 0 ? " 👑" : i === 1 ? " 🥈" : i === 2 ? " 🥉" : "");
  const rows = ranked
    .map(
      (p, i) => `
      <li>
        <span class="pos">${i + 1}${medal(i)}</span>
        <span class="name">${escapeHtml(p.name)}${p.id === player.id ? " (you)" : ""}</span>
        <span class="score">${p.score} pts</span>
      </li>`
    )
    .join("");

  screenEl.innerHTML = `
    <span class="winner-crown">👑</span>
    <h1>${winner ? escapeHtml(winner.name) : "Nobody"} wins!</h1>
    <p class="winner-score">${winner ? winner.score : 0} points — Sara's #1 fan 🌸</p>
    <ul class="rank-list">${rows}</ul>
  `;
}

function render() {
  if (!player) {
    renderJoin();
    return;
  }
  if (!gameState) {
    screenEl.innerHTML = "Loading...";
    return;
  }
  if (gameState.status === "waiting") renderWaiting();
  else if (gameState.status === "active") renderActive();
  else if (gameState.status === "finished") renderFinished();
}

async function init() {
  await refreshGameState();
  await refreshPlayers();
  if (player && !players.some((p) => p.id === player.id)) {
    player = null;
    localStorage.removeItem("sara_quiz_player");
  }
  subscribeRealtime();
  render();
}

init();
