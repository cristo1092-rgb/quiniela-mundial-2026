"use client";
import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Prediction, Result, calcRanking, calcMatchPoints, PlayerScore } from "@/lib/scoring";
import { isFirebaseConfigured, getLocalResults } from "@/lib/localFallback";
import { getCurrentJornada, getJornadaMatches, JORNADA_LABELS, Jornada } from "@/lib/matches";
import { computeAutoKnockoutTeams } from "@/lib/standings";
import RankingTable from "@/components/RankingTable";
import PullToRefresh from "@/components/PullToRefresh";

export default function RankingPage() {
  const [predictions, setPredictions] = useState<Record<string, Record<string, Prediction>>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [currentPlayer, setCurrentPlayer] = useState<string | undefined>();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = localStorage.getItem("quinielaPlayer");
    if (stored) setCurrentPlayer(stored);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const unsub = onValue(ref(db, "predictions"), (snap) => {
      setPredictions(snap.val() ?? {});
      setLastUpdate(new Date());
    });
    return unsub;
  }, []);

  useEffect(() => {
    const storageHandler = (e: StorageEvent) => {
      if (e.key === "quiniela_results") {
        setResults(getLocalResults());
        setLastUpdate(new Date());
      }
    };

    if (!isFirebaseConfigured()) {
      setResults(getLocalResults());
      window.addEventListener("storage", storageHandler);
      return () => window.removeEventListener("storage", storageHandler);
    }

    const unsubAv = onValue(ref(db, "avatars"), (snap) => {
      setAvatars(snap.val() ?? {});
    });

    const unsub = onValue(ref(db, "results"), (snap) => {
      setResults(snap.val() ?? {});
      setLastUpdate(new Date());
    });
    return () => { unsub(); unsubAv(); window.removeEventListener("storage", storageHandler); };
  }, []);

  const [view, setView] = useState<"total" | Jornada>("total");

  const knockoutTeams = useMemo(() => computeAutoKnockoutTeams(results).teams, [results]);

  function resultsOfJornada(j: Jornada): Record<string, Result> {
    const ids = new Set(getJornadaMatches(j).map((m) => m.id));
    return Object.fromEntries(Object.entries(results).filter(([id]) => ids.has(id)));
  }

  const viewResults = view === "total" ? results : resultsOfJornada(view);
  const scores: PlayerScore[] = calcRanking(predictions, viewResults);
  const resultsCount = Object.keys(results).length;

  // Movement arrows (Total view): current rank vs. rank excluding current jornada's results
  const movement: Record<string, number> = (() => {
    if (view !== "total") return {};
    const currentJ = getCurrentJornada();
    const currentJResults = resultsOfJornada(currentJ);
    if (Object.keys(currentJResults).length === 0) return {};
    const prevResults: Record<string, Result> = {};
    for (const [matchId, r] of Object.entries(results)) {
      if (!currentJResults[matchId]) prevResults[matchId] = r;
    }
    // Sin resultados previos no hay ranking base — las flechas serían ruido
    if (Object.keys(prevResults).length === 0) return {};
    const prevScores = calcRanking(predictions, prevResults);
    const deltas: Record<string, number> = {};
    scores.forEach((s, i) => {
      const prevIdx = prevScores.findIndex((p) => p.name === s.name);
      if (prevIdx >= 0) deltas[s.name] = prevIdx - i;
    });
    return deltas;
  })();

  // Compute MVP per jornada (all phases with at least one result)
  const mvps = (["elim", 3, 2, 1] as const).flatMap((j) => {
    const jMatchIds = getJornadaMatches(j).map((m) => m.id);
    if (!jMatchIds.some((id) => results[id])) return [];
    let best: { player: string; points: number } | null = null;
    for (const [player, preds] of Object.entries(predictions)) {
      let pts = 0;
      for (const id of jMatchIds) {
        const pred = preds[id];
        const result = results[id];
        if (pred && result) pts += calcMatchPoints(pred, result);
      }
      if (!best || pts > best.points) best = { player, points: pts };
    }
    return best && best.points > 0 ? [{ ...best, jornada: j, label: JORNADA_LABELS[j] }] : [];
  });

  return (
    <PullToRefresh onRefresh={() => new Promise(r => setTimeout(r, 600))}>
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Ranking</h2>
          {scores.length > 0 && (
            <button
              onClick={() => {
                const medal = ["🥇","🥈","🥉"];
                const lines = scores.map((s, i) =>
                  `${medal[i] ?? `${i+1}.`} ${s.name} — ${s.points} pts`
                ).join("\n");
                const text = `🏆 *Office Bet Friends* · Mundial 2026\n\n${lines}\n\n⚽ ${resultsCount} partido${resultsCount !== 1 ? "s" : ""} jugado${resultsCount !== 1 ? "s" : ""}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
              }}
              className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20b858] text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Compartir
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-gray-500 text-sm">{scores.length} jugadores · {resultsCount} resultados</p>
          <div className="flex items-center gap-1 text-xs text-green-600">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Live
          </div>
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              · {lastUpdate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* Premio */}
      <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-4 mb-5 shadow-md">
        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-900/70 mb-3">🏆 Premio final</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/20 rounded-xl py-2 px-1">
            <p className="text-xl">🥇</p>
            <p className="text-lg font-black text-white leading-tight">$6,300</p>
            <p className="text-[10px] text-yellow-900/70 font-semibold">70%</p>
          </div>
          <div className="bg-white/20 rounded-xl py-2 px-1">
            <p className="text-xl">🥈</p>
            <p className="text-lg font-black text-white leading-tight">$1,800</p>
            <p className="text-[10px] text-yellow-900/70 font-semibold">20%</p>
          </div>
          <div className="bg-white/20 rounded-xl py-2 px-1">
            <p className="text-xl">🥉</p>
            <p className="text-lg font-black text-white leading-tight">$900</p>
            <p className="text-[10px] text-yellow-900/70 font-semibold">10%</p>
          </div>
        </div>
      </div>

      {/* View selector: total vs por jornada / eliminatorias */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {([["total", "Total"], [1, "J1"], [2, "J2"], [3, "J3"], ["elim", "Elim"]] as const).map(([v, label]) => (
          <button
            key={String(v)}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
              view === v
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
        {view !== "total" && (
          <span className="text-xs text-gray-400 ml-1">
            Solo puntos de {view === "elim" ? "Eliminatorias" : `Jornada ${view}`}
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <RankingTable scores={scores} currentPlayer={currentPlayer} allPredictions={predictions} results={viewResults} avatars={avatars} movement={movement} knockoutTeams={knockoutTeams} />
      </div>

      {scores.length === 0 && resultsCount === 0 && (
        <p className="text-center text-gray-400 text-sm mt-4">
          El ranking mostrará puntos una vez que el admin cargue resultados.
        </p>
      )}

      {/* MVP cards — one per jornada with results, at the bottom */}
      {mvps.length > 0 && (
        <div className={`grid gap-3 mt-6 ${mvps.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {mvps.map((m) => (
            <div key={m.jornada} className="rounded-2xl overflow-hidden shadow-md">
              <div className="h-1 flex">
                <div className="flex-1 bg-[#facc15]" />
                <div className="flex-1 bg-[#f97316]" />
                <div className="flex-1 bg-[#e91e8c]" />
              </div>
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-900/70 truncate">⭐ MVP — {m.label}</p>
                  <p className="text-lg font-black text-white mt-0.5 truncate">{m.player}</p>
                  <p className="text-xs text-yellow-900/80 font-semibold">{m.points} pts</p>
                </div>
                <span className="text-3xl select-none ml-2 flex-shrink-0">🏆</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
