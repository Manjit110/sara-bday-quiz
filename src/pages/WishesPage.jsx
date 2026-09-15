import { useEffect, useState } from "react";
import { WISHES } from "../wishesData";
import { photoFor } from "../wishesPhotos";

const PALETTE = ["pink", "peach", "lavender", "mint", "sun"];
// Fixed per-card tilt so the corkboard feels hand-pinned but never jumps
// between renders (same trick as Background.jsx).
const TILTS = [-5, 4, -3, 6, -6, 3, -4, 5, -2, 6];

function initials(name) {
  return name.slice(0, 1).toUpperCase();
}

function Polaroid({ person, index, onOpen }) {
  const photo = photoFor(person.id);
  const color = PALETTE[index % PALETTE.length];
  const tilt = TILTS[index % TILTS.length];

  return (
    <button
      className="polaroid"
      style={{ "--tilt": `${tilt}deg` }}
      onClick={() => onOpen(index)}
      aria-label={`Read ${person.name}'s birthday message for Sara`}
    >
      <span className="polaroid-pin">📌</span>
      <span className="polaroid-photo">
        {photo ? (
          <img src={photo} alt={person.name} />
        ) : (
          <span className={`polaroid-placeholder swatch-${color}`}>{initials(person.name)}</span>
        )}
      </span>
      <span className="polaroid-caption">{person.name}</span>
    </button>
  );
}

function LetterModal({ person, index, onClose }) {
  const photo = person ? photoFor(person.id) : null;

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!person) return null;

  return (
    <div className="letter-backdrop" onClick={onClose}>
      <div
        className={`letter-card ${person.isHusband ? "husband" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="letter-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {person.isHusband && <span className="letter-ribbon">💍 Her Husband</span>}

        <span className="letter-photo">
          {photo ? (
            <img src={photo} alt={person.name} />
          ) : (
            <span className={`polaroid-placeholder swatch-${PALETTE[index % PALETTE.length]}`}>
              {initials(person.name)}
            </span>
          )}
        </span>

        <h2 className="letter-name">{person.name}</h2>
        <p className="letter-body">{person.message}</p>
      </div>
    </div>
  );
}

export default function WishesPage() {
  const [openIndex, setOpenIndex] = useState(null);
  const husband = WISHES.find((w) => w.isHusband);
  const friends = WISHES.filter((w) => !w.isHusband);
  const ordered = [...friends, ...(husband ? [husband] : [])];

  return (
    <div className="wishes-app">
      <div className="wishes-header">
        <h1>🌸 Birthday Wishes for Sara 🌸</h1>
        <p className="subtitle">Tap a photo to read the letter 💌</p>
      </div>

      <div className="corkboard">
        <div className="wishes-grid">
          {friends.map((person, i) => (
            <Polaroid key={person.id} person={person} index={i} onOpen={setOpenIndex} />
          ))}
        </div>

        {husband && (
          <div className="husband-row">
            <Polaroid person={husband} index={friends.length} onOpen={setOpenIndex} />
          </div>
        )}
      </div>

      {openIndex !== null && (
        <LetterModal person={ordered[openIndex]} index={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </div>
  );
}
