import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CHARACTERS,
  PLACES,
  characterById,
  getPlayerId,
  getPlayerName,
  placeById,
  randomPrompt,
} from "@/lib/game-data";
import {
  getMyRoleFn,
  submitResultFn,
  updateRoomFn,
} from "@/lib/game.functions";

type Room = {
  code: string;
  host_name: string;
  guest_name: string | null;
  host_character: string | null;
  guest_character: string | null;
  place: string | null;
  phase: string;
  prompt: string | null;
  host_progress: number;
  guest_progress: number;
  host_wpm: number;
  guest_wpm: number;
  host_acc: number;
  guest_acc: number;
  winner: string | null;
  started_at: string | null;
};

export const Route = createFileRoute("/room/$code")({
  head: () => ({
    meta: [
      { title: "Battle Room — Combat Typeist" },
      { name: "description", content: "Choose your champion, choose the arena, and type to strike your opponent down." },
    ],
  }),
  component: RoomPage,
});

function RoomPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const playerId = useMemo(() => (typeof window !== "undefined" ? getPlayerId() : ""), []);
  const [role, setRole] = useState<"host" | "guest" | null>(null);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("game_rooms")
        .select(
          "code,host_name,guest_name,host_character,guest_character,place,phase,prompt,host_progress,guest_progress,host_wpm,guest_wpm,host_acc,guest_acc,winner,started_at",
        )
        .eq("code", code)
        .maybeSingle();
      let r: { role: "host" | "guest" | null } = { role: null };
      try {
        r = await getMyRoleFn({ data: { playerId, code } });
      } catch {
        r = { role: null };
      }
      if (!cancelled) {
        setRoom(data as Room | null);
        setRole(r.role);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`room-${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_rooms", filter: `code=eq.${code}` },
        (payload) => {
          if (payload.new) setRoom(payload.new as Room);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [code, playerId]);

  const isHost = role === "host";
  const isGuest = role === "guest";
  const inRoom = isHost || isGuest;

  // Host-driven phase transitions
  useEffect(() => {
    if (!room || !isHost) return;
    if (room.phase === "character" && room.host_character && room.guest_character) {
      updateRoomFn({ data: { playerId, code, patch: { phase: "place" } } }).catch(() => {});
    }
    if (room.phase === "place" && room.place && !room.prompt) {
      updateRoomFn({
        data: {
          playerId,
          code,
          patch: {
            prompt: randomPrompt(),
            phase: "battle",
            started_at: new Date().toISOString(),
            host_progress: 0,
            guest_progress: 0,
            host_wpm: 0,
            guest_wpm: 0,
            host_acc: 100,
            guest_acc: 100,
            winner: null,
          },
        },
      }).catch(() => {});
    }
  }, [room, isHost, code, playerId]);

  if (loading) {
    return <CenterMsg>Summoning the arena…</CenterMsg>;
  }
  if (!room) {
    return (
      <CenterMsg>
        Room not found.
        <Link to="/lobby" className="btn-fantasy mt-6">Back to lobby</Link>
      </CenterMsg>
    );
  }
  if (!inRoom && room.phase !== "waiting") {
    return (
      <CenterMsg>
        This battle has already begun.
        <Link to="/lobby" className="btn-fantasy mt-6">Back to lobby</Link>
      </CenterMsg>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-10">
      <TopBar code={room.code} onLeave={() => navigate({ to: "/lobby" })} />
      {room.phase === "waiting" && <WaitingScreen room={room} />}
      {room.phase === "character" && <CharacterSelect room={room} isHost={isHost} code={code} playerId={playerId} />}
      {room.phase === "place" && <PlaceSelect room={room} isHost={isHost} code={code} playerId={playerId} />}
      {room.phase === "battle" && <BattleScreen room={room} isHost={isHost} code={code} playerId={playerId} />}
      {room.phase === "finished" && <ResultScreen room={room} isHost={isHost} code={code} playerId={playerId} />}
    </div>
  );
}

function CenterMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center font-display text-2xl tracking-wide text-foreground text-glow">
      {children}
    </div>
  );
}

function TopBar({ code, onLeave }: { code: string; onLeave: () => void }) {
  return (
    <div className="mx-auto mb-8 flex max-w-6xl items-center justify-between">
      <div className="font-display text-sm tracking-[0.3em] text-primary text-glow">⚔ COMBAT TYPEIST</div>
      <div className="rune-frame px-4 py-2 font-mono text-sm text-primary">ROOM · {code}</div>
      <button onClick={onLeave} className="font-heading text-xs tracking-[0.3em] text-muted-foreground hover:text-destructive">
        LEAVE
      </button>
    </div>
  );
}

function WaitingScreen({ room }: { room: Room }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rune-frame p-10 text-center">
        <h2 className="font-display text-4xl text-foreground text-glow">AWAITING CHALLENGER</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Share this code with your opponent. The arena will open when they arrive.
        </p>
        <div className="my-8 flex justify-center gap-4">
          {room.code.split("").map((c, i) => (
            <div
              key={i}
              className="flex h-20 w-20 items-center justify-center border border-primary/60 bg-input/40 font-display text-4xl text-primary text-glow animate-pulse-glow"
            >
              {c}
            </div>
          ))}
        </div>
        <p className="font-heading text-xs tracking-[0.3em] text-primary/80">HOST · {room.host_name}</p>
      </div>
    </div>
  );
}

function CharacterSelect({ room, isHost, code, playerId }: { room: Room; isHost: boolean; code: string; playerId: string }) {
  const myPick = isHost ? room.host_character : room.guest_character;
  const oppPick = isHost ? room.guest_character : room.host_character;

  async function pick(id: string) {
    const patch = isHost ? { host_character: id } : { guest_character: id };
    await updateRoomFn({ data: { playerId, code, patch } }).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 text-center">
        <h2 className="font-display text-4xl tracking-wide text-foreground text-glow md:text-6xl">CHOOSE YOUR CHAMPION</h2>
        <div className="mx-auto mt-4 h-px w-40 bg-primary/50" />
        <p className="mt-4 text-sm text-muted-foreground">
          {myPick ? "Locked in. Waiting for opponent…" : "Select your fighter."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {CHARACTERS.map((c) => {
          const isMine = myPick === c.id;
          const isOpp = oppPick === c.id;
          return (
            <button
              key={c.id}
              onClick={() => pick(c.id)}
              className={`group relative overflow-hidden border transition ${
                isMine
                  ? "border-primary shadow-[0_0_30px_var(--emerald-glow)]"
                  : "border-border hover:border-primary/60"
              }`}
            >
              <img src={c.image} alt={c.name} className="h-72 w-full object-cover" loading="lazy" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent p-3 text-center">
                <div className="font-display text-sm tracking-widest text-primary">{c.name}</div>
                <div className="mt-0.5 text-[10px] tracking-widest text-muted-foreground">{c.title}</div>
              </div>
              {isMine && (
                <div className="absolute right-2 top-2 border border-primary bg-background/80 px-2 py-0.5 font-heading text-[10px] tracking-widest text-primary">YOU</div>
              )}
              {isOpp && (
                <div className="absolute left-2 top-2 border border-destructive bg-background/80 px-2 py-0.5 font-heading text-[10px] tracking-widest text-destructive">FOE</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlaceSelect({ room, isHost, code, playerId }: { room: Room; isHost: boolean; code: string; playerId: string }) {
  async function pick(id: string) {
    if (!isHost) return; // host chooses arena
    await updateRoomFn({ data: { playerId, code, patch: { place: id } } }).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 text-center">
        <h2 className="font-display text-4xl tracking-wide text-foreground text-glow md:text-6xl">
          ⇢ CHOOSE THE PLACE ⇠
        </h2>
        <p className="mt-4 text-sm text-muted-foreground">
          {isHost ? "Host, select the arena." : "The host is choosing the arena…"}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PLACES.map((p) => {
          const active = room.place === p.id;
          return (
            <button
              key={p.id}
              disabled={!isHost}
              onClick={() => pick(p.id)}
              className={`group relative overflow-hidden border text-left transition ${
                active ? "border-primary shadow-[0_0_30px_var(--emerald-glow)]" : "border-border hover:border-primary/60"
              } ${isHost ? "" : "cursor-not-allowed"}`}
            >
              <img src={p.image} alt={p.name} className="h-64 w-full object-cover" loading="lazy" />
              <div className="bg-card p-4">
                <div className="font-display text-xl tracking-widest text-foreground">{p.name}</div>
                <div className="mt-1 text-xs tracking-widest text-muted-foreground">{p.tagline}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BattleScreen({ room, isHost, code, playerId }: { room: Room; isHost: boolean; code: string; playerId: string }) {
  const prompt = room.prompt ?? "";
  const [typed, setTyped] = useState("");
  const [errors, setErrors] = useState(0);
  const [finished, setFinished] = useState(false);
  const startedAt = useMemo(() => (room.started_at ? new Date(room.started_at).getTime() : Date.now()), [room.started_at]);
  const inputRef = useRef<HTMLInputElement>(null);
  const finishedRef = useRef(false);

  // Fighting FX state
  const [myAttackKey, setMyAttackKey] = useState(0);
  const [oppHurtKey, setOppHurtKey] = useState(0);
  const [myHurtKey, setMyHurtKey] = useState(0);
  const [oppAttackKey, setOppAttackKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboFlash, setComboFlash] = useState(0);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; side: "left" | "right" }[]>([]);
  const lastKeyAt = useRef<number>(0);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOppProgress = useRef(0);

  const place = placeById(room.place);
  const myChar = characterById(isHost ? room.host_character : room.guest_character);
  const oppChar = characterById(isHost ? room.guest_character : room.host_character);
  const myName = isHost ? room.host_name : room.guest_name;
  const oppName = isHost ? room.guest_name : room.host_name;
  const myProgress = isHost ? room.host_progress : room.guest_progress;
  const oppProgress = isHost ? room.guest_progress : room.host_progress;
  const myWpm = isHost ? room.host_wpm : room.guest_wpm;
  const oppWpm = isHost ? room.guest_wpm : room.host_wpm;
  const myAcc = isHost ? room.host_acc : room.guest_acc;
  const oppAcc = isHost ? room.guest_acc : room.host_acc;

  // Health = 100 - damage taken from opponent progress
  const myHealth = Math.max(0, 100 - oppProgress);
  const oppHealth = Math.max(0, 100 - myProgress);

  // Trigger opponent attack + my hurt when their progress ticks up
  useEffect(() => {
    if (oppProgress > prevOppProgress.current) {
      setOppAttackKey((k) => k + 1);
      setMyHurtKey((k) => k + 1);
      setShakeKey((k) => k + 1);
      spawnSpark("right");
    }
    prevOppProgress.current = oppProgress;
  }, [oppProgress]);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (comboTimer.current) clearTimeout(comboTimer.current);
    };
  }, []);

  function spawnSpark(side: "left" | "right") {
    const id = Date.now() + Math.random();
    // spark near the receiving fighter, based on their side
    const x = side === "left" ? 78 : 22; // percent
    const y = 55 + Math.random() * 10;
    setSparks((s) => [...s, { id, x, y, side }]);
    setTimeout(() => setSparks((s) => s.filter((sp) => sp.id !== id)), 420);
  }

  const pushUpdate = useCallback(
    async (progressPct: number, wpm: number, acc: number, isWin: boolean) => {
      const patch = isHost
        ? { host_progress: progressPct, host_wpm: wpm, host_acc: acc }
        : { guest_progress: progressPct, guest_wpm: wpm, guest_acc: acc };
      const winPatch = isWin ? { phase: "finished", winner: myName ?? "" } : {};
      await updateRoomFn({
        data: { playerId, code, patch: { ...patch, ...winPatch } },
      }).catch(() => {});
    },
    [isHost, code, myName, playerId],
  );

  function onChange(v: string) {
    if (finishedRef.current) return;
    // No editing past end
    if (v.length > prompt.length) v = v.slice(0, prompt.length);
    const prevLen = typed.length;
    const isForward = v.length > prevLen;
    const newestIdx = v.length - 1;
    const struckCorrect = isForward && newestIdx >= 0 && v[newestIdx] === prompt[newestIdx];
    const struckWrong = isForward && newestIdx >= 0 && v[newestIdx] !== prompt[newestIdx];

    // Count errors incrementally: any position where v[i] !== prompt[i] adds an error at the moment of press
    let e = 0;
    for (let i = 0; i < v.length; i++) if (v[i] !== prompt[i]) e++;
    setErrors(e);
    setTyped(v);

    const correct = [...v].filter((ch, i) => ch === prompt[i]).length;
    const progressPct = Math.round((correct / prompt.length) * 100);
    const minutes = Math.max((Date.now() - startedAt) / 60000, 1 / 600);
    const wpm = Math.round(correct / 5 / minutes);
    const acc = v.length === 0 ? 100 : Math.round((correct / v.length) * 100);

    // FX + combo
    if (struckCorrect) {
      setMyAttackKey((k) => k + 1);
      setOppHurtKey((k) => k + 1);
      setShakeKey((k) => k + 1);
      spawnSpark("left");
      const now = Date.now();
      const fast = now - lastKeyAt.current < 220;
      lastKeyAt.current = now;
      setCombo((c) => {
        const next = fast ? c + 1 : 1;
        if (next % 5 === 0 && next > 0) setComboFlash(next);
        return next;
      });
      if (comboTimer.current) clearTimeout(comboTimer.current);
      comboTimer.current = setTimeout(() => setCombo(0), 900);
    } else if (struckWrong) {
      setMyHurtKey((k) => k + 1);
      setCombo(0);
    }

    const isWin = v === prompt;
    if (isWin) {
      finishedRef.current = true;
      setFinished(true);
    }
    pushUpdate(progressPct, wpm, acc, isWin);
  }

  const showWinner = room.phase === "finished";

  return (
    <div key={shakeKey} className="mx-auto max-w-6xl fx-screen-shake">
      {/* HUD */}
      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <PlayerHud side="left" name={myName ?? "You"} char={myChar} health={myHealth} progress={myProgress} wpm={myWpm} acc={myAcc} accent="primary" />
        <ComboMeter combo={combo} flash={comboFlash} />
        <PlayerHud side="right" name={oppName ?? "Foe"} char={oppChar} health={oppHealth} progress={oppProgress} wpm={oppWpm} acc={oppAcc} accent="destructive" />
      </div>

      {/* Arena */}
      <div
        className="relative h-80 overflow-hidden border border-primary/40 neon-arena"
        style={{
          backgroundImage: place ? `url(${place.image})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/70" />
        {/* neon grid overlay */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-screen"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, oklch(0.75 0.28 320 / 0.25) 0 1px, transparent 1px 44px), repeating-linear-gradient(0deg, oklch(0.75 0.28 200 / 0.18) 0 1px, transparent 1px 44px)",
          }}
        />
        <div className="absolute inset-x-0 bottom-6 mx-8 h-px bg-primary/60 shadow-[0_0_18px_var(--emerald-glow)]" />

        {/* Fighters with attack/hurt animation wrappers */}
        <FighterFX
          side="left"
          progress={myProgress}
          char={myChar}
          accent="primary"
          attackKey={myAttackKey}
          hurtKey={myHurtKey}
        />
        <FighterFX
          side="right"
          progress={oppProgress}
          char={oppChar}
          accent="destructive"
          attackKey={oppAttackKey}
          hurtKey={oppHurtKey}
        />

        {/* Hit sparks */}
        {sparks.map((s) => (
          <span key={s.id} className="spark" style={{ left: `${s.x}%`, top: `${s.y}%` }} />
        ))}

        {/* Combo callout */}
        {combo >= 5 && !showWinner && (
          <div
            key={comboFlash}
            className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 fx-combo-pop font-display text-4xl tracking-widest text-glow"
            style={{ color: "oklch(0.9 0.25 60)" }}
          >
            {combo} HIT COMBO!
          </div>
        )}

        {showWinner && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <div className="font-display text-6xl tracking-widest text-primary text-glow">
                {room.winner === myName ? "VICTORY" : "DEFEAT"}
              </div>
              <div className="mt-2 font-heading text-sm tracking-[0.3em] text-muted-foreground">
                Winner: {room.winner}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prompt */}
      <div className="mt-6 rune-frame p-6">
        <div className="font-mono text-lg leading-relaxed">
          {prompt.split("").map((ch, i) => {
            let cls = "text-muted-foreground";
            if (i < typed.length) cls = typed[i] === ch ? "text-primary" : "bg-destructive/40 text-foreground";
            if (i === typed.length && !finished) cls = "border-l-2 border-primary text-muted-foreground animate-pulse";
            return (
              <span key={i} className={cls}>
                {ch}
              </span>
            );
          })}
        </div>
        <p className="mt-4 text-xs tracking-widest text-muted-foreground">
          {finished ? "Awaiting result…" : "Type fast — correct keys punch, mistakes get you hit. 5+ combo unleashes a special."}
        </p>
        <input
          ref={inputRef}
          value={typed}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          autoFocus
          aria-label="Type the passage"
        />
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Errors typed so far: {errors}. If focus is lost, click the prompt.
      </p>

      {/* Refocus overlay click */}
      <div className="fixed inset-0 -z-10" onClick={() => inputRef.current?.focus()} />
    </div>
  );
}

