"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { MATCHES, STAGE_LABELS, GROUP_STAGES, KNOCKOUT_STAGES, Stage } from "@/lib/matches";
import { Prediction, Result, getResultLabel } from "@/lib/scoring";
import { isFirebaseConfigured, getLocalResults } from "@/lib/localFallback";

export default function PrediccionesPage() {
  const [predictions, setPredictions] = useState<Record<string, Record<string, Prediction>>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [activeStage, setActiveStage] = useState<Stage>("groupA");

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

  const players = Object.keys(predictions).sort();
  const stageMatches = MATCHES.filter((m) => m.stage === activeStage);

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900">Predicciones</h2>
        <p className="text-gray-500 text-sm mt-1">{players.length} jugadores · {Object.keys(results).length} resultados cargados</p>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-5 -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-1 flex-nowrap">
          <span className="text-xs text-gray-400 self-center px-1 flex-shrink-0">Grupos</span>
          {GROUP_STAGES.map((s) => (
            <button key={s} onClick={() => setActiveStage(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeStage === s ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}>
              {STAGE_LABELS[s].replace("Grupo ", "")}
            </button>
          ))}
          <span className="text-xs text-gray-400 self-center px-1 flex-shrink-0 ml-2">Elim.</span>
          {KNOCKOUT_STAGES.map((s) => (
            <button key={s} onClick={() => setActiveStage(s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeStage === s ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}>
              {s === "round32" ? "R32" : s === "round16" ? "R16" : s === "quarters" ? "QF" : s === "semis" ? "SF" : s === "thirdPlace" ? "3°" : "🏆"}
            </button>
          ))}
        </div>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p>Aún no hay predicciones registradas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stageMatches.map((match) => {
            const result = results[match.id];
            const actualLabel = result ? getResultLabel(result.g1, result.g2) : null;
            const playersWithPred = players.filter(p => predictions[p]?.[match.id]);

            return (
              <div key={match.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Match row */}
                <div className={`px-4 py-3 flex items-center justify-between gap-3 ${result ? "bg-gray-800" : "bg-gray-50 border-b border-gray-100"}`}>
                  <span className={`font-semibold text-sm flex-1 min-w-0 truncate ${result ? "text-white" : "text-gray-700"}`}>
                    {match.homeFlag} {match.homeTeam} — {match.awayTeam} {match.awayFlag}
                  </span>
                  {result ? (
                    <span className="font-mono font-bold text-lg text-white shrink-0">{result.g1}–{result.g2}</span>
                  ) : (
                    <span className="text-xs text-gray-400 shrink-0">Sin resultado</span>
                  )}
                </div>

                {/* Players chips */}
                <div className="px-3 py-3 flex flex-wrap gap-2">
                  {players.map((player) => {
                    const pred = predictions[player]?.[match.id];
                    if (!pred) return (
                      <div key={player} className="flex items-center gap-1.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg px-2.5 py-1.5">
                        <span className="text-xs text-gray-400">{player}</span>
                        <span className="text-xs text-gray-300">—</span>
                      </div>
                    );

                    const predLabel = getResultLabel(pred.g1, pred.g2);
                    const isExact = result && pred.g1 === result.g1 && pred.g2 === result.g2;
                    const isCorrect = actualLabel && predLabel === actualLabel && !isExact;
                    const isWrong = result && !isExact && !isCorrect;

                    return (
                      <div key={player} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 border font-medium text-xs ${
                        isExact   ? "bg-yellow-50 border-yellow-300 text-yellow-800" :
                        isCorrect ? "bg-green-50 border-green-300 text-green-800" :
                        isWrong   ? "bg-red-50 border-red-200 text-red-700" :
                                    "bg-blue-50 border-blue-200 text-blue-800"
                      }`}>
                        <span>{player}</span>
                        <span className="font-mono font-bold">{pred.g1}–{pred.g2}</span>
                        <span className={`text-xs px-1 rounded font-bold ${
                          predLabel === "1" ? "bg-blue-100 text-blue-600" :
                          predLabel === "X" ? "bg-gray-100 text-gray-500" :
                          "bg-orange-100 text-orange-600"
                        }`}>{predLabel}</span>
                        {isExact && <span>⭐</span>}
                        {isCorrect && <span>✓</span>}
                        {isWrong && <span>✗</span>}
                      </div>
                    );
                  })}
                  {playersWithPred.length === 0 && (
                    <span className="text-xs text-gray-400 italic py-1">Nadie ha predicho este partido aún</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
