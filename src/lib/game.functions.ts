import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const idSchema = z.string().min(4).max(64);
const nameSchema = z.string().trim().min(1).max(24);
const codeSchema = z.string().regex(/^[A-Z0-9]{4}$/);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const createRoomFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ playerId: idSchema, name: nameSchema, code: codeSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const s = await admin();
    const { error } = await s.from("game_rooms").insert({
      code: data.code,
      host_id: data.playerId,
      host_name: data.name,
      phase: "waiting",
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const joinRoomFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ playerId: idSchema, name: nameSchema, code: codeSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const s = await admin();
    const { data: room, error } = await s
      .from("game_rooms")
      .select("host_id,guest_id")
      .eq("code", data.code)
      .maybeSingle();
    if (error || !room) throw new Error("Room not found");
    if (room.host_id === data.playerId) return { ok: true as const, role: "host" as const };
    if (room.guest_id && room.guest_id !== data.playerId) throw new Error("Room is full");
    const { error: uErr } = await s
      .from("game_rooms")
      .update({
        guest_id: data.playerId,
        guest_name: data.name,
        phase: "character",
        updated_at: new Date().toISOString(),
      })
      .eq("code", data.code);
    if (uErr) throw new Error(uErr.message);
    return { ok: true as const, role: "guest" as const };
  });

export const getMyRoleFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ playerId: idSchema, code: codeSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const s = await admin();
    const { data: room } = await s
      .from("game_rooms")
      .select("host_id,guest_id")
      .eq("code", data.code)
      .maybeSingle();
    if (!room) return { role: null };
    if (room.host_id === data.playerId) return { role: "host" as const };
    if (room.guest_id === data.playerId) return { role: "guest" as const };
    return { role: null };
  });

const HOST_FIELDS = new Set([
  "host_character",
  "guest_character",
  "place",
  "prompt",
  "phase",
  "started_at",
  "winner",
  "host_progress",
  "host_wpm",
  "host_acc",
  "guest_progress",
  "guest_wpm",
  "guest_acc",
]);
const GUEST_FIELDS = new Set([
  "guest_character",
  "guest_progress",
  "guest_wpm",
  "guest_acc",
  "phase",
  "winner",
]);

export const updateRoomFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        playerId: idSchema,
        code: codeSchema,
        patch: z.record(z.string(), z.any()),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const s = await admin();
    const { data: room } = await s
      .from("game_rooms")
      .select("host_id,guest_id")
      .eq("code", data.code)
      .maybeSingle();
    if (!room) throw new Error("Room not found");
    const role =
      room.host_id === data.playerId
        ? "host"
        : room.guest_id === data.playerId
        ? "guest"
        : null;
    if (!role) throw new Error("Not a participant");
    const allowed = role === "host" ? HOST_FIELDS : GUEST_FIELDS;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data.patch)) {
      if (allowed.has(k)) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) return { ok: true as const };
    patch.updated_at = new Date().toISOString();
    const { error } = await s
      .from("game_rooms")
      .update(patch as never)
      .eq("code", data.code);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const submitResultFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        playerId: idSchema,
        name: nameSchema,
        won: z.boolean(),
        wpm: z.number().int().min(0).max(500),
        acc: z.number().int().min(0).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const s = await admin();
    const { data: existing } = await s
      .from("leaderboard")
      .select("*")
      .eq("name", data.name)
      .maybeSingle();
    if (!existing) {
      const { error } = await s.from("leaderboard").insert({
        name: data.name,
        owner_id: data.playerId,
        wins: data.won ? 1 : 0,
        losses: data.won ? 0 : 1,
        best_wpm: data.wpm,
        best_acc: data.acc,
      } as never);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    }
    const row = existing as unknown as {
      wins: number;
      losses: number;
      best_wpm: number;
      best_acc: number;
      owner_id: string | null;
    };
    if (row.owner_id && row.owner_id !== data.playerId) {
      return { ok: false as const, reason: "name_taken" as const };
    }
    const { error } = await s
      .from("leaderboard")
      .update({
        owner_id: data.playerId,
        wins: row.wins + (data.won ? 1 : 0),
        losses: row.losses + (data.won ? 0 : 1),
        best_wpm: Math.max(row.best_wpm, data.wpm),
        best_acc: Math.max(row.best_acc, data.acc),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("name", data.name);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });