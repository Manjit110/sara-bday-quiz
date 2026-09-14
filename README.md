# 🌸 Who Knows Sara? — Birthday Quiz

A live, multiplayer "how well do you know Sara" quiz for her birthday. Questions and
correct answers come straight from Sara's own Google Form. Friends join with just
their name, wait in a lobby, then answer 13 timed multiple-choice questions (15
seconds each) together. Ends with a ranked leaderboard and a crowned winner. No
build step — plain HTML/CSS/JS, backed by Supabase for live sync and scoring.

## How it works

- **`index.html`** — the player app: name entry → waiting room → live quiz → leaderboard.
- **`admin.html`** — the host dashboard: see who's joined, hit **Start Quiz**, and it
  auto-advances every 15 seconds until the last question, then everyone sees the
  leaderboard.
- **Supabase** stores players, the shared game state, and every submitted answer, and
  pushes realtime updates to every open tab (Supabase Realtime on Postgres changes).
  Scoring (100 pts + a speed bonus for fast correct answers) happens in a Postgres
  trigger, so it's recorded server-side, not trusted to the client.

## One-time setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is fine).
2. Open **SQL Editor** in the Supabase dashboard, paste in [`supabase/schema.sql`](supabase/schema.sql), and run it.
   This creates the `players`, `game_state`, and `answers` tables, the scoring trigger, RLS
   policies, and turns on realtime for all three tables.
3. In **Project Settings → API**, copy your **Project URL** and **anon public key**.
4. Open [`assets/config.js`](assets/config.js) and fill in:
   ```js
   const SUPABASE_URL = "https://xxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ...";
   const ADMIN_PIN = "pick-your-own-pin";
   ```
5. Commit and push. Turn on **GitHub Pages** for this repo (Settings → Pages → Deploy
   from branch `main`, root `/`).

## Running the quiz on the day

1. Open `admin.html` on your (the host's) phone or laptop, enter the admin PIN.
2. Share the `index.html` link with everyone — they enter their name and land in the
   waiting room, watching people pile in.
3. Once everyone's in, hit **Start Quiz** on the admin dashboard. Every player is
   instantly moved to Question 1 with a 15-second countdown ring.
4. The admin tab auto-advances the group to the next question every 15 seconds — no
   manual clicking needed. Keep that tab open/awake during the quiz (if you have to
   refresh it, it'll offer a "Resume driving from here" button).
5. After the last question, everyone automatically sees the leaderboard, with the
   winner under a bouncing crown 👑 and falling flower/confetti.
6. Use **Reset Game** on the admin dashboard to wipe players/answers and run it again
   (e.g. for a second group).

## Notes

- This is built for a trusted friend-group party, not a public competition: the admin
  PIN is a light deterrent (not real auth), and since the browser needs the answer key
  to grade instantly, a determined player could find it in the page source. Don't share
  the repo or `admin.html` link with anyone before the reveal if that matters to you.
- All 13 questions and Sara's real answers live in [`assets/questions.js`](assets/questions.js) —
  edit that file to tweak wording, add/remove questions, or adjust distractor options.
