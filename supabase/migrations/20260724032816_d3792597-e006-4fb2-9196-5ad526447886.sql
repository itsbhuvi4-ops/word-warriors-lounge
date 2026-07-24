-- Lock down game_rooms and leaderboard: writes only via server (service_role).
-- Keep public SELECT for gameplay/leaderboard reads, but hide sensitive identifier columns.

DROP POLICY IF EXISTS "anyone can create rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "anyone can read rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "anyone can update rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "anyone can read leaderboard" ON public.leaderboard;
DROP POLICY IF EXISTS "anyone can update leaderboard" ON public.leaderboard;
DROP POLICY IF EXISTS "anyone can upsert leaderboard" ON public.leaderboard;

-- Track leaderboard row ownership so a name cannot be hijacked.
ALTER TABLE public.leaderboard ADD COLUMN IF NOT EXISTS owner_id text;

-- Revoke broad grants; re-grant SELECT with column list that hides host_id/guest_id.
REVOKE ALL ON public.game_rooms FROM anon, authenticated;
GRANT SELECT (
  id, code, host_name, guest_name, host_character, guest_character, place, phase, prompt,
  host_progress, guest_progress, host_wpm, guest_wpm, host_acc, guest_acc, winner,
  started_at, created_at, updated_at
) ON public.game_rooms TO anon, authenticated;
GRANT ALL ON public.game_rooms TO service_role;

REVOKE ALL ON public.leaderboard FROM anon, authenticated;
GRANT SELECT (name, wins, losses, best_wpm, best_acc, updated_at) ON public.leaderboard TO anon, authenticated;
GRANT ALL ON public.leaderboard TO service_role;

-- Public SELECT policies (USING(true) is allowed for SELECT). No INSERT/UPDATE policies => denied for anon/authenticated.
CREATE POLICY "read rooms" ON public.game_rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "read leaderboard" ON public.leaderboard FOR SELECT TO anon, authenticated USING (true);
