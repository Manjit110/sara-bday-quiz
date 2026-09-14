import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { QUESTIONS, QUESTION_SECONDS } from "../questions";
import { ADMIN_PIN, isSupabaseConfigured } from "../config";
import SetupNeeded from "../SetupNeeded";
import ErrorCard from "../ErrorCard";
import Leaderboard from "../components/Leaderboard";

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("sara_admin_ok") === "1");
  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [driving, setDriving] = useState(false);
  const [error, setError] = useState(null);
  const [retryTick, setRetryTick] = useState(0);
  const [showScoreboard, setShowScoreboard] = useState(false);

  const gameStateRef = useRef(null);
  const advanceTimer = useRef(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  async function refreshAnsweredCount(gs) {
    if (!gs || gs.status !== "active") {
      setAnsweredCount(0);
      return;
    }
    const { count } = await supabase
      .from("answers")
      .select("id", { count: "exact", head: true })
      .eq("question_index", gs.current_question);
    setAnsweredCount(count || 0);
  }

  useEffect(() => {
    if (!unlocked || !isSupabaseConfigured) return;
    let cancelled = false;

    async function bootstrap() {
      setError(null);
      try {
        const [{ data: gs, error: gsError }, { data: pls, error: plsError }] = await Promise.all([
          supabase.from("game_state").select("*").eq("id", 1).single(),
          supabase.from("players").select("*").order("joined_at", { ascending: true }),
        ]);
        if (cancelled) return;
        if (gsError) throw gsError;
        if (plsError) throw plsError;
        setGameState(gs);
        setPlayers(pls || []);
        await refreshAnsweredCount(gs);
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      }
    }
    bootstrap();

    const gsChannel = supabase
      .channel("public:game_state:admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_state" }, async (payload) => {
        setGameState(payload.new);
        await refreshAnsweredCount(payload.new);
      })
      .subscribe();

    const playersChannel = supabase
      .channel("public:players:admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, async () => {
        const { data } = await supabase
          .from("players")
          .select("*")
          .order("joined_at", { ascending: true });
        setPlayers(data || []);
      })
      .subscribe();

    const answersChannel = supabase
      .channel("public:answers:admin")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "answers" }, () => {
        refreshAnsweredCount(gameStateRef.current);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(gsChannel);
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(answersChannel);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [unlocked, retryTick]);

  async function advanceOrFinish(fromIndex) {
    const nextIndex = fromIndex + 1;
    if (nextIndex >= QUESTIONS.length) {
      await supabase.from("game_state").update({ status: "finished" }).eq("id", 1);
      setDriving(false);
      return;
    }
    await supabase
      .from("game_state")
      .update({ current_question: nextIndex, question_started_at: new Date().toISOString() })
      .eq("id", 1);
    scheduleNext(nextIndex);
  }

  function scheduleNext(fromIndex) {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => advanceOrFinish(fromIndex), QUESTION_SECONDS * 1000);
  }

  async function startQuiz() {
    await supabase
      .from("game_state")
      .update({ status: "active", current_question: 0, question_started_at: new Date().toISOString() })
      .eq("id", 1);
    setDriving(true);
    scheduleNext(0);
  }

  function resumeDriving() {
    setDriving(true);
    const elapsed = Date.now() - new Date(gameState.question_started_at).getTime();
    const remaining = Math.max(0, QUESTION_SECONDS * 1000 - elapsed);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => advanceOrFinish(gameState.current_question), remaining);
  }

  async function resetGame() {
    if (!confirm("Reset the whole game? This deletes all players and answers.")) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setDriving(false);
    const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
    await supabase.from("answers").delete().neq("player_id", ZERO_UUID);
    await supabase.from("players").delete().neq("id", ZERO_UUID);
    await supabase
      .from("game_state")
      .update({ status: "waiting", current_question: -1, question_started_at: null })
      .eq("id", 1);
  }

  if (!isSupabaseConfigured) {
    return <SetupNeeded />;
  }

  if (!unlocked) {
    return (
      <div className="app">
        <div className="card">
          <PinScreen
            onUnlock={() => {
              sessionStorage.setItem("sara_admin_ok", "1");
              setUnlocked(true);
            }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorCard message={error} onRetry={() => setRetryTick((t) => t + 1)} />;
  }

  if (!gameState) {
    return (
      <div className="app">
        <div className="card">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="card">
        <span className="admin-badge">ADMIN</span>
        <h1>Sara's Quiz Control</h1>

        {gameState.status !== "finished" && players.length > 0 && (
          <button
            className="btn-danger"
            style={{ marginBottom: 14 }}
            onClick={() => setShowScoreboard((s) => !s)}
          >
            {showScoreboard ? "Back to controls" : "View scoreboard"}
          </button>
        )}

        {gameState.status !== "finished" && showScoreboard && (
          <Leaderboard showWinner={false} confetti={false} />
        )}

        {gameState.status === "waiting" && !showScoreboard && (
          <>
            <div className="admin-grid">
              <div className="stat">
                <div className="num">{players.length}</div>
                <div className="label">Joined</div>
              </div>
              <div className="stat">
                <div className="num">{QUESTIONS.length}</div>
                <div className="label">Questions</div>
              </div>
            </div>
            <div className="player-list">
              {players.length ? (
                players.map((p) => (
                  <span key={p.id} className="chip">
                    {p.name}
                  </span>
                ))
              ) : (
                <em>No one yet...</em>
              )}
            </div>
            <button className="btn-primary" disabled={players.length === 0} onClick={startQuiz}>
              Start Quiz &#127881;
            </button>
          </>
        )}

        {gameState.status === "active" && !showScoreboard && (
          <>
            <div className="admin-grid">
              <div className="stat">
                <div className="num">
                  {gameState.current_question + 1} / {QUESTIONS.length}
                </div>
                <div className="label">Question</div>
              </div>
              <div className="stat">
                <div className="num">
                  {answeredCount} / {players.length}
                </div>
                <div className="label">Answered</div>
              </div>
            </div>
            <div className="question-text">{QUESTIONS[gameState.current_question]?.question}</div>
            <p className="status-msg">
              {driving
                ? "Auto-advancing every 15s..."
                : "This tab isn't driving the countdown. Click below to take over (e.g. after a refresh)."}
            </p>
            {!driving && (
              <button className="btn-primary" onClick={resumeDriving}>
                Resume driving from here
              </button>
            )}
          </>
        )}

        {gameState.status === "finished" && <Leaderboard showWinner confetti={false} />}

        <div style={{ marginTop: 20 }}>
          <button className="btn-danger" onClick={resetGame}>
            Reset Game
          </button>
        </div>
      </div>
    </div>
  );
}

function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState("");

  const tryUnlock = () => {
    if (pin === ADMIN_PIN) onUnlock();
    else alert("Wrong PIN");
  };

  return (
    <>
      <span className="admin-badge">ADMIN</span>
      <h1>Host Login</h1>
      <p className="subtitle">Enter the admin PIN to control the quiz.</p>
      <input
        type="password"
        placeholder="PIN"
        autoComplete="off"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
        autoFocus
      />
      <div>
        <button className="btn-primary" onClick={tryUnlock}>
          Unlock
        </button>
      </div>
    </>
  );
}
