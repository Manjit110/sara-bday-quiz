import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { QUESTIONS, QUESTION_SECONDS } from "../questions";
import { isSupabaseConfigured } from "../config";
import SetupNeeded from "../SetupNeeded";
import ErrorCard from "../ErrorCard";

function loadStoredPlayer() {
  try {
    return JSON.parse(localStorage.getItem("sara_quiz_player") || "null");
  } catch {
    return null;
  }
}

export default function PlayerPage() {
  const [player, setPlayer] = useState(loadStoredPlayer);
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const [{ data: gs, error: gsError }, { data: pls, error: plsError }] = await Promise.all([
          supabase.from("game_state").select("*").eq("id", 1).single(),
          supabase.from("players").select("*").order("joined_at", { ascending: true }),
        ]);
        if (cancelled) return;
        if (gsError) throw gsError;
        if (plsError) throw plsError;

        const stored = loadStoredPlayer();
        if (stored && !(pls || []).some((p) => p.id === stored.id)) {
          localStorage.removeItem("sara_quiz_player");
          setPlayer(null);
        }

        setGameState(gs);
        setPlayers(pls || []);
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();

    const gsChannel = supabase
      .channel("public:game_state:player")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_state" }, (payload) => {
        setGameState(payload.new);
      })
      .subscribe();

    const playersChannel = supabase
      .channel("public:players:player")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, async () => {
        const { data } = await supabase
          .from("players")
          .select("*")
          .order("joined_at", { ascending: true });
        setPlayers(data || []);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(gsChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [retryTick]);

  async function handleJoin(name) {
    const { data, error } = await supabase.from("players").insert({ name }).select().single();
    if (error) {
      alert("Could not join: " + error.message);
      return;
    }
    const p = { id: data.id, name: data.name };
    localStorage.setItem("sara_quiz_player", JSON.stringify(p));
    setPlayer(p);
    const { data: pls } = await supabase
      .from("players")
      .select("*")
      .order("joined_at", { ascending: true });
    setPlayers(pls || []);
  }

  if (!isSupabaseConfigured) {
    return <SetupNeeded />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={() => setRetryTick((t) => t + 1)} />;
  }

  if (loading) {
    return (
      <div className="app">
        <div className="card">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="card">
        {!player && <JoinScreen onJoin={handleJoin} />}
        {player && gameState && gameState.status === "waiting" && (
          <WaitingRoom players={players} player={player} />
        )}
        {player && gameState && gameState.status === "active" && (
          <QuestionScreen key={gameState.current_question} gameState={gameState} player={player} />
        )}
        {player && gameState && gameState.status === "finished" && <Leaderboard player={player} />}
      </div>
    </div>
  );
}

function JoinScreen({ onJoin }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    await onJoin(trimmed);
    setBusy(false);
  };

  return (
    <>
      <h1>&#127874; Who Knows Sara?</h1>
      <p className="subtitle">Enter your name to join the birthday quiz!</p>
      <input
        type="text"
        placeholder="Your name"
        maxLength={24}
        autoComplete="off"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        autoFocus
      />
      <div>
        <button className="btn-primary" disabled={busy} onClick={submit}>
          Join the Party &#127800;
        </button>
      </div>
    </>
  );
}

function WaitingRoom({ players, player }) {
  return (
    <>
      <h1>&#127804; You're in!</h1>
      <p className="subtitle">Waiting for everyone to join...</p>
      <div className="spinner" />
      <div className="player-list">
        {players.map((p) => (
          <span key={p.id} className={`chip ${p.id === player.id ? "you" : ""}`}>
            {p.name}
          </span>
        ))}
      </div>
      <p className="status-msg">
        {players.length} friend{players.length === 1 ? "" : "s"} joined so far
      </p>
    </>
  );
}

