"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { ref, onValue, set } from "firebase/database";
import { Prediction, Result, calcRanking, calcMatchPoints } from "@/lib/scoring";
import { isFirebaseConfigured, getLocalResults } from "@/lib/localFallback";
import { MATCHES, GROUP_STAGES, KNOCKOUT_STAGES } from "@/lib/matches";

export const AVATARS = [
  // ⚽ Fútbol
  "⚽","🥅","🧤","👟","🥾","🏟️","🎽","🦵","🧦","🏃","🤸","🦶",
  // 🌍 Países
  "🇲🇽","🇧🇷","🇦🇷","🇩🇪","🇫🇷","🇪🇸","🇵🇹","🏴󠁧󠁢󠁥󠁮󠁧󠁿","🇺🇸","🇯🇵","🇮🇹","🇳🇱",
  // 😂 Dramáticos
  "🤌","😤","🤯","🥹","😭","🤬","🫣","🤡","😈","🥶","🫠","🤦","🙈","💀",
  // 🏆 Gloria & memes
  "🏆","🥇","👑","🔥","🧠","🐐","⚡","💎","🎯","🎪",
  // 🐾 Animales
  "🦁","🐯","🦊","🦅",
];

const JORNADA_RANGES: Record<1 | 2 | 3, [string, string]> = {
  1: ["2026-06-11", "2026-06-17"],
  2: ["2026-06-18", "2026-06-24"],
  3: ["2026-06-25", "2026-06-27"],
};
const JORNADA_LABELS: Record<1 | 2 | 3 | "elim", string> = {
  1: "Jornada 1", 2: "Jornada 2", 3: "Jornada 3", elim: "Eliminatorias",
};

function getJornadaMatchIds(j: 1 | 2 | 3 | "elim"): string[] {
  if (j === "elim") {
    return MATCHES.filter((m) => KNOCKOUT_STAGES.includes(m.stage as typeof KNOCKOUT_STAGES[number])).map((m) => m.id);
  }
  const [start, end] = JORNADA_RANGES[j];
  return MATCHES.filter((m) =>
    GROUP_STAGES.includes(m.stage as typeof GROUP_STAGES[number]) && m.date >= start && m.date <= end
  ).map((m) => m.id);
}

