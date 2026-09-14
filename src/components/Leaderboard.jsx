import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

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

const medal = (i) => (i === 0 ? " \u{1F451}" : i === 1 ? " \u{1F948}" : i === 2 ? " \u{1F949}" : "");

// Shared scoreboard: used by the player app's final screen (with crown +
// confetti) and by the admin dashboard (live, no confetti) so the host can
// always see standings while running the quiz.
export default function Leaderboard({ highlightPlayerId, showWinner = true, confetti = false }) {
  const [ranked, setRanked] = useState(null);
  const confettiSpawned = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const { data } = await supabase.from("players").select("*").order("score", { ascending: false });
      if (!cancelled) setRanked(data || []);
    }
    refresh();

    const channel = supabase
      .channel("public:players:leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, refresh)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (confetti && ranked && !confettiSpawned.current) {
      confettiSpawned.current = true;
      spawnConfetti();
    }
  }, [confetti, ranked]);

  if (!ranked) return <div className="status-msg">Tallying scores...</div>;

  const winner = ranked[0];

  return (
    <>
      {showWinner && (
        <>
          <span className="winner-crown">&#128081;</span>
          <h1>{winner ? winner.name : "Nobody"} wins!</h1>
          <p className="winner-score">{winner ? winner.score : 0} points — Sara's #1 fan &#127800;</p>
        </>
      )}
      <ul className="rank-list">
        {ranked.map((p, i) => (
          <li key={p.id}>
            <span className="pos">
              {i + 1}
              {medal(i)}
            </span>
            <span className="name">
              {p.name}
              {p.id === highlightPlayerId ? " (you)" : ""}
            </span>
            <span className="score">{p.score} pts</span>
          </li>
        ))}
      </ul>
    </>
  );
}
