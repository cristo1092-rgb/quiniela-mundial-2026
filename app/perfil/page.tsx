"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { ref, onValue, set } from "firebase/database";
import { Prediction, Result, calcRanking, calcMatchPoints } from "@/lib/scoring";
import { isFirebaseConfigured, getLocalResults } from "@/lib/localFallback";
import { MATCHES, GROUP_STAGES, KNOCKOUT_STAGES } from "@/lib/matches";

export const AVATARS = [
  "⚽","🏆","🦁","🐯","🦊","🐺","🦅","🦋","🔥","💎","🌟","🚀",
  "🎯","🎸","🌈","🧩","🐉","🦄","🏄","🎩","🧠","🍀","👑","⚡",
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

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className={`bg-white rounded-xl border-2 ${color} p-4 text-center`}>
      <div className="text-3xl font-black text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
    </div>
  );
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

  useEffect(() => {
    const stored = localStorage.getItem("quinielaPlayer");
    const authed = localStorage.getItem("quinielaPlayerAuth");
    if (stored && authed === "true") {
      setPlayerName(stored);
      // Load avatar from localStorage first
      const storedAvatar = localStorage.getItem(`quinielaAvatar_${stored}`);
      if (storedAvatar) setAvatar(storedAvatar);
    } else router.replace("/entrar");
    setChecked(true);
  }, [router]);

  useEffect(() => {
    setResults(getLocalResults());
    if (!isFirebaseConfigured()) return;
    const unsubR = onValue(ref(db, "results"), (snap) => {
      setResults({ ...getLocalResults(), ...(snap.val() ?? {}) });
    });
    const unsubP = onValue(ref(db, "predictions"), (snap) => {
      setPredictions(snap.val() ?? {});
    });
    return () => { unsubR(); unsubP(); };
  }, []);

  // Load avatar from Firebase when playerName is set
  useEffect(() => {
    if (!playerName || !isFirebaseConfigured()) return;
    const unsub = onValue(ref(db, `avatars/${playerName}`), (snap) => {
      const val = snap.val();
      if (val) { setAvatar(val); localStorage.setItem(`quinielaAvatar_${playerName}`, val); }
    });
    return unsub;
  }, [playerName]);

  if (!checked || !playerName) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // My predictions
  const myPreds = predictions[playerName] ?? {};
  const allScores = calcRanking(predictions, results);
  const myRankEntry = allScores.find((s) => s.name === playerName);
  const myRank = myRankEntry ? allScores.indexOf(myRankEntry) + 1 : null;

  // Detailed stats
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

  // Points per jornada
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

  async function handleSelectAvatar(emoji: string) {
    setAvatar(emoji);
    setShowPicker(false);
    if (playerName) {
      localStorage.setItem(`quinielaAvatar_${playerName}`, emoji);
      if (isFirebaseConfigured()) {
        await set(ref(db, `avatars/${playerName}`), emoji);
      }
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
      {/* Header */}
      <div className="rounded-2xl overflow-hidden shadow-lg">
        <div className="h-1.5 flex">
          <div className="flex-1 bg-[#e91e8c]" />
          <div className="flex-1 bg-[#f97316]" />
          <div className="flex-1 bg-[#facc15]" />
          <div className="flex-1 bg-[#84cc16]" />
          <div className="flex-1 bg-[#06b6d4]" />
          <div className="flex-1 bg-[#3b82f6]" />
        </div>
        <div className="bg-gradient-to-br from-green-700 to-green-900 px-6 py-5">
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
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setShowPicker((v) => !v)}
                className="w-16 h-16 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-white/30 flex items-center justify-center text-4xl transition-all active:scale-95"
                title="Cambiar avatar"
              >
                {avatar}
              </button>
              <span className="text-[10px] text-green-300 font-medium">
                {savedAvatar ? "✓ Guardado" : "Cambiar"}
              </span>
            </div>
          </div>

          {/* Avatar picker */}
          {showPicker && (
            <div className="mt-4 bg-white/10 backdrop-blur rounded-xl p-3">
              <p className="text-green-200 text-xs font-semibold mb-2">Elige tu avatar:</p>
              <div className="grid grid-cols-8 gap-2">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSelectAvatar(emoji)}
                    className={`text-2xl p-1.5 rounded-lg transition-all active:scale-90 ${
                      avatar === emoji
                        ? "bg-white/30 ring-2 ring-white scale-110"
                        : "bg-white/10 hover:bg-white/20"
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

      {/* Stats grid */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Estadísticas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard value={predicted} label="Partidos predichos" color="border-blue-200" />
          <StatCard value={`${exact} ⭐`} label="Exactas (+5pts)" color="border-yellow-300" />
          <StatCard value={`${correct} ✓`} label="Correctas (+3pts)" color="border-green-300" />
          <StatCard value={`${wrong} ✗`} label="Falladas" color="border-red-200" />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <StatCard value={myRankEntry?.points ?? 0} label="Puntos totales" color="border-purple-200" />
          <StatCard value={favScore} label="Marcador favorito" color="border-gray-200" />
        </div>
      </div>

      {/* Points por jornada */}
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
                <div className="text-right">
                  <span className={`text-lg font-black ${pts > 0 ? "text-green-600" : "text-gray-300"}`}>
                    {pts} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-col gap-3">
        <Link
          href="/quiniela"
          className="bg-gray-900 text-white font-bold text-center py-3 rounded-xl hover:bg-gray-800 transition-colors text-sm"
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