function QuestionScreen({ gameState, player }) {
  const qIndex = gameState.current_question;
  const q = QUESTIONS[qIndex];
  const startedAt = new Date(gameState.question_started_at).getTime();

  const [existing, setExisting] = useState(undefined); // undefined = loading, null = not answered yet
  const [selected, setSelected] = useState(null);
  const [remainingMs, setRemainingMs] = useState(startedAt + QUESTION_SECONDS * 1000 - Date.now());

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("answers")
      .select("selected_option")
      .eq("player_id", player.id)
      .eq("question_index", qIndex)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setExisting(data ? data.selected_option : null);
      });
    return () => {
      cancelled = true;
    };
  }, [qIndex, player.id]);

  useEffect(() => {
    const tick = () => setRemainingMs(startedAt + QUESTION_SECONDS * 1000 - Date.now());
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!q || existing === undefined) {
    return <div className="status-msg">Loading question...</div>;
  }

  const answered = existing !== null || selected !== null;
  const lockedOption = existing || selected;
  const remainingSec = Math.max(0, remainingMs / 1000);
  const timeUp = remainingMs <= 0;
  const circumference = 226;
  const frac = Math.max(0, Math.min(1, remainingSec / QUESTION_SECONDS));

  async function pick(opt) {
    if (answered || timeUp) return;
    setSelected(opt);
    const answerTimeMs = Math.max(0, Math.min(QUESTION_SECONDS * 1000, Date.now() - startedAt));
    const { error } = await supabase.from("answers").insert({
      player_id: player.id,
      question_index: qIndex,
      selected_option: opt,
      is_correct: opt === q.correctAnswer,
      answer_time_ms: answerTimeMs,
    });
    if (error) console.error("submitAnswer error:", error);
  }

  return (
    <>
      <div className="progress">
        Question {qIndex + 1} / {QUESTIONS.length}
      </div>
      <div className="timer-ring">
        <svg width="84" height="84">
          <circle className="bg" cx="42" cy="42" r="36" />
          <circle
            className="fg"
            cx="42"
            cy="42"
            r="36"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - frac)}
          />
        </svg>
        <div className="timer-num">{Math.ceil(remainingSec)}</div>
      </div>
      <div className="question-text">{q.question}</div>
      <div className={`options ${q.options.length <= 2 ? "two-col-single" : ""}`}>
        {q.options.map((opt) => (
          <button
            key={opt}
            className={`opt-btn ${lockedOption === opt ? "selected" : ""}`}
            disabled={answered || timeUp}
            onClick={() => pick(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="status-msg">
        {answered
          ? "Answer locked in! Waiting for the next question..."
          : timeUp
          ? "Time's up! Waiting for the next question..."
          : ""}
      </div>
    </>
  );
}

function Leaderboard({ player }) {
  const [ranked, setRanked] = useState(null);
  const confettiSpawned = useRef(false);

  useEffect(() => {
    supabase
      .from("players")
      .select("*")
      .order("score", { ascending: false })
      .then(({ data }) => setRanked(data || []));
  }, []);

  useEffect(() => {
    if (ranked && !confettiSpawned.current) {
      confettiSpawned.current = true;
      spawnConfetti();
    }
  }, [ranked]);

  if (!ranked) return <div className="status-msg">Tallying scores...</div>;

  const winner = ranked[0];
  const medal = (i) => (i === 0 ? " \u{1F451}" : i === 1 ? " \u{1F948}" : i === 2 ? " \u{1F949}" : "");

  return (
    <>
      <span className="winner-crown">&#128081;</span>
      <h1>{winner ? winner.name : "Nobody"} wins!</h1>
      <p className="winner-score">{winner ? winner.score : 0} points — Sara's #1 fan &#127800;</p>
      <ul className="rank-list">
        {ranked.map((p, i) => (
          <li key={p.id}>
            <span className="pos">
              {i + 1}
              {medal(i)}
            </span>
            <span className="name">
              {p.name}
              {p.id === player.id ? " (you)" : ""}
            </span>
            <span className="score">{p.score} pts</span>
          </li>
        ))}
      </ul>
    </>
  );
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
