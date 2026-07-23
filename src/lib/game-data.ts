import char1 from "@/assets/char-1.jpg";
import char2 from "@/assets/char-2.jpg";
import char3 from "@/assets/char-3.jpg";
import char4 from "@/assets/char-4.jpg";
import char5 from "@/assets/char-5.jpg";
import char6 from "@/assets/char-6.jpg";
import placeHarbor from "@/assets/place-harbor.jpg";
import placeIsles from "@/assets/place-isles.jpg";
import placeRuins from "@/assets/place-ruins.jpg";

export type Character = {
  id: string;
  name: string;
  title: string;
  image: string;
};

export const CHARACTERS: Character[] = [
  { id: "vex", name: "Vex Corsair", title: "The Duelist", image: char1 },
  { id: "morra", name: "Morra Vale", title: "The Priestess", image: char2 },
  { id: "brann", name: "Brann Hold", title: "The Guardian", image: char3 },
  { id: "shade", name: "The Shade", title: "The Reaver", image: char4 },
  { id: "kira", name: "Kira Fox", title: "The Sorceress", image: char5 },
  { id: "renji", name: "Renji Ora", title: "The Wanderer", image: char6 },
];

export type Place = {
  id: string;
  name: string;
  tagline: string;
  image: string;
};

export const PLACES: Place[] = [
  { id: "harbor", name: "Bilgeport", tagline: "The pirate harbor", image: placeHarbor },
  { id: "isles", name: "Shadow Isles", tagline: "The haunted shrine", image: placeIsles },
  { id: "ruins", name: "Ruined City", tagline: "The gothic cathedral", image: placeRuins },
];

export const PROMPTS: string[] = [
  "Every keystroke is a blow, every mistake an opening. Only the fastest and most accurate typist will leave this arena standing.",
  "Steel your fingers, wanderer. The green mist hungers for the slow. Type true and the shadows will step aside.",
  "Below the ruined city, bells still toll for the last champion. Answer them now, before your rival does.",
  "The tide turns for no one. Cut through the words as a blade cuts salt spray, clean and without hesitation.",
  "Ancient runes wait upon your tongue. Speak them without stutter and the flame at your back will rise.",
  "A duelist keeps rhythm as a heart keeps blood. Lose the beat and the arena will spit you back into the dark.",
];

export function randomPrompt(): string {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const PLAYER_ID_KEY = "ct_player_id";
const PLAYER_NAME_KEY = "ct_player_name";

export function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getPlayerName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PLAYER_NAME_KEY) ?? "";
}

export function setPlayerName(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLAYER_NAME_KEY, name);
}

export function characterById(id: string | null | undefined): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}

export function placeById(id: string | null | undefined): Place | undefined {
  return PLACES.find((p) => p.id === id);
}