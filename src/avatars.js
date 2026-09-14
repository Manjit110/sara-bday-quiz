// A fun, varied avatar face is assigned to each player based on their id,
// so the same player always gets the same face everywhere (waiting room,
// admin list, leaderboard) no matter how the list is sorted.
const AVATAR_POOL = [
  "👽",
  "🤖",
  "👾",
  "🐵",
  "🐶",
  "🐱",
  "🦊",
  "🐼",
  "🦁",
  "🐯",
  "🐨",
  "🐸",
  "🐧",
  "🦄",
  "🐙",
  "🦋",
  "🐝",
  "🦖",
  "🐻",
  "🦥",
  "🐰",
  "🦉",
  "🐢",
  "🦩",
];

export function avatarForId(id) {
  if (!id) return AVATAR_POOL[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_POOL[hash % AVATAR_POOL.length];
}