function PlayerHud({
  side,
  name,
  char,
  health,
  progress,
  wpm,
  acc,
  accent,
}: {
  side: "left" | "right";
  name: string;
  char: ReturnType<typeof characterById>;
  health: number;
  progress: number;
  wpm: number;
  acc: number;
  accent: "primary" | "destructive";
}) {
  const color = accent === "primary" ? "text-primary" : "text-destructive";
  const healthColor =
    health > 60
      ? "bg-[oklch(0.75_0.22_140)]"
      : health > 30
        ? "bg-[oklch(0.82_0.22_85)]"
        : "bg-destructive";
  return (
    <div className={`${side === "right" ? "text-right" : "text-left"}`}>
      <div className={`flex items-center gap-3 ${side === "right" ? "flex-row-reverse" : ""}`}>
        {char && (
          <img src={char.image} alt={char.name} className="h-14 w-14 border-2 border-primary/60 object-cover shadow-[0_0_18px_var(--emerald-glow)]" />
        )}
        <div>
          <div className={`font-display text-sm tracking-widest ${color}`}>{name}</div>
          <div className="text-[10px] tracking-widest text-muted-foreground">{char?.name ?? "—"}</div>
        </div>
      </div>
      {/* Health bar with skew for arcade look */}
      <div
        className={`relative mt-2 h-4 w-full overflow-hidden border border-primary/40 bg-input/80 ${
          side === "right" ? "" : ""
        }`}
        style={{ transform: side === "right" ? "skewX(12deg)" : "skewX(-12deg)" }}
      >
        <div
          className={`h-full ${healthColor} transition-all duration-200`}
          style={{
            width: `${health}%`,
            marginLeft: side === "right" ? `${100 - health}%` : 0,
            boxShadow: "0 0 12px currentColor",
          }}
        />
      </div>
      <div className={`mt-1 flex ${side === "right" ? "justify-end" : "justify-start"} gap-3 font-mono text-[10px] ${color}`}>
        <span>HP {Math.round(health)}</span>
        <span className="text-muted-foreground">{wpm} WPM · {acc}% ACC · {progress}%</span>
      </div>
    </div>
  );
}

