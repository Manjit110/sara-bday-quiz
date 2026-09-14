// Purely decorative, scattered across the whole viewport behind the card.
// Positions are fixed (not random) so the layout doesn't jump between renders.
const ITEMS = [
  { emoji: "🌸", top: "4%", left: "8%", size: 34, delay: 0 },
  { emoji: "🦋", top: "9%", left: "86%", size: 30, delay: 1.2 },
  { emoji: "🎈", top: "5%", left: "45%", size: 38, delay: 0.6 },
  { emoji: "🐝", top: "20%", left: "3%", size: 26, delay: 2 },
  { emoji: "🌻", top: "16%", left: "94%", size: 32, delay: 0.3 },
  { emoji: "🐰", top: "36%", left: "95%", size: 30, delay: 1.6 },
  { emoji: "🦔", top: "38%", left: "2%", size: 28, delay: 0.9 },
  { emoji: "🌼", top: "56%", left: "4%", size: 30, delay: 1.4 },
  { emoji: "🐦", top: "54%", left: "92%", size: 26, delay: 2.2 },
  { emoji: "🎈", top: "74%", left: "9%", size: 34, delay: 0.4 },
  { emoji: "🦄", top: "76%", left: "90%", size: 32, delay: 1.8 },
  { emoji: "🌷", top: "90%", left: "50%", size: 30, delay: 0.7 },
  { emoji: "🐿️", top: "28%", left: "50%", size: 26, delay: 2.4 },
  { emoji: "🌺", top: "92%", left: "18%", size: 30, delay: 1.1 },
  { emoji: "🦉", top: "88%", left: "82%", size: 28, delay: 0.5 },
  { emoji: "🐸", top: "46%", left: "50%", size: 24, delay: 1.9 },
  { emoji: "🎈", top: "60%", left: "50%", size: 30, delay: 2.6 },
  { emoji: "🌹", top: "2%", left: "70%", size: 28, delay: 1.3 },
];

export default function Background() {
  return (
    <div className="bg-decor" aria-hidden="true">
      {ITEMS.map((it, i) => (
        <span
          key={i}
          className="floaty"
          style={{ top: it.top, left: it.left, fontSize: it.size, animationDelay: `${it.delay}s` }}
        >
          {it.emoji}
        </span>
      ))}
    </div>
  );
}
