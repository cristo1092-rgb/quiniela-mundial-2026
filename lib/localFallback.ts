/**
 * localStorage fallback for when Firebase is not yet configured.
 * Also used to persist data in the same browser session while testing.
 */

import { Prediction, Result, KnockoutDecision } from "./scoring";

export function isFirebaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "";
  return url.length > 0 && !url.includes("your_");
}

// ── Results ────────────────────────────────────────────────────────────────

const RESULTS_KEY = "quiniela_results";

export function getLocalResults(): Record<string, Result> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveLocalResult(matchId: string, result: Result): void {
  const current = getLocalResults();
  current[matchId] = result;
  const serialized = JSON.stringify(current);
  localStorage.setItem(RESULTS_KEY, serialized);
  // Notify other tabs (and same-tab listeners registered on window)
  window.dispatchEvent(
    new StorageEvent("storage", { key: RESULTS_KEY, newValue: serialized })
  );
}

export function deleteLocalResult(matchId: string): void {
  const current = getLocalResults();
  delete current[matchId];
  const serialized = JSON.stringify(current);
  localStorage.setItem(RESULTS_KEY, serialized);
  window.dispatchEvent(
    new StorageEvent("storage", { key: RESULTS_KEY, newValue: serialized })
  );
}

// ── Predictions ────────────────────────────────────────────────────────────

function predictionsKey(playerName: string) {
  return `quiniela_predictions_${playerName}`;
}

export function getLocalPredictions(playerName: string): Record<string, Prediction> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(predictionsKey(playerName)) ?? "{}");
  } catch {
    return {};
  }
}

export function saveLocalPrediction(
  playerName: string,
  matchId: string,
  pred: Prediction
): void {
  const current = getLocalPredictions(playerName);
  current[matchId] = pred;
  localStorage.setItem(predictionsKey(playerName), JSON.stringify(current));
}

export function deleteLocalPrediction(playerName: string, matchId: string): void {
  const current = getLocalPredictions(playerName);
  delete current[matchId];
  localStorage.setItem(predictionsKey(playerName), JSON.stringify(current));
}

// ── Knockout team overrides ────────────────────────────────────────────────

const KO_KEY = "quiniela_knockout";

export function getLocalKnockoutTeams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KO_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveLocalKnockoutTeam(slot: string, value: string): void {
  const current = getLocalKnockoutTeams();
  current[slot] = value;
  const serialized = JSON.stringify(current);
  localStorage.setItem(KO_KEY, serialized);
  window.dispatchEvent(
    new StorageEvent("storage", { key: KO_KEY, newValue: serialized })
  );
}

// ── Knockout winners (penalty advancement) ────────────────────────────────────

const KO_WINNERS_KEY = "quiniela_knockout_winners";

export function getLocalKnockoutWinners(): Record<string, "home" | "away"> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KO_WINNERS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveLocalKnockoutWinner(matchId: string, side: "home" | "away"): void {
  const current = getLocalKnockoutWinners();
  current[matchId] = side;
  const serialized = JSON.stringify(current);
  localStorage.setItem(KO_WINNERS_KEY, serialized);
  window.dispatchEvent(
    new StorageEvent("storage", { key: KO_WINNERS_KEY, newValue: serialized })
  );
}

// ── Knockout Decisions (ET / Penales info) ────────────────────────────────────

const KO_DECISION_KEY = "quiniela_knockout_decisions";

export function getLocalKnockoutDecisions(): Record<string, KnockoutDecision> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KO_DECISION_KEY) ?? "{}"); } catch { return {}; }
}

export function saveLocalKnockoutDecision(matchId: string, decision: KnockoutDecision): void {
  const current = getLocalKnockoutDecisions();
  current[matchId] = decision;
  localStorage.setItem(KO_DECISION_KEY, JSON.stringify(current));
}

// ── Allowed Players (access control) ─────────────────────────────────────────

const PLAYERS_KEY = "quiniela_allowed_players";

export interface AllowedPlayer {
  name: string;
  pin: string | null;   // null = not yet set by player
  addedAt: number;
}

export function getAllowedPlayers(): AllowedPlayer[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PLAYERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addAllowedPlayer(name: string): void {
  const list = getAllowedPlayers();
  if (list.find((p) => p.name.toLowerCase() === name.toLowerCase())) return;
  list.push({ name, pin: null, addedAt: Date.now() });
  const serialized = JSON.stringify(list);
  localStorage.setItem(PLAYERS_KEY, serialized);
  window.dispatchEvent(new StorageEvent("storage", { key: PLAYERS_KEY, newValue: serialized }));
}

export function removeAllowedPlayer(name: string): void {
  const list = getAllowedPlayers().filter(
    (p) => p.name.toLowerCase() !== name.toLowerCase()
  );
  const serialized = JSON.stringify(list);
  localStorage.setItem(PLAYERS_KEY, serialized);
  window.dispatchEvent(new StorageEvent("storage", { key: PLAYERS_KEY, newValue: serialized }));
}

export function setPlayerPin(name: string, pin: string): boolean {
  const list = getAllowedPlayers();
  const idx = list.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
  if (idx === -1) return false;
  list[idx].pin = pin;
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(list));
  return true;
}

export function getPlayerEntry(name: string): AllowedPlayer | null {
  return (
    getAllowedPlayers().find((p) => p.name.toLowerCase() === name.toLowerCase()) ?? null
  );
}

/** Returns true if name is approved AND pin matches */
export function verifyPlayer(name: string, pin: string): boolean {
  const entry = getPlayerEntry(name);
  return !!(entry && entry.pin === pin);
}