function ComboMeter({ combo, flash }: { combo: number; flash: number }) {
  const pct = Math.min(100, (combo / 10) * 100);
  return (
    <div className="flex flex-col items-center">
      <div className="font-display text-[10px] tracking-[0.3em] text-muted-foreground">COMBO</div>
      <div
        key={flash}
        className="fx-combo-pop mt-1 font-display text-3xl leading-none text-glow"
        style={{ color: combo >= 5 ? "oklch(0.9 0.25 60)" : "oklch(0.75 0.18 165)" }}
      >
        ×{combo}
      </div>
      <div className="mt-1 h-1.5 w-24 overflow-hidden border border-primary/40 bg-input/60">
        <div
          className="h-full transition-all duration-150"
          style={{
            width: `${pct}%`,
            background:
              combo >= 5
                ? "linear-gradient(90deg, oklch(0.9 0.25 60), oklch(0.75 0.28 30))"
                : "linear-gradient(90deg, var(--emerald-glow), var(--primary))",
            boxShadow: "0 0 12px currentColor",
          }}
        />
      </div>
    </div>
  );
}

function FighterFX({
  side,
  progress,
  char,
  accent,
  attackKey,
  hurtKey,
}: {
  side: "left" | "right";
  progress: number;
  char: ReturnType<typeof characterById>;
  accent: "primary" | "destructive";
  attackKey: number;
  hurtKey: number;
}) {
  // Latest key wins the animation slot
  const isAttacking = attackKey > 0 && attackKey >= hurtKey;
  const isHurt = hurtKey > 0 && hurtKey > attackKey;
  const glowClass =
    accent === "primary"
      ? "shadow-[0_0_35px_var(--emerald-glow)]"
      : "shadow-[0_0_35px_oklch(0.7_0.28_25)]";
  const offset = `${side === "left" ? 22 + progress * 0.25 : 78 - progress * 0.25}%`;

  const animClass = isHurt
    ? side === "left"
      ? "fx-hurt"
      : "fx-hurt-right"
    : isAttacking
      ? side === "left"
        ? "fx-attack-left"
        : "fx-attack-right"
      : side === "right"
        ? "scale-x-[-1]"
        : "";

  return (
    <div
      className="absolute bottom-4 -translate-x-1/2 transition-all duration-200"
      style={{ left: offset }}
    >
      <div
        key={`${attackKey}-${hurtKey}`}
        className={`relative ${animClass}`}
        style={{ transformOrigin: "bottom center" }}
      >
        {char ? (
          <img
            src={char.image}
            alt={char.name}
            className={`h-56 w-36 border-2 border-primary/60 object-cover ${glowClass}`}
          />
        ) : (
          <div className={`h-56 w-36 border-2 border-primary/60 ${glowClass}`} />
        )}
        {/* ground reflection */}
        <div className="absolute -bottom-3 left-1/2 h-3 w-24 -translate-x-1/2 rounded-full bg-primary/40 blur-md" />
      </div>
    </div>
  );
}

