const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const screenEl = document.getElementById("screen");

let unlocked = sessionStorage.getItem("sara_admin_ok") === "1";
let gameState = null;
let players = [];
let answeredCount = 0;
let advanceTimer = null;
let driving = false;

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

async function refreshAnsweredCount() {
  if (!gameState || gameState.status !== "active") {
    answeredCount = 0;
    return;
  }
  const { count } = await supabase
    .from("answers")
    .select("id", { count: "exact", head: true })
    .eq("question_index", gameState.current_question);
  answeredCount = count || 0;
}

function subscribeRealtime() {
  supabase
    .channel("public:game_state:admin")
    .on("postgres_changes", { event: "*", schema: "public", table: "game_state" }, async (payload) => {
      gameState = payload.new;
      await refreshAnsweredCount();
      render();
    })
    .subscribe();

  supabase
    .channel("public:players:admin")
    .on("postgres_changes", { event: "*", schema: "public", table: "players" }, async () => {
      await refreshPlayers();
      render();
    })
    .subscribe();

  supabase
    .channel("public:answers:admin")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "answers" }, async () => {
      await refreshAnsweredCount();
      render();
    })
    .subscribe();
}

function renderPin() {
  screenEl.innerHTML = `
    <span class="admin-badge">ADMIN</span>
    <h1>Host Login</h1>
    <p class="subtitle">Enter the admin PIN to control the quiz.</p>
    <input id="pinInput" type="password" placeholder="PIN" autocomplete="off" />
    <div><button class="btn-primary" id="pinBtn">Unlock</button></div>
  `;
  const input = document.getElementById("pinInput");
  const btn = document.getElementById("pinBtn");
  const tryUnlock = () => {
    if (input.value === ADMIN_PIN) {
      unlocked = true;
      sessionStorage.setItem("sara_admin_ok", "1");
      render();
    } else {
      alert("Wrong PIN");
    }
  };
  btn.addEventListener("click", tryUnlock);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryUnlock();
  });
  input.focus();
}

function renderDashboard() {
  const total = QUESTIONS.length;
  let body = "";

  if (gameState.status === "waiting") {
    body = `
      <div class="admin-grid">
        <div class="stat"><div class="num">${players.length}</div><div class="label">Joined</div></div>
        <div class="stat"><div class="num">${total}</div><div class="label">Questions</div></div>
      </div>
      <div class="player-list">${
        players.map((p) => `<span class="chip">${escapeHtml(p.name)}</span>`).join("") ||
        "<em>No one yet...</em>"
      }</div>
      <button class="btn-primary" id="startBtn" ${players.length === 0 ? "disabled" : ""}>Start Quiz &#127881;</button>
    `;
  } else if (gameState.status === "active") {
    const q = QUESTIONS[gameState.current_question];
    body = `
      <div class="admin-grid">
        <div class="stat"><div class="num">${gameState.current_question + 1} / ${total}</div><div class="label">Question</div></div>
        <div class="stat"><div class="num">${answeredCount} / ${players.length}</div><div class="label">Answered</div></div>
      </div>
      <div class="question-text">${escapeHtml(q ? q.question : "")}</div>
      <p class="status-msg">${
        driving
          ? "Auto-advancing every 15s..."
          : "This tab isn't driving the countdown. Click below to take over (e.g. after a refresh)."
      }</p>
      ${!driving ? '<button class="btn-primary" id="resumeBtn">Resume driving from here</button>' : ""}
    `;
  } else if (gameState.status === "finished") {
    body = `<p class="status-msg">Quiz finished! Everyone should be looking at the leaderboard now. &#127942;</p>`;
  }

  screenEl.innerHTML = `
    <span class="admin-badge">ADMIN</span>
    <h1>Sara's Quiz Control</h1>
    ${body}
    <div style="margin-top:20px;"><button class="btn-danger" id="resetBtn">Reset Game</button></div>
  `;

  const startBtn = document.getElementById("startBtn");
  if (startBtn) startBtn.addEventListener("click", startQuiz);
  const resumeBtn = document.getElementById("resumeBtn");
  if (resumeBtn) resumeBtn.addEventListener("click", resumeDriving);
  document.getElementById("resetBtn").addEventListener("click", resetGame);
}

function render() {
  if (!unlocked) {
    renderPin();
    return;
  }
  if (!gameState) {
    screenEl.innerHTML = "Loading...";
    return;
  }
  renderDashboard();
}

async function advanceOrFinish(fromIndex) {
  const nextIndex = fromIndex + 1;
  if (nextIndex >= QUESTIONS.length) {
    await supabase.from("game_state").update({ status: "finished" }).eq("id", 1);
    driving = false;
    return;
  }
  await supabase
    .from("game_state")
    .update({ current_question: nextIndex, question_started_at: new Date().toISOString() })
    .eq("id", 1);
  scheduleNext(nextIndex);
}

function scheduleNext(fromIndex) {
  if (advanceTimer) clearTimeout(advanceTimer);
  advanceTimer = setTimeout(() => advanceOrFinish(fromIndex), QUESTION_SECONDS * 1000);
}

async function startQuiz() {
  await supabase
    .from("game_state")
    .update({ status: "active", current_question: 0, question_started_at: new Date().toISOString() })
    .eq("id", 1);
  driving = true;
  scheduleNext(0);
}

function resumeDriving() {
  driving = true;
  const elapsed = Date.now() - new Date(gameState.question_started_at).getTime();
  const remaining = Math.max(0, QUESTION_SECONDS * 1000 - elapsed);
  if (advanceTimer) clearTimeout(advanceTimer);
  advanceTimer = setTimeout(() => advanceOrFinish(gameState.current_question), remaining);
  render();
}

async function resetGame() {
  if (!confirm("Reset the whole game? This deletes all players and answers.")) return;
  if (advanceTimer) clearTimeout(advanceTimer);
  driving = false;
  const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
  await supabase.from("answers").delete().neq("player_id", ZERO_UUID);
  await supabase.from("players").delete().neq("id", ZERO_UUID);
  await supabase
    .from("game_state")
    .update({ status: "waiting", current_question: -1, question_started_at: null })
    .eq("id", 1);
}

async function init() {
  await refreshGameState();
  await refreshPlayers();
  await refreshAnsweredCount();
  subscribeRealtime();
  render();
}

init();
