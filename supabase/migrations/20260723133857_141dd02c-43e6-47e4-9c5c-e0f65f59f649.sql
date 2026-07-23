
CREATE TABLE public.game_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  host_id text NOT NULL,
  guest_id text,
  host_name text NOT NULL,
  guest_name text,
  host_character text,
  guest_character text,
  place text,
  phase text NOT NULL DEFAULT 'lobby',
  prompt text,
  host_progress int NOT NULL DEFAULT 0,
  guest_progress int NOT NULL DEFAULT 0,
  host_wpm int NOT NULL DEFAULT 0,
  guest_wpm int NOT NULL DEFAULT 0,
  host_acc int NOT NULL DEFAULT 100,
  guest_acc int NOT NULL DEFAULT 100,
  winner text,
  started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_rooms TO anon, authenticated;
GRANT ALL ON public.game_rooms TO service_role;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read rooms" ON public.game_rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone can create rooms" ON public.game_rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone can update rooms" ON public.game_rooms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.leaderboard (
  name text PRIMARY KEY,
  wins int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  best_wpm int NOT NULL DEFAULT 0,
  best_acc int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.leaderboard TO anon, authenticated;
GRANT ALL ON public.leaderboard TO service_role;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read leaderboard" ON public.leaderboard FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone can upsert leaderboard" ON public.leaderboard FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anyone can update leaderboard" ON public.leaderboard FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER TABLE public.game_rooms REPLICA IDENTITY FULL;