function _UnusedFighter({
  side,
  progress,
  char,
  accent,
}: {
  side: "left" | "right";
  progress: number;
  char: ReturnType<typeof characterById>;
  accent: "primary" | "destructive";
}) {
  const glowClass = accent === "primary" ? "shadow-[0_0_25px_var(--emerald-glow)]" : "shadow-[0_0_25px_oklch(0.65_0.24_25)]";
  // Move toward center as progress grows
  const offset = `${side === "left" ? 10 + progress * 0.35 : 90 - progress * 0.35}%`;
  return (
    <div
      className="absolute bottom-4 -translate-x-1/2 transition-all duration-200"
      style={{ left: offset }}
    >
      {char ? (
        <img
          src={char.image}
          alt={char.name}
          className={`h-52 w-32 border border-primary/40 object-cover ${glowClass} ${side === "right" ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className={`h-52 w-32 border border-primary/40 ${glowClass}`} />
      )}
    </div>
  );
}

function ResultScreen({ room, isHost, code, playerId }: { room: Room; isHost: boolean; code: string; playerId: string }) {
  const myName = isHost ? room.host_name : room.guest_name;
  const won = room.winner === myName;
  const myWpm = isHost ? room.host_wpm : room.guest_wpm;
  const myAcc = isHost ? room.host_acc : room.guest_acc;
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current || !myName) return;
    reported.current = true;
    submitResultFn({
      data: { playerId, name: myName, won, wpm: myWpm, acc: myAcc },
    }).catch(() => {});
  }, [myName, won, myWpm, myAcc, playerId]);

  async function rematch() {
    if (!isHost) return;
    await updateRoomFn({
      data: {
        playerId,
        code,
        patch: {
          phase: "character",
          host_character: null,
          guest_character: null,
          place: null,
          prompt: null,
          host_progress: 0,
          guest_progress: 0,
          host_wpm: 0,
          guest_wpm: 0,
          host_acc: 100,
          guest_acc: 100,
          winner: null,
          started_at: null,
        },
      },
    }).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rune-frame p-10 text-center">
        <div className="font-display text-6xl tracking-widest text-primary text-glow">
          {won ? "VICTORY" : "DEFEAT"}
        </div>
        <p className="mt-4 font-heading text-sm tracking-[0.3em] text-muted-foreground">
          Winner: {room.winner}
        </p>
        <div className="mt-8 grid grid-cols-2 gap-6 font-mono text-sm">
          <div>
            <div className="text-muted-foreground">YOUR WPM</div>
            <div className="mt-1 font-display text-3xl text-primary">{myWpm}</div>
          </div>
          <div>
            <div className="text-muted-foreground">ACCURACY</div>
            <div className="mt-1 font-display text-3xl text-primary">{myAcc}%</div>
          </div>
        </div>
        <div className="mt-10 flex justify-center gap-4">
          {isHost && (
            <button onClick={rematch} className="btn-fantasy">
              Rematch
            </button>
          )}
          <Link to="/lobby" className="btn-fantasy">
            Leave Arena
          </Link>
        </div>
      </div>
    </div>
  );
}