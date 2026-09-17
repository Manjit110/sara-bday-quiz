import { useEffect, useState } from "react";
import { REVEAL_SECONDS } from "../questions";

// Shown to everyone right after the last question ends, while `game_state`
// sits in the 'revealing' status the admin drives — builds suspense before
// the leaderboard (with the winner) shows up.
export default function RevealCountdown({ startedAt }) {
  const started = new Date(startedAt).getTime();
  const [remainingMs, setRemainingMs] = useState(started + REVEAL_SECONDS * 1000 - Date.now());

  useEffect(() => {
    const tick = () => setRemainingMs(started + REVEAL_SECONDS * 1000 - Date.now());
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [started]);

  const remainingSec = Math.max(0, remainingMs / 1000);
  const circumference = 226;
  const frac = Math.max(0, Math.min(1, remainingSec / REVEAL_SECONDS));

  return (
    <>
      <h1>&#129345; And the winner is...</h1>
      <p className="subtitle">Drumroll please!</p>
      <div className="timer-ring">
        <svg width="100%" height="100%" viewBox="0 0 84 84">
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
      <p className="status-msg">Revealing everyone's final score...</p>
    </>
  );
}
