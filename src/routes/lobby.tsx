import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  generateRoomCode,
  getPlayerId,
  getPlayerName,
  setPlayerName,
} from "@/lib/game-data";

export const Route = createFileRoute("/lobby")({
  head: () => ({
    meta: [
      { title: "Type Battle Arena — Combat Typeist" },
      { name: "description", content: "Create or join a typing battle room and climb the arena leaderboard." },
      { property: "og:title", content: "Type Battle Arena — Combat Typeist" },
      { property: "og:description", content: "Create or join a typing battle room and climb the arena leaderboard." },
    ],
  }),
  component: Lobby,
});

type LeaderRow = {
  name: string;
  wins: number;
  losses: number;
  best_wpm: number;
  best_acc: number;
};

function Lobby() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState(["", "", "", ""]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(getPlayerName());
    supabase
      .from("leaderboard")
      .select("*")
      .order("wins", { ascending: false })
      .order("best_wpm", { ascending: false })
      .limit(20)
      .then(({ data }) => setLeaders((data as LeaderRow[]) ?? []));
  }, []);

  async function createRoom() {
    setError(null);
    const n = name.trim();
    if (!n) return setError("Enter your fighter name");
    setBusy(true);
    setPlayerName(n);
    const code = generateRoomCode();
    const { error: err } = await supabase.from("game_rooms").insert({
      code,
      host_id: getPlayerId(),
      host_name: n,
      phase: "waiting",
    });
    setBusy(false);
    if (err) return setError(err.message);
    navigate({ to: "/room/$code", params: { code } });
  }

  async function joinRoom() {
    setError(null);
    const n = name.trim();
    const code = joinCode.join("").toUpperCase();
    if (!n) return setError("Enter your fighter name");
    if (code.length !== 4) return setError("Enter a 4-character room code");
    setBusy(true);
    setPlayerName(n);
    const { data, error: err } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (err || !data) {
      setBusy(false);
      return setError("Room not found");
    }
    if (data.guest_id && data.guest_id !== getPlayerId()) {
      setBusy(false);
      return setError("Room is full");
    }
    const { error: uErr } = await supabase
      .from("game_rooms")
      .update({
        guest_id: getPlayerId(),
        guest_name: n,
        phase: "character",
        updated_at: new Date().toISOString(),
      })
      .eq("code", code);
    setBusy(false);
    if (uErr) return setError(uErr.message);
    navigate({ to: "/room/$code", params: { code } });
  }

  function updateCodeChar(i: number, v: string) {
    const ch = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(-1);
    const next = [...joinCode];
    next[i] = ch;
    setJoinCode(next);
    if (ch && i < 3) {
      const el = document.getElementById(`code-${i + 1}`) as HTMLInputElement | null;
      el?.focus();
    }
  }

  return (
    <div className="min-h-screen px-6 py-10 md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h1 className="font-display text-5xl tracking-wide text-foreground text-glow md:text-7xl">
            TYPE BATTLE ARENA
          </h1>
          <p className="mt-3 font-heading text-xs tracking-[0.4em] text-primary md:text-sm">
            ⇢ TYPE FAST · TYPE TRUE · KNOCK THEM OUT ⇠
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Create / Join panel */}
          <div className="rune-frame p-8">
            <label className="mb-2 block font-heading text-xs tracking-[0.3em] text-primary/80">
              YOUR FIGHTER NAME
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 16))}
              placeholder="Enter your name"
              className="mb-6 w-full border border-border bg-input/40 px-4 py-3 font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />

            <button onClick={createRoom} disabled={busy} className="btn-fantasy w-full">
              Create Room
            </button>

            <div className="my-6 flex items-center gap-3 text-xs tracking-[0.3em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              OR
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="mb-4 text-center font-heading text-xs tracking-[0.3em] text-primary/80">
              ROOM ID
            </div>
            <div className="mb-6 flex justify-center gap-3">
              {joinCode.map((ch, i) => (
                <input
                  key={i}
                  id={`code-${i}`}
                  value={ch}
                  onChange={(e) => updateCodeChar(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !ch && i > 0) {
                      const prev = document.getElementById(`code-${i - 1}`) as HTMLInputElement | null;
                      prev?.focus();
                    }
                  }}
                  maxLength={1}
                  className="h-14 w-14 border border-border bg-input/40 text-center font-display text-2xl text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ))}
            </div>

            <button onClick={joinRoom} disabled={busy} className="btn-fantasy w-full">
              Join Room
            </button>

            {error && (
              <p className="mt-4 text-center text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Leaderboard */}
          <div className="rune-frame p-8">
            <h2 className="mb-6 text-center font-display text-2xl tracking-widest text-foreground text-glow">
              LEADERBOARD
            </h2>
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 gap-y-1 font-mono text-sm">
              <div className="pb-2 font-heading text-xs tracking-widest text-muted-foreground"></div>
              <div className="pb-2 font-heading text-xs tracking-widest text-muted-foreground">PLAYER</div>
              <div className="pb-2 text-right font-heading text-xs tracking-widest text-muted-foreground">W/L</div>
              <div className="pb-2 text-right font-heading text-xs tracking-widest text-muted-foreground">WPM</div>
              <div className="pb-2 text-right font-heading text-xs tracking-widest text-muted-foreground">ACC</div>
              {leaders.length === 0 && (
                <div className="col-span-5 py-8 text-center text-sm text-muted-foreground">
                  No fighters yet. Be the first.
                </div>
              )}
              {leaders.map((row, i) => (
                <div key={row.name} className="contents">
                  <div className="border-t border-border/40 py-2 text-primary/80">#{i + 1}</div>
                  <div className="border-t border-border/40 py-2 text-foreground">{row.name}</div>
                  <div className="border-t border-border/40 py-2 text-right text-primary">{row.wins}/{row.losses}</div>
                  <div className="border-t border-border/40 py-2 text-right text-primary">{row.best_wpm}</div>
                  <div className="border-t border-border/40 py-2 text-right text-primary">{row.best_acc}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}