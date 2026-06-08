"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Prediction, Result, calcRanking, PlayerScore } from "@/lib/scoring";
import { isFirebaseConfigured, getLocalResults } from "@/lib/localFallback";
import RankingTable from "@/components/RankingTable";

export default function RankingPage() {
  const [predictions, setPredictions] = useState<Record<string, Record<string, Prediction>>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [currentPlayer, setCurrentPlayer] = useState<string | undefined>();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

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
    // Always load results from localStorage first
    setResults(getLocalResults());
    const storageHandler = (e: StorageEvent) => {
      if (e.key === "quiniela_results") {
        setResults(getLocalResults());
        setLastUpdate(new Date());
      }
    };
    window.addEventListener("storage", storageHandler);

    if (!isFirebaseConfigured()) {
      return () => window.removeEventListener("storage", storageHandler);
    }

    const unsub = onValue(ref(db, "results"), (snap) => {
      setResults({ ...getLocalResults(), ...(snap.val() ?? {}) });
      setLastUpdate(new Date());
    });
    return () => { unsub(); window.removeEventListener("storage", storageHandler); };
  }, []);

  const scores: PlayerScore[] = calcRanking(predictions, results);
  const resultsCount = Object.keys(results).length;

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ranking en vivo</h2>
          <p className="text-gray-500 text-sm mt-1">
            {scores.length} jugadores · {resultsCount} resultados cargados
            {lastUpdate && (
              <span className="ml-2 text-xs">
                · actualizado {lastUpdate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="hidden sm:inline">En tiempo real</span>
            <span className="sm:hidden">Live</span>
          </div>
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
              className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20b858] text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Compartir
            </button>
          )}
        </div>
      </div>

      {/* Points legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-6 flex flex-wrap gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span className="font-bold text-yellow-600">⭐ 5 pts</span>
          <span>Marcador exacto</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-green-700">✓ 3 pts</span>
          <span>Resultado correcto</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <RankingTable scores={scores} currentPlayer={currentPlayer} allPredictions={predictions} results={results} />
      </div>

      {scores.length === 0 && resultsCount === 0 && (
        <p className="text-center text-gray-400 text-sm mt-4">
          El ranking mostrará puntos una vez que el admin cargue resultados.
        </p>
      )}
    </div>
  );
}
