-- "Who Knows Sara?" birthday quiz — run this once in the Supabase SQL editor
-- (Project -> SQL Editor -> New query -> paste -> Run).

create extension if not exists "pgcrypto";

-- Everyone who has joined the quiz
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  score int not null default 0,
  joined_at timestamptz not null default now()
);

-- Single-row table holding the current state of the game
create table if not exists game_state (
  id int primary key,
  status text not null default 'waiting', -- 'waiting' | 'active' | 'finished'
  current_question int not null default -1,
  question_started_at timestamptz,
  constraint game_state_single_row check (id = 1)
);

insert into game_state (id, status, current_question)
values (1, 'waiting', -1)
on conflict (id) do nothing;

-- Every answer a player submits
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  question_index int not null,
  selected_option text not null,
  is_correct boolean not null,
  answer_time_ms int not null,
  created_at timestamptz not null default now(),
  unique (player_id, question_index)
);

-- Award points on correct answers: 100 base + up to 50 speed bonus for answering fast
create or replace function award_points() returns trigger as $$
begin
  if new.is_correct then
    update players
    set score = score + 100 + greatest(0, floor((15000 - new.answer_time_ms) / 1000.0) * 5)::int
    where id = new.player_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_award_points on answers;
create trigger trg_award_points
after insert on answers
for each row execute function award_points();

-- Row level security: this is a public anon-key app for a private party quiz,
-- so policies are permissive by design. Keep the admin PIN in assets/config.js
-- private and don't share the admin.html link publicly.
alter table players enable row level security;
alter table game_state enable row level security;
alter table answers enable row level security;

drop policy if exists "read players" on players;
create policy "read players" on players for select using (true);
drop policy if exists "join as player" on players;
create policy "join as player" on players for insert with check (true);
drop policy if exists "admin can delete players" on players;
create policy "admin can delete players" on players for delete using (true);
drop policy if exists "update players" on players;
create policy "update players" on players for update using (true) with check (true);

drop policy if exists "read game state" on game_state;
create policy "read game state" on game_state for select using (true);
drop policy if exists "update game state" on game_state;
create policy "update game state" on game_state for update using (true);

drop policy if exists "read answers" on answers;
create policy "read answers" on answers for select using (true);
drop policy if exists "submit answer" on answers;
create policy "submit answer" on answers for insert with check (true);
drop policy if exists "admin can delete answers" on answers;
create policy "admin can delete answers" on answers for delete using (true);

-- Enable realtime so the waiting room, quiz, and admin dashboard update live
-- (guarded so this script can be re-run safely)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'players'
  ) then
    alter publication supabase_realtime add table players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_state'
  ) then
    alter publication supabase_realtime add table game_state;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'answers'
  ) then
    alter publication supabase_realtime add table answers;
  end if;
end $$;
