# 🌸 Who Knows Sara? — Birthday Quiz

A live, multiplayer "how well do you know Sara" quiz for her birthday. Questions and
correct answers come straight from Sara's own Google Form. Friends join with just
their name, wait in a lobby, then answer 13 timed multiple-choice questions (15
seconds each, 10 pts each — 130 pts total) together. Ends with a 5-second "and the
winner is..." drumroll, then a ranked leaderboard and a crowned winner.

Built with **React + Vite**, backed by **Supabase** for live sync and scoring, and
deployed to **GitHub Pages** automatically via GitHub Actions on every push to `main`.

## Links (after setup below)

- **Player link:** `https://<your-github-username>.github.io/sara-bday-quiz/#/`
- **Admin link:** `https://<your-github-username>.github.io/sara-bday-quiz/#/admin`
- **Birthday wishes link:** `https://<your-github-username>.github.io/sara-bday-quiz/#/wishes`

(All three are the same site — `/admin` and `/wishes` are just different routes. `/wishes`
needs no PIN and no Supabase; share it separately from the quiz link whenever you like.)

## How it works

- **`src/pages/PlayerPage.jsx`** — the player app: name entry → waiting room → live quiz → leaderboard.
- **`src/pages/AdminPage.jsx`** — the host dashboard: see who's joined, hit **Start Quiz**, and it
  auto-advances every 15 seconds; after the last question it holds a 5-second reveal
  countdown before everyone sees the leaderboard.
- **`src/pages/WishesPage.jsx`** — a standalone "birthday wishes" page: a corkboard of polaroid
  photos, one per friend (Manish, her husband, pinned separately below as the closer). Tap a
  photo to open the full letter, with prev/next to browse everyone's message. Static — no
  Supabase needed. Edit **[`src/wishesData.js`](src/wishesData.js)** to add/edit messages, and
  drop real photos into **[`src/assets/wishes/`](src/assets/wishes/README.md)** named after each
  person's `id` (e.g. `nitpreet.jpg`) — no code changes needed, they're picked up automatically
  on the next deploy. Anyone without a photo just gets a colored initial avatar.
- **Supabase** stores players, the shared game state, and every submitted answer, and
  pushes realtime updates to every open tab (Supabase Realtime on Postgres changes).
  Scoring (a flat 10 pts per correct answer, no speed bonus — 130 pts max across all
  13 questions) happens in a Postgres trigger the moment an answer is submitted, so
  it's recorded server-side, not trusted to the client, and a player's score is always
  correct up to whatever they've answered so far — if someone drops off mid-game,
  their score simply stops climbing rather than needing any cleanup. (The wishes page
  doesn't use Supabase at all — it's plain static content.)

## One-time setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is fine).
2. Open **SQL Editor** in the Supabase dashboard, paste in [`supabase/schema.sql`](supabase/schema.sql), and run it.
   This creates the `players`, `game_state`, and `answers` tables, the scoring trigger, RLS
   policies, and turns on realtime for all three tables.
3. In **Project Settings → API**, copy your **Project URL** and **anon public key**.
4. Open [`src/config.js`](src/config.js) and fill in:
   ```js
   export const SUPABASE_URL = "https://xxxxx.supabase.co";
   export const SUPABASE_ANON_KEY = "eyJ...";
   export const ADMIN_PIN = "pick-your-own-pin";
   ```
5. In the repo's **Settings → Pages**, set Source to **GitHub Actions** (only needed once).
6. Commit and push to `main` — the included workflow (`.github/workflows/deploy.yml`)
   builds the app and deploys it to GitHub Pages automatically.

## Local development

```bash
npm install
npm run dev
```

Then open the printed local URL for the player view, and `/#/admin` for the admin view.

## Running the quiz on the day

1. Open the **admin link** on your (the host's) phone or laptop, enter the admin PIN.
2. Share the **player link** with everyone — they enter their name and land in the
   waiting room, watching people pile in.
3. Once everyone's in, hit **Start Quiz** on the admin dashboard. Every player is
   instantly moved to Question 1 with a 15-second countdown ring.
4. The admin tab auto-advances the group to the next question every 15 seconds — no
   manual clicking needed. Keep that tab open/awake during the quiz (if you have to
   refresh it, it'll offer a "Resume driving from here" button).
5. After the last question, everyone sees a 5-second "and the winner is..." drumroll
   countdown, then automatically lands on the leaderboard, with the winner under a
   bouncing crown 👑 and falling flower/confetti.
6. Use **Reset Game** on the admin dashboard to wipe players/answers and run it again
   (e.g. for a second group).

## Notes

- This is built for a trusted friend-group party, not a public competition: the admin
  PIN is a light deterrent (not real auth), and since the browser needs the answer key
  to grade instantly, a determined player could find it in the page source. Don't share
  the admin link with anyone before the reveal if that matters to you.
- All 13 questions and Sara's real answers live in [`src/questions.js`](src/questions.js) —
  edit that file to tweak wording, add/remove questions, or adjust distractor options.