export default function PerfilPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, Record<string, Prediction>>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [checked, setChecked] = useState(false);
  const [avatar, setAvatar] = useState<string>("⚽");
  const [showPicker, setShowPicker] = useState(false);
  const [savedAvatar, setSavedAvatar] = useState(false);
  // P1: badges persisted in Firebase
  const [savedBadges, setSavedBadges] = useState<Record<string, true>>({});
  const pickerRef = useRef<HTMLDivElement>(null);
  const writtenBadgesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem("quinielaPlayer");
    const authed = localStorage.getItem("quinielaPlayerAuth");
    if (stored && authed === "true") {
      setPlayerName(stored);
      const storedAvatar = localStorage.getItem(`quinielaAvatar_${stored}`);
      if (storedAvatar) setAvatar(storedAvatar);
    } else router.replace("/entrar");
    setChecked(true);
  }, [router]);

  useEffect(() => {
    if (!isFirebaseConfigured()) { setResults(getLocalResults()); return; }
    const unsubR = onValue(ref(db, "results"), (snap) => { setResults(snap.val() ?? {}); });
    const unsubP = onValue(ref(db, "predictions"), (snap) => { setPredictions(snap.val() ?? {}); });
    return () => { unsubR(); unsubP(); };
  }, []);

  useEffect(() => {
    if (!playerName || !isFirebaseConfigured()) return;
    return onValue(ref(db, `avatars/${playerName}`), (snap) => {
      const val = snap.val();
      if (val) { setAvatar(val); localStorage.setItem(`quinielaAvatar_${playerName}`, val); }
    });
  }, [playerName]);

  // P1: load persisted badges
  useEffect(() => {
    if (!playerName || !isFirebaseConfigured()) return;
    return onValue(ref(db, `badges/${playerName}`), (snap) => {
      setSavedBadges(snap.val() ?? {});
    });
  }, [playerName]);

  useEffect(() => {
    if (!showPicker) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [showPicker]);

  if (!checked || !playerName) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Computations ─────────────────────────────────────────────────────────────

  const myPreds = predictions[playerName] ?? {};
  const allScores = calcRanking(predictions, results);
  const myRankEntry = allScores.find((s) => s.name === playerName);
  const myRank = myRankEntry ? allScores.indexOf(myRankEntry) + 1 : null;

  let exact = 0, correct = 0, wrong = 0, predicted = 0;
  const scoreCounts: Record<string, number> = {};
  for (const [matchId, pred] of Object.entries(myPreds)) {
    const result = results[matchId];
    predicted++;
    const scoreKey = `${pred.g1}-${pred.g2}`;
    scoreCounts[scoreKey] = (scoreCounts[scoreKey] ?? 0) + 1;
    if (!result) continue;
    const pts = calcMatchPoints(pred, result);
    if (pts === 5) exact++;
    else if (pts === 3) correct++;
    else wrong++;
  }

  const favScore = Object.entries(scoreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const resultsCount = Object.keys(results).length;

  const craziestEntry = Object.entries(myPreds)
    .map(([id, p]) => ({ id, p, total: p.g1 + p.g2 }))
    .sort((a, b) => b.total - a.total)[0];
  const craziestMatch = craziestEntry && craziestEntry.total >= 4
    ? MATCHES.find((m) => m.id === craziestEntry.id)
    : null;

  const myRankIdx = myRank != null ? myRank - 1 : -1;
  const rivalAbove = myRankIdx > 0 ? allScores[myRankIdx - 1] : null;
  const rivalBelow = myRankIdx >= 0 && myRankIdx < allScores.length - 1 ? allScores[myRankIdx + 1] : null;

  const jornadaPoints = ([1, 2, 3, "elim"] as const).map((j) => {
    const ids = getJornadaMatchIds(j);
    let pts = 0, played = 0;
    for (const id of ids) {
      const pred = myPreds[id];
      const result = results[id];
      if (pred && result) { pts += calcMatchPoints(pred, result); played++; }
    }
    return { label: JORNADA_LABELS[j], pts, played, total: ids.length, predicted: ids.filter((id) => myPreds[id]).length };
  });

  const badges = [
    {
      id: "sniper",
      emoji: "🎯",
      label: "Francotirador",
      desc: "5 marcadores exactos",
      req: "Necesitas 5 exactas",
      earned: exact >= 5,
    },
    {
      id: "goleador",
      emoji: "💥",
      label: "Goleador",
      desc: "Predijiste y acertaste un partido con 5+ goles totales",
      req: "Acierta un partido con 5+ goles",
      earned: (() => {
        for (const [id, pred] of Object.entries(myPreds)) {
          const result = results[id];
          if (result && pred.g1 + pred.g2 >= 5 && calcMatchPoints(pred, result) >= 3) return true;
        }
        return false;
      })(),
    },
    {
      id: "impecable",
      emoji: "💎",
      label: "Impecable",
      desc: "Predijiste todos los partidos de una jornada y los acertaste todos",
      req: "Predice y acierta toda una jornada",
      earned: jornadaPoints.some((j) => j.played > 0 && j.played === j.total && j.pts === j.played * 3),
    },
    {
      id: "goat",
      emoji: "🐐",
      label: "El GOAT",
      desc: "Lideraste el ranking",
      req: "Llega al primer lugar",
      earned: myRank === 1,
    },
    {
      id: "champ",
      emoji: "🏆",
      label: "Campeón",
      desc: "Ganaste el torneo",
      req: "Gana el torneo completo",
      earned: false,
    },
  ];

  // P1: auto-save newly earned badges to Firebase (fire-and-forget)
  for (const badge of badges) {
    if (badge.earned && !savedBadges[badge.id] && !writtenBadgesRef.current.has(badge.id) && isFirebaseConfigured()) {
      writtenBadgesRef.current.add(badge.id);
      void set(ref(db, `badges/${playerName}/${badge.id}`), true);
    }
  }

  // P3: separate earned vs locked using persisted + current state
  const earnedBadges = badges.filter((b) => b.earned || !!savedBadges[b.id]);
  const lockedBadges = badges.filter((b) => !b.earned && !savedBadges[b.id]);

  async function handleSelectAvatar(emoji: string) {
    setAvatar(emoji);
    setShowPicker(false);
    if (playerName) {
      localStorage.setItem(`quinielaAvatar_${playerName}`, emoji);
      if (isFirebaseConfigured()) await set(ref(db, `avatars/${playerName}`), emoji);
    }
    setSavedAvatar(true);
    setTimeout(() => setSavedAvatar(false), 1500);
  }

  function handleLogout() {
    localStorage.removeItem("quinielaPlayer");
    localStorage.removeItem("quinielaPlayerAuth");
    router.replace("/entrar");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl shadow-lg">
        <div className="h-1.5 flex rounded-t-2xl overflow-hidden">
          <div className="flex-1 bg-[#e91e8c]" />
          <div className="flex-1 bg-[#f97316]" />
          <div className="flex-1 bg-[#facc15]" />
          <div className="flex-1 bg-[#84cc16]" />
          <div className="flex-1 bg-[#06b6d4]" />
          <div className="flex-1 bg-[#3b82f6]" />
        </div>
        <div className="bg-gradient-to-br from-green-700 to-green-900 px-6 py-5 rounded-b-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-green-300 text-xs font-bold uppercase tracking-widest">Mi perfil</p>
              <h1 className="text-2xl font-black text-white mt-1 truncate">{playerName}</h1>
              {myRank && myRankEntry && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-lg">{myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "🏅"}</span>
                  <span className="text-sm text-green-100 font-semibold">
                    Posición {myRank} de {allScores.length} · {myRankEntry.points} pts
                  </span>
                </div>
              )}
            </div>
            {/* Avatar selector */}
            <div ref={pickerRef} className="relative flex-shrink-0">
              <button
                onClick={() => setShowPicker((v) => !v)}
                className="w-16 h-16 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-white/30 flex items-center justify-center text-4xl transition-all active:scale-95"
                title="Cambiar avatar"
              >
                {avatar}
              </button>
              <span className="block text-center text-[10px] text-green-300 font-medium mt-1">
                {savedAvatar ? "✓ Guardado" : "Cambiar"}
              </span>
              {showPicker && (
                <div className="absolute top-full right-0 mt-2 bg-gray-900 rounded-2xl shadow-2xl p-3 z-50" style={{ width: "272px" }}>
                  <p className="text-gray-400 text-xs font-semibold mb-2 uppercase tracking-wide">Elige tu avatar</p>
                  <div className="grid grid-cols-8 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                    {AVATARS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleSelectAvatar(emoji)}
                        className={`text-2xl p-1 rounded-lg transition-all active:scale-90 ${
                          avatar === emoji ? "bg-white/25 ring-2 ring-white" : "hover:bg-white/10"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── P2: Stats compactas ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-gray-900">{myRankEntry?.points ?? 0}</span>
            <span className="text-sm text-gray-400">pts</span>
          </div>
          {myRank && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              <span>{myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "🏅"}</span>
              <span className="text-sm font-bold text-gray-600">#{myRank} de {allScores.length}</span>
            </div>
          )}
        </div>
        <div className="h-px bg-gray-100 mb-4" />
        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          <div>
            <p className="text-2xl font-black text-yellow-500">{exact}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">⭐ Exactas</p>
          </div>
          <div>
            <p className="text-2xl font-black text-green-600">{correct}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">✓ Correctas</p>
          </div>
          <div>
            <p className="text-2xl font-black text-red-400">{wrong}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">✗ Falladas</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{predicted} partidos predichos</span>
          <span>Favorita: <span className="font-bold text-gray-700">{favScore}</span></span>
        </div>
      </div>

      {/* ── P4: Puntos por jornada ───────────────────────────────────────────── */}
      {resultsCount > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Puntos por jornada</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {jornadaPoints.map(({ label, pts, played, total, predicted: jorPred }) => (
              <div key={label} className="flex items-center px-4 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{jorPred}/{total} predichos · {played} con resultado</p>
                </div>
                <span className={`text-lg font-black ${pts > 0 ? "text-green-600" : "text-gray-300"}`}>
                  {pts} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── P3 + P4: Insignias ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Insignias</h2>

        {earnedBadges.length === 0 && lockedBadges.length === 0 ? null : (
          <>
            {/* Earned */}
            {earnedBadges.length > 0 && (
              <div className="space-y-2 mb-3">
                {earnedBadges.map((badge) => (
                  <div key={badge.id} className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-3xl flex-shrink-0">{badge.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-800">{badge.label}</p>
                      <p className="text-xs text-gray-500 leading-snug mt-0.5">{badge.desc}</p>
                    </div>
                    <span className="text-yellow-500 text-lg flex-shrink-0">⭐</span>
                  </div>
                ))}
              </div>
            )}

            {/* Locked — compact chips */}
            {lockedBadges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {lockedBadges.map((badge) => (
                  <div key={badge.id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-lg grayscale opacity-40">{badge.emoji}</span>
                    <span className="text-xs font-semibold text-gray-400">{badge.label}</span>
                    <span className="text-[10px] text-gray-300">🔒</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── P4: Rivales directos ────────────────────────────────────────────── */}
      {(rivalAbove || rivalBelow) && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Rivales directos</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {rivalAbove && (
              <div className="flex items-center px-4 py-3 gap-3">
                <span className="text-orange-400 text-lg">▲</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{rivalAbove.name}</p>
                  <p className="text-xs text-gray-400">{rivalAbove.points} pts</p>
                </div>
                <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
                  +{rivalAbove.points - (myRankEntry?.points ?? 0)} pts arriba
                </span>
              </div>
            )}
            {rivalBelow && (
              <div className="flex items-center px-4 py-3 gap-3">
                <span className="text-blue-400 text-lg">▼</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{rivalBelow.name}</p>
                  <p className="text-xs text-gray-400">{rivalBelow.points} pts</p>
                </div>
                <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                  {(myRankEntry?.points ?? 0) - rivalBelow.points} pts adelante
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── P4: Predicción más loca (decorativa, al fondo) ──────────────────── */}
      {craziestMatch && craziestEntry && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-3xl flex-shrink-0">🤡</span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-0.5">Tu predicción más loca</p>
            <p className="font-black text-gray-900 text-sm truncate">
              {craziestMatch.homeTeam} {craziestEntry.p.g1} – {craziestEntry.p.g2} {craziestMatch.awayTeam}
            </p>
            <p className="text-xs text-amber-600">{craziestEntry.total} goles totales 🔥</p>
          </div>
        </div>
      )}

      {/* ── Acciones ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <Link
          href="/quiniela"
          className="bg-green-600 text-white font-bold text-center py-3 rounded-xl hover:bg-green-700 transition-colors text-sm"
        >
          Ir a mis partidos →
        </Link>
        <button
          onClick={handleLogout}
          className="border border-red-200 text-red-500 hover:bg-red-50 font-medium text-center py-3 rounded-xl transition-colors text-sm"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
